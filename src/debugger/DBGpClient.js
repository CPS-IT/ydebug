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

/**
 * DBGp Client for Xdebug communication
 * Implements DBGp protocol using native Node.js TCP sockets
 */
class DBGpClient extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      host: config.host || 'localhost',
      port: config.port || 9003,
      timeout: config.timeout || 30000,
      ...config,
    };

    this.socket = null;
    this.isConnected = false;
    this.connectionTimeout = null;
    this.commandCounter = 0;
    this.pendingCommands = new Map();
    this.buffer = '';
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
        reject(new Error(`Connection timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      try {
        // Create TCP socket connection
        this.socket = new net.Socket();
        
        // Handle connection events
        this.socket.on('connect', () => {
          clearTimeout(this.connectionTimeout);
          this.isConnected = true;
          this.emit('connect');
        });

        this.socket.on('close', () => {
          this.isConnected = false;
          this.emit('disconnect');
          this.cleanup();
        });

        this.socket.on('error', (error) => {
          clearTimeout(this.connectionTimeout);
          this.isConnected = false;
          this.emit('error', error);
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
  processMessage(message) {
    try {
      const parsed = this.parseXml(message);
      
      if (parsed.init) {
        // Initial connection message
        this.emit('init', parsed.init);
      } else if (parsed.response) {
        // Response to a command
        const transactionId = parsed.response.transaction_id;
        if (this.pendingCommands.has(transactionId)) {
          const { resolve } = this.pendingCommands.get(transactionId);
          this.pendingCommands.delete(transactionId);
          resolve(parsed.response);
        }
        this.emit('response', parsed.response);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error.message}`));
    }
  }

  /**
   * Simple XML parser for DBGp messages
   * @param {string} xml - XML string to parse
   * @returns {Object} Parsed object
   */
  parseXml(xml) {
    const result = {};
    
    // Parse init message
    const initMatch = xml.match(/<init[^>]*>/);
    if (initMatch) {
      const attrs = this.parseAttributes(initMatch[0]);
      result.init = attrs;
      return result;
    }
    
    // Parse response message
    const responseMatch = xml.match(/<response[^>]*>/);
    if (responseMatch) {
      const attrs = this.parseAttributes(responseMatch[0]);
      result.response = attrs;
      
      // Extract content between response tags
      const contentMatch = xml.match(/<response[^>]*>(.*?)<\/response>/s);
      if (contentMatch && contentMatch[1].trim()) {
        result.response.content = contentMatch[1];
      }
      
      return result;
    }
    
    throw new Error(`Unknown message format: ${xml}`);
  }

  /**
   * Parse XML attributes from a tag
   * @param {string} tag - XML tag string
   * @returns {Object} Attributes object
   */
  parseAttributes(tag) {
    const attrs = {};
    const regex = /(\w+)="([^"]*)"/g;
    let match;
    
    while ((match = regex.exec(tag)) !== null) {
      attrs[match[1]] = match[2];
    }
    
    return attrs;
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
    
    // Reject all pending commands
    for (const [, { reject }] of this.pendingCommands) {
      reject(new Error('Connection closed'));
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
        reject(new Error('Not connected to debugger'));
        return;
      }

      const transactionId = ++this.commandCounter;
      const xmlCommand = this.buildCommand(command, transactionId, options);
      
      // Store promise resolvers
      this.pendingCommands.set(transactionId.toString(), { resolve, reject });
      
      // Set command timeout
      setTimeout(() => {
        if (this.pendingCommands.has(transactionId.toString())) {
          this.pendingCommands.delete(transactionId.toString());
          reject(new Error(`Command timeout: ${command}`));
        }
      }, this.config.timeout);

      try {
        this.socket.write(xmlCommand + '\0');
      } catch (error) {
        this.pendingCommands.delete(transactionId.toString());
        reject(error);
      }
    });
  }

  /**
   * Build XML command string
   * @param {string} command - Command name
   * @param {number} transactionId - Transaction ID
   * @param {Object} options - Command options
   * @returns {string} XML command string
   */
  buildCommand(command, transactionId, options = {}) {
    let cmd = `${command} -i ${transactionId}`;
    
    // Add command-specific options
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        cmd += ` -${key} ${value}`;
      }
    }
    
    return cmd;
  }

  /**
   * Set a breakpoint
   * @param {string} filename - File to set breakpoint in
   * @param {number} line - Line number
   * @returns {Promise<Object>} Breakpoint response
   */
  setBreakpoint(filename, line) {
    return this.sendCommand('breakpoint_set', {
      t: 'line',
      f: filename,
      n: line
    });
  }

  /**
   * Remove a breakpoint
   * @param {string} breakpointId - Breakpoint ID to remove
   * @returns {Promise<Object>} Response
   */
  removeBreakpoint(breakpointId) {
    return this.sendCommand('breakpoint_remove', {
      d: breakpointId
    });
  }

  /**
   * Get variable value
   * @param {string} variableName - Variable name to get
   * @returns {Promise<Object>} Variable data
   */
  getVariable(variableName) {
    return this.sendCommand('property_get', {
      n: variableName
    });
  }

  /**
   * Get current execution context
   * @returns {Promise<Object>} Context information
   */
  async getContext() {
    try {
      const [stack, context] = await Promise.all([
        this.sendCommand('stack_get'),
        this.sendCommand('context_get')
      ]);
      return { stack, context };
    } catch (error) {
      throw new Error(`Failed to get context: ${error.message}`);
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