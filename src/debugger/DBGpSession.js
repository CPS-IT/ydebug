const EventEmitter = require('events');
const { logger } = require('../utils/Logger');
const DBGpError = require('./errors/DBGpError');
const DBGpProtocolError = require('./errors/DBGpProtocolError');
const { TransactionManager } = require('./TransactionManager');
const VariableFormatter = require('./VariableFormatter');

const ContextGetCommand = require('./commands/ContextGetCommand');
const BreakpointSetCommand = require('./commands/BreakpointSetCommand');

class DBGpSession extends EventEmitter {
  constructor(sessionId, socket, options = {}) {
    super();
        
    this.sessionId = sessionId;
    this.socket = socket;
    this.options = {
      timeout: options.timeout || 30000,
      xmlParser: options.xmlParser,
      ...options
    };
        
    this.logger = logger;
    this.isInitialized = false;
    this.buffer = '';
    this.sessionData = null;
        
    // Session-scoped transaction manager
    this.transactionManager = new TransactionManager();
        
    // Variable formatter for output
    this.variableFormatter = new VariableFormatter();
        
    // Command instances
    this.contextGetCommand = new ContextGetCommand();
    this.breakpointSetCommand = new BreakpointSetCommand();
        
    // Current execution state
    this.executionState = {
      status: 'starting', // starting, running, break, stopping, stopped
      filename: null,
      lineno: null
    };
        
    // Bind methods
    this.handleData = this.handleData.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
        
    // Set up socket event handlers
    this.setupSocketHandlers();
  }
    
  /**
     * Set up socket event handlers
     */
  setupSocketHandlers() {
    this.socket.on('data', this.handleData);
    this.socket.on('close', this.handleClose);
    this.socket.on('error', this.handleError);
        
    // Set socket timeout
    this.socket.setTimeout(this.options.timeout);
    this.socket.on('timeout', () => {
      this.logger.warn(`Session ${this.sessionId} timeout`);
      this.close('timeout');
    });
  }
    
  /**
     * Initialize the session
     */
  initialize() {
    this.logger.debug(`Initializing session ${this.sessionId}`);
    // Session initialization will be triggered by incoming init message
  }
    
  /**
     * Handle incoming data from Xdebug
     * @param {Buffer} data 
     */
  handleData(data) {
    this.buffer += data.toString();
        
    // Process complete messages (length-prefixed format)
    while (this.buffer.includes('\0')) {
      const nullIndex = this.buffer.indexOf('\0');
      const rawMessage = this.buffer.substring(0, nullIndex);
      this.buffer = this.buffer.substring(nullIndex + 1);
            
      // Check if this is a length prefix (numeric only)
      if (/^\d+$/.test(rawMessage)) {
        // This is a length prefix, wait for the actual message
        const expectedLength = parseInt(rawMessage, 10);
        
        // Check if we have the complete message after the length prefix
        if (this.buffer.length >= expectedLength) {
          // Extract the actual XML message
          const xmlMessage = this.buffer.substring(0, expectedLength);
          this.buffer = this.buffer.substring(expectedLength);
          
          // Remove any trailing null terminator from XML message
          const cleanXmlMessage = xmlMessage.replace(/\0+$/, '');
          this.processMessage(cleanXmlMessage);
        } else {
          // Don't have complete message yet, put the length back in buffer
          this.buffer = rawMessage + '\0' + this.buffer;
          break;
        }
      } else {
        // This is a direct message (not length-prefixed)
        // Skip empty messages
        if (rawMessage.trim().length > 0) {
          this.processMessage(rawMessage);
        }
      }
    }
  }
    
