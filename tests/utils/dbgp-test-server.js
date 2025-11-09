/**
 * Reusable DBGp Test Server Utility
 * Based on our successful manual test server implementation
 */

const net = require('net');
const { EventEmitter } = require('events');

/**
 * Test DBGp server for integration testing
 * Mimics Xdebug IDE behavior to test DBGp client connections
 */
class DBGpTestServer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      host: options.host || 'localhost',
      port: options.port || 9003,
      timeout: options.timeout || 10000,
      ...options,
    };
    
    this.server = null;
    this.connections = new Set();
    this.isListening = false;
    this.initData = null;
    this.startupTimeout = null;
  }
  
  /**
   * Start the test server
   * @returns {Promise<void>}
   */
  start() {
    return new Promise((resolve, reject) => {
      if (this.isListening) {
        resolve();
        return;
      }
      
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });
      
      this.server.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
      
      this.server.listen(this.config.port, this.config.host, () => {
        this.isListening = true;
        if (this.startupTimeout) {
          clearTimeout(this.startupTimeout);
          this.startupTimeout = null;
        }
        this.emit('listening', { 
          host: this.config.host, 
          port: this.config.port 
        });
        resolve();
      });
      
      // Set timeout for server startup
      this.startupTimeout = setTimeout(() => {
        if (!this.isListening) {
          this.startupTimeout = null;
          reject(new Error(`Server failed to start within ${this.config.timeout}ms`));
        }
      }, this.config.timeout);
    });
  }
  
  /**
   * Handle incoming connection
   * @param {net.Socket} socket - Client socket
   */
  handleConnection(socket) {
    this.connections.add(socket);
    this.emit('connection', socket);
    
    let buffer = '';
    
    socket.on('data', (data) => {
      buffer += data.toString();
      
      // Handle messages separated by null terminators
      let nullIndex;
      while ((nullIndex = buffer.indexOf('\0')) !== -1) {
        const message = buffer.substring(0, nullIndex);
        buffer = buffer.substring(nullIndex + 1);
        
        if (message.trim()) {
          // Look for init message
          if (message.includes('<?xml') && message.includes('<init')) {
            this.handleInitMessage(message, socket);
          }
          // Look for commands (stop, breakpoint_set, etc.)
          else if (message.includes(' -i ')) {
            this.handleCommand(message, socket);
          }
        }
      }
    });
    
    socket.on('error', (error) => {
      this.emit('socketError', error);
    });
    
    socket.on('close', () => {
      this.connections.delete(socket);
      this.emit('disconnect', socket);
    });
  }
  
  /**
   * Handle Xdebug init message
   * @param {string} buffer - Raw message buffer
   * @param {net.Socket} socket - Client socket
   */
  handleInitMessage(buffer, socket) {
    try {
      // Parse init message
      const initMatch = buffer.match(/<init[^>]*>/);
      if (initMatch) {
        const attrs = this.parseAttributes(initMatch[0]);
        
        this.initData = {
          appid: attrs.appid || 'test-app',
          idekey: attrs.idekey || 'test-key',
          session: attrs.session || '1',
          thread: attrs.thread || '1',
          parent: attrs.parent || '',
          language: attrs.language || 'PHP',
          protocol_version: attrs.protocol_version || '1.0',
          fileuri: attrs.fileuri || 'file:///test.php',
          ...attrs,
        };
        
        this.emit('init', this.initData, socket);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Handle DBGp command
   * @param {string} buffer - Command buffer
   * @param {net.Socket} socket - Client socket
   */
  handleCommand(buffer, socket) {
    try {
      // Parse command and transaction ID
      const commandMatch = buffer.match(/^(\w+)\s+-i\s+(\d+)/);
      if (!commandMatch) return;
      
      const [, command, transactionId] = commandMatch;
      
      // Send appropriate response
      let response;
      switch (command) {
      case 'stop':
        response = `<?xml version="1.0" encoding="iso-8859-1"?>\n<response xmlns="urn:debugger_protocol_v1" xmlns:xdebug="https://xdebug.org/dbgp/xdebug" command="stop" transaction_id="${transactionId}" status="stopped" reason="ok"></response>`;
        break;
          
      case 'breakpoint_set':
        response = `<?xml version="1.0" encoding="iso-8859-1"?>\n<response xmlns="urn:debugger_protocol_v1" xmlns:xdebug="https://xdebug.org/dbgp/xdebug" command="breakpoint_set" transaction_id="${transactionId}" id="1"></response>`;
        break;
          
      case 'stack_get':
        response = `<?xml version="1.0" encoding="iso-8859-1"?>\n<response xmlns="urn:debugger_protocol_v1" xmlns:xdebug="https://xdebug.org/dbgp/xdebug" command="stack_get" transaction_id="${transactionId}"><stack where="test" level="0" type="file" filename="file:///test.php" lineno="1"></stack></response>`;
        break;
          
      case 'context_get':
        response = `<?xml version="1.0" encoding="iso-8859-1"?>\n<response xmlns="urn:debugger_protocol_v1" xmlns:xdebug="https://xdebug.org/dbgp/xdebug" command="context_get" transaction_id="${transactionId}"></response>`;
        break;
          
      default:
        response = `<?xml version="1.0" encoding="iso-8859-1"?>\n<response xmlns="urn:debugger_protocol_v1" xmlns:xdebug="https://xdebug.org/dbgp/xdebug" command="${command}" transaction_id="${transactionId}" status="running" reason="ok"></response>`;
      }
      
      this.emit('command', { command, transactionId, socket });
      
      // Send response with null terminator
      socket.write(response + '\0');
      
      // If it's a stop command, close the connection
      if (command === 'stop') {
        setTimeout(() => {
          socket.end();
        }, 100);
      }
      
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Parse XML attributes from tag
   * @param {string} tag - XML tag
   * @returns {Object} Parsed attributes
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
   * Stop the test server
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.isListening || !this.server) {
        // Clear startup timeout if still pending
        if (this.startupTimeout) {
          clearTimeout(this.startupTimeout);
          this.startupTimeout = null;
        }
        resolve();
        return;
      }
      
      // Clear startup timeout if still pending
      if (this.startupTimeout) {
        clearTimeout(this.startupTimeout);
        this.startupTimeout = null;
      }
      
      // Close all active connections
      for (const socket of this.connections) {
        try {
          socket.destroy();
        } catch {
          // Ignore errors during cleanup
        }
      }
      this.connections.clear();
      
      this.server.close(() => {
        this.isListening = false;
        this.emit('close');
        resolve();
      });
      
      // Force close after timeout
      setTimeout(() => {
        this.isListening = false;
        resolve();
      }, 2000);
    });
  }
  
  /**
   * Get server information
   * @returns {Object}
   */
  getInfo() {
    return {
      isListening: this.isListening,
      host: this.config.host,
      port: this.config.port,
      connections: this.connections.size,
      initData: this.initData,
    };
  }
  
  /**
   * Wait for init message with timeout
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>}
   */
  waitForInit(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.initData) {
        resolve(this.initData);
        return;
      }
      
      const timer = setTimeout(() => {
        this.removeListener('init', onInit);
        reject(new Error('Timeout waiting for init message'));
      }, timeout);
      
      const onInit = (initData) => {
        clearTimeout(timer);
        resolve(initData);
      };
      
      this.once('init', onInit);
    });
  }
}

module.exports = DBGpTestServer;