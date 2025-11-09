/**
 * DBGp Client
 * Direct implementation of DBGp protocol client for Xdebug communication
 *
 * Copyright (C) 2024 YDebug Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const net = require('net');
const { EventEmitter } = require('events');
const { logger } = require('../utils/Logger');
const { transactionManager } = require('./TransactionManager');
const { xmlParser } = require('./DBGpXmlParser');
const DBGpConnectionError = require('./errors/DBGpConnectionError');
const DBGpTimeoutError = require('./errors/DBGpTimeoutError');
const DBGpProtocol = require('./protocol/DBGpProtocol');
const { dbgpConfig } = require('./DBGpConfig');

/**
 * DBGp Client for Xdebug communication
 * Implements DBGp protocol using native Node.js TCP sockets
 */
class DBGpClient extends EventEmitter {
  constructor(config = {}) {
    super();

    // Get base configuration from DBGpConfig and merge with constructor overrides
    const baseConfig = dbgpConfig.getComponentConfig('connection');
    this.config = {
      ...baseConfig,
      ...config  // Constructor overrides take precedence for backward compatibility
    };

    this.socket = null;
    this.isConnected = false;
    this.connectionTimeout = null;
    this.pendingCommands = new Map();
    this.buffer = '';

    // Initialize protocol layer
    this.protocol = new DBGpProtocol({
      version: dbgpConfig.get('protocolVersion', '1.0'),
      config: dbgpConfig.getComponentConfig('protocol')
    });
  }

  /**
   * Connect to Xdebug server
   * @returns {Promise<Object>} Init packet from Xdebug
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        this.cleanup();
        logger.error(`Connection timeout after ${this.config.timeout}ms to ${this.config.host}:${this.config.port}`);
        reject(new DBGpConnectionError(
          `Connection timeout after ${this.config.timeout}ms`,
          {
            code: 'CONNECTION_TIMEOUT',
            context: {
              host: this.config.host,
              port: this.config.port,
              timeout: this.config.timeout
            },
            recoverable: true
          }
        ));
      }, this.config.timeout);

      try {
        // Create TCP socket connection
        this.socket = new net.Socket();
        
        // Set socket timeout to ensure faster failures
        this.socket.setTimeout(this.config.timeout);
        this.socket.on('timeout', () => {
          this.socket.destroy();
        });
        
        // Handle connection events
        this.socket.on('connect', () => {
          clearTimeout(this.connectionTimeout);
          this.isConnected = true;
          logger.info(`Connected to Xdebug server at ${this.config.host}:${this.config.port}`);
          this.emit('connect');
        });

        this.socket.on('close', () => {
          this.isConnected = false;
          logger.info('Disconnected from Xdebug server');
          this.emit('disconnect');
          this.cleanup();
        });

        this.socket.on('error', (error) => {
          clearTimeout(this.connectionTimeout);
          logger.error('DBGp connection error:', error.message);
          this.isConnected = false;
          this.cleanup();
          reject(error);
        });

        // Handle incoming data
        this.socket.on('data', (data) => {
          this.handleData(data);
        });

        // Wait for init message after connection
        this.once('init', (initPacket) => {
          resolve(initPacket);
        });

        // Connect to Xdebug
        this.socket.connect(this.config.port, this.config.host);

      } catch (error) {
        clearTimeout(this.connectionTimeout);
        this.cleanup();
        reject(error);
      }
    });
  }

  /**
   * Handle incoming data from socket
   * @param {Buffer} data - Raw data from socket
   */
  handleData(data) {
    this.buffer += data.toString();
    
    // DBGp messages are null-terminated
    let nullIndex;
    while ((nullIndex = this.buffer.indexOf('\0')) !== -1) {
      const message = this.buffer.substring(0, nullIndex);
      this.buffer = this.buffer.substring(nullIndex + 1);
      
      if (message.trim()) {
        this.processMessage(message);
      }
    }
  }