  /**
     * Process a complete DBGp message
     * @param {string} message 
     */
  processMessage(message) {
    // Enhanced logging: show full raw message for debugging
    this.logger.debug(`Session ${this.sessionId} RAW MESSAGE (${message.length} chars):`, message);
        
    try {
      const parsed = this.parseXmlMessage(message);
      
      // Enhanced logging: show full parsed structure
      this.logger.debug(`Session ${this.sessionId} PARSED STRUCTURE:`, JSON.stringify(parsed, null, 2));
      this.logger.debug(`Session ${this.sessionId} parsed keys:`, Object.keys(parsed));
            
      if (parsed.init) {
        this.handleInitMessage(parsed.init);
      } else if (parsed.response) {
        this.handleResponseMessage(parsed.response);
      } else {
        this.logger.warn(`Session ${this.sessionId} received unknown message type. Keys:`, Object.keys(parsed));
        this.logger.warn(`Session ${this.sessionId} RAW MESSAGE for unknown type:`, message);
        this.logger.warn(`Session ${this.sessionId} PARSED STRUCTURE for unknown type:`, JSON.stringify(parsed, null, 2));
      }
    } catch (error) {
      this.logger.error(`Session ${this.sessionId} message parsing error:`, error);
      this.logger.error(`Session ${this.sessionId} RAW MESSAGE that failed parsing:`, message);
      this.emit('error', new DBGpProtocolError('Failed to parse message', {
        sessionId: this.sessionId,
        message: message.substring(0, 500),
        originalError: error
      }));
    }
  }
    
  /**
     * Parse XML message
     * @param {string} message 
     * @returns {object}
     */
  parseXmlMessage(message) {
    if (!this.options.xmlParser) {
      throw new DBGpError('XML parser not available');
    }
        
    return this.options.xmlParser.parse(message);
  }
    
  /**
     * Handle init message from Xdebug
     * @param {object} initData 
     */
  handleInitMessage(initData) {
    this.logger.info(`Session ${this.sessionId} received init: ${initData.language} ${initData.protocol_version}`);
        
    this.sessionData = {
      session: initData.session || this.sessionId,
      language: initData.language || 'PHP',
      protocol_version: initData.protocol_version || '1.0',
      engine: initData.engine || 'Xdebug',
      fileuri: initData.fileuri,
      idekey: initData.idekey
    };
        
    this.executionState.status = 'break';
    this.executionState.filename = initData.fileuri;
    this.isInitialized = true;
        
    this.emit('initialized', this.sessionData);
  }
    
  /**
     * Handle response message from Xdebug
     * @param {object} response 
     */
  handleResponseMessage(response) {
    const command = response.command;
    const status = response.status;
    const transactionId = response.transaction_id;
        
    this.logger.debug(`Session ${this.sessionId} response: ${command} (${status})`);
        
    // Update execution state
    if (status) {
      this.executionState.status = status;
    }
        
    // Handle specific command responses
    switch (command) {
    case 'breakpoint_set':
      this.handleBreakpointSetResponse(response);
      break;
                
    case 'run':
    case 'step_over':
    case 'step_into':
    case 'step_out':
      this.handleExecutionResponse(response);
      break;
                
    case 'context_get':
      this.handleContextGetResponse(response);
      break;
                
    default:
      this.logger.debug(`Session ${this.sessionId} unhandled response: ${command}`);
    }
        
    // Complete any pending transaction
    if (transactionId) {
      const transaction = this.transactionManager.completePending(transactionId);
      if (transaction && transaction.context.resolve) {
        transaction.context.resolve(response);
      }
    }
  }
    
  /**
     * Handle breakpoint_set response
     * @param {object} response 
     */
  handleBreakpointSetResponse(response) {
    const breakpointId = response.id;
    this.logger.info(`Session ${this.sessionId} breakpoint set: ${breakpointId}`);
    this.emit('breakpointSet', breakpointId, response);
  }
    
  /**
     * Handle execution command response (run, step, etc.)
     * @param {object} response 
     */
  handleExecutionResponse(response) {
    const status = response.status;
        
    if (status === 'break') {
      this.executionState.filename = response.filename;
      this.executionState.lineno = response.lineno;
            
      this.logger.info(`Session ${this.sessionId} paused at ${response.filename}:${response.lineno}`);
      this.emit('breakpoint', {
        filename: response.filename,
        lineno: response.lineno,
        reason: response.reason || 'breakpoint'
      });
            
    } else if (status === 'stopped') {
      this.logger.info(`Session ${this.sessionId} execution stopped`);
      this.emit('stopped');
            
    } else if (status === 'running') {
      this.logger.debug(`Session ${this.sessionId} execution continuing`);
      this.emit('running');
    }
  }
    
  /**
     * Handle context_get response
     * @param {object} response 
     */
  handleContextGetResponse(response) {
    const contextId = response.context || '0';
    const properties = response.property || [];
        
    this.logger.debug(`Session ${this.sessionId} received ${Array.isArray(properties) ? properties.length : 1} variables for context ${contextId}`);
        
    // Parse variables using existing command logic
    const variables = this.contextGetCommand.parseResponse(response);
        
    this.emit('variables', contextId, variables);
  }
    
