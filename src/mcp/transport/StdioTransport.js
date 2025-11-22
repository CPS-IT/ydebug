/**
 * STDIO Transport for MCP
 * Handles communication over standard input/output for local MCP clients
 */

const Transport = require('./Transport');
const { logger } = require('../../utils/Logger');

class StdioTransport extends Transport {
  constructor() {
    super();
    this.logger = logger;
    this.messageBuffer = '';
  }

  /**
   * Start STDIO transport
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isConnected) {
      throw new Error('STDIO transport is already started');
    }

    this.logger.info('Starting STDIO transport for MCP');

    // Clean up any existing listeners to prevent memory leaks
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('end');
    process.stdin.removeAllListeners('error');
    process.stdout.removeAllListeners('error');

    // Set up stdin for reading JSON-RPC messages
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      this.handleInput(chunk);
    });

    process.stdin.on('end', () => {
      this.logger.info('STDIO input stream ended');
      this._isConnected = false;
      this.emit('disconnect');
    });

    process.stdin.on('error', (error) => {
      this.logger.error('STDIO input error:', error);
      this.emit('error', error);
    });

    // Set up stdout for writing responses
    process.stdout.on('error', (error) => {
      this.logger.error('STDIO output error:', error);
      this.emit('error', error);
    });

    this._isConnected = true;
    this.logger.info('STDIO transport started successfully');
    this.emit('connect');
  }

  /**
   * Stop STDIO transport
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isConnected) {
      return;
    }

    this.logger.info('Stopping STDIO transport');
    
    // Clean up event listeners
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('end');
    process.stdin.removeAllListeners('error');
    process.stdout.removeAllListeners('error');

    this._isConnected = false;
    this.messageBuffer = '';
    
    this.logger.info('STDIO transport stopped');
    this.emit('disconnect');
  }

  /**
   * Send message via STDIO
   * @param {string} message - JSON-RPC message to send
   * @returns {Promise<void>}
   */
  async send(message) {
    if (!this.isConnected) {
      throw new Error('STDIO transport not connected');
    }

    return new Promise((resolve, reject) => {
      // Add newline delimiter for message boundary
      const messageWithDelimiter = message + '\n';
      
      process.stdout.write(messageWithDelimiter, 'utf8', (error) => {
        if (error) {
          this.logger.error('Failed to send message via STDIO:', error);
          reject(error);
        } else {
          this.logger.debug('Message sent via STDIO:', message);
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming data from stdin
   * @param {string} chunk - Raw data chunk
   */
  handleInput(chunk) {
    // Append chunk to buffer
    this.messageBuffer += chunk;

    // Process complete messages (delimited by newlines)
    const lines = this.messageBuffer.split('\n');
    
    // Keep the last incomplete line in buffer
    this.messageBuffer = lines.pop();

    // Process each complete line as a message
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        this.logger.debug('Received message via STDIO:', trimmedLine);
        this.emit('message', trimmedLine);
      }
    }
  }

  /**
   * Get transport status
   * @returns {object}
   */
  getStatus() {
    return {
      ...super.getStatus(),
      bufferSize: this.messageBuffer.length,
      hasBufferedData: this.messageBuffer.length > 0
    };
  }
}

module.exports = StdioTransport;