  /**
   * Process a complete DBGp message
   * @param {string} message - Complete XML message
   */
  async processMessage(message) {
    try {
      const parsed = await xmlParser.parseDBGpResponse(message);
      
      if (parsed.init) {
        // Initial connection message
        this.emit('init', parsed.init);
      } else if (parsed.response || parsed.transactionId) {
        // Response to a command
        const transactionId = parsed.transactionId;
        if (transactionId && this.pendingCommands.has(transactionId.toString())) {
          const { resolve, timeoutId } = this.pendingCommands.get(transactionId.toString());
          clearTimeout(timeoutId);
          this.pendingCommands.delete(transactionId.toString());
          transactionManager.completePending(transactionId);
          resolve(message); // Return raw XML for further processing by commands
        }
        this.emit('response', parsed.response || parsed.raw);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error.message}`));
    }
  }


  /**
   * Disconnect from Xdebug server
   * @returns {Promise<void>}
   */
  disconnect() {
    return new Promise((resolve) => {
      if (!this.isConnected || !this.socket) {
        resolve();
        return;
      }

      const cleanup = () => {
        this.cleanup();
        resolve();
      };

      // Set a timeout for cleanup
      setTimeout(cleanup, 1000);

      try {
        // Send stop command first
        this.sendCommand('stop').catch(() => {
          // Ignore errors during stop
        }).finally(() => {
          if (this.socket) {
            this.socket.end();
          }
        });
      } catch {
        // Force cleanup
        cleanup();
      }
    });
  }

  /**
   * Clean up connection resources
   */
  cleanup() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.buffer = '';
    
    // Reject all pending commands and clear their timeouts
    for (const [, { reject, timeoutId }] of this.pendingCommands) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(new DBGpConnectionError(
        'Connection closed',
        {
          code: 'CONNECTION_CLOSED',
          recoverable: false,
          category: 'connection'
        }
      ));
    }
    this.pendingCommands.clear();
  }

  /**
   * Send a command to the debugger
   * @param {string} command - DBGp command to send
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Response from debugger
   */
  sendCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket) {
        reject(new DBGpConnectionError(
          'Not connected to debugger',
          {
            code: 'NOT_CONNECTED',
            context: {
              command: command,
              isConnected: this.isConnected
            },
            recoverable: true
          }
        ));
        return;
      }

      const transactionId = transactionManager.getNext();
      const xmlCommand = this.buildCommand(command, transactionId, options);
      
      // Register pending transaction
      transactionManager.registerPending(transactionId, { command, timestamp: Date.now() });
      
      // Set command timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingCommands.has(transactionId.toString())) {
          this.pendingCommands.delete(transactionId.toString());
          transactionManager.completePending(transactionId);
          reject(new DBGpTimeoutError(
            `Command timeout: ${command}`,
            {
              code: 'COMMAND_TIMEOUT',
              context: {
                command: command,
                transactionId: transactionId,
                timeout: this.config.timeout
              },
              recoverable: true
            }
          ));
        }
      }, this.config.timeout);
      
      // Store promise resolvers with timeout ID
      this.pendingCommands.set(transactionId.toString(), { resolve, reject, timeoutId });

      try {
        this.socket.write(xmlCommand + '\0');
      } catch (error) {
        // Clean up timeout and pending command on error
        const pending = this.pendingCommands.get(transactionId.toString());
        if (pending) {
          clearTimeout(pending.timeoutId);
          this.pendingCommands.delete(transactionId.toString());
        }
        transactionManager.completePending(transactionId);
        reject(error);
      }
    });
  }

  /**
   * Build XML command string using protocol layer
   * @param {string} command - Command name
   * @param {number} transactionId - Transaction ID
   * @param {Object} options - Command options
   * @returns {string} XML command string
   */
  buildCommand(command, transactionId, options = {}) {
    try {
      // Use protocol layer for command building with validation
      return this.protocol.buildCommand(command, transactionId, options);
    } catch (error) {
      // Fallback to simple command building for backward compatibility
      logger.debug(`Protocol command building failed, using fallback: ${error.message}`);
      let cmd = `${command} -i ${transactionId}`;
      
      // Add command-specific options
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && value !== null) {
          cmd += ` -${key} ${value}`;
        }
      }
      
      return cmd;
    }
  }


  /**
   * Check if client is connected
   * @returns {boolean}
   */
  isConnectedToDebugger() {
    return this.isConnected;
  }

  /**
   * Get connection configuration
   * @returns {Object}
   */
  getConfig() {
    return { ...this.config };
  }
}

module.exports = DBGpClient;