  /**
     * Send command to Xdebug
     * @param {string} command 
     * @returns {Promise<object>}
     */
  async sendCommand(command) {
    if (!this.isInitialized) {
      throw new DBGpError('Session not initialized');
    }
        
    const transactionId = this.transactionManager.getNext();
    const fullCommand = `${command} -i ${transactionId}`;
        
    this.logger.debug(`Session ${this.sessionId} sending: ${fullCommand}`);
        
    return new Promise((resolve, reject) => {
      // Register transaction for response handling
      this.transactionManager.registerPending(transactionId, {
        resolve,
        reject,
        command: command,
        timestamp: Date.now()
      });
            
      // Send command with null terminator
      this.socket.write(`${fullCommand}\0`);
    });
  }
    
  /**
     * Set breakpoint at specific location
     * @param {string} filename 
     * @param {number} lineno 
     * @param {string} type 
     * @returns {Promise<object>}
     */
  async setBreakpoint(filename, lineno, type = 'line') {
    const command = this.breakpointSetCommand.buildCommand(0, {
      type: type,
      filename: filename,
      lineno: lineno
    });
        
    return await this.sendCommand(command.replace(/-i 0\s*/, ''));
  }
    
  /**
     * Continue execution
     * @returns {Promise<object>}
     */
  async run() {
    return await this.sendCommand('run');
  }
    
  /**
     * Step over next line
     * @returns {Promise<object>}
     */
  async stepOver() {
    return await this.sendCommand('step_over');
  }
    
  /**
     * Step into function
     * @returns {Promise<object>}
     */
  async stepInto() {
    return await this.sendCommand('step_into');
  }
    
  /**
     * Step out of function
     * @returns {Promise<object>}
     */
  async stepOut() {
    return await this.sendCommand('step_out');
  }
    
  /**
     * Get variables for context
     * @param {number} contextId 
     * @param {number} depth 
     * @returns {Promise<Array>}
     */
  async getContextVariables(contextId = 0, depth = 0) {
    const command = this.contextGetCommand.buildCommand(0, {
      contextId: contextId,
      depth: depth
    });
        
    const response = await this.sendCommand(command.replace(/-i 0\s*/, ''));
    return this.contextGetCommand.parseResponse(response);
  }
    
  /**
     * Format variables for display
     * @param {Array} variables 
     * @param {object} options 
     * @returns {string}
     */
  formatVariables(variables, options = {}) {
    return this.variableFormatter.formatVariables(variables, options);
  }
    
  /**
     * Get session status
     * @returns {object}
     */
  getStatus() {
    return {
      sessionId: this.sessionId,
      isInitialized: this.isInitialized,
      executionState: { ...this.executionState },
      sessionData: this.sessionData ? { ...this.sessionData } : null,
      socketConnected: this.socket && !this.socket.destroyed
    };
  }
    
  /**
     * Handle socket close
     */
  handleClose() {
    this.logger.info(`Session ${this.sessionId} connection closed`);
    this.cleanup();
    this.emit('close', 'connection_closed');
  }
    
  /**
     * Handle socket error
     * @param {Error} error 
     */
  handleError(error) {
    this.logger.error(`Session ${this.sessionId} socket error:`, error);
    this.emit('error', error);
  }
    
  /**
     * Close the session
     * @param {string} reason 
     */
  close(reason = 'manual') {
    this.logger.info(`Closing session ${this.sessionId}: ${reason}`);
        
    this.cleanup();
        
    if (this.socket && !this.socket.destroyed) {
      this.socket.end();
    }
        
    this.emit('close', reason);
  }
    
  /**
     * Clean up session resources
     */
  cleanup() {
    this.isInitialized = false;
    this.buffer = '';
        
    // Clean up transaction manager - reset it since it doesn't have a cleanup method
    if (this.transactionManager) {
      this.transactionManager.reset();
    }
        
    // Remove socket event handlers
    if (this.socket) {
      this.socket.removeListener('data', this.handleData);
      this.socket.removeListener('close', this.handleClose);
      this.socket.removeListener('error', this.handleError);
    }
  }
}

module.exports = DBGpSession;