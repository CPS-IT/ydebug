/**
 * Model Context Protocol (MCP) Server
 * Main server implementation for exposing YDebug capabilities to Claude Code
 */

const EventEmitter = require('events');
const { logger } = require('../utils/Logger');
const ServiceRegistry = require('./ServiceRegistry');
const JsonRpcHandler = require('./protocol/JsonRpcHandler');
const CapabilityManager = require('./protocol/CapabilityManager');
const StdioTransport = require('./transport/StdioTransport');

class MCPServer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      transport: 'stdio', // 'stdio' or 'http' (http not implemented yet)
      ...config
    };

    // Validate transport
    if (this.config.transport !== 'stdio') {
      throw new Error(`Unsupported transport: ${this.config.transport}`);
    }

    this.logger = logger;
    this.isRunning = false;
    this.currentRequestId = 0;
    
    // Core components
    this.serviceRegistry = new ServiceRegistry();
    this.jsonRpc = new JsonRpcHandler();
    this.capabilityManager = new CapabilityManager();
    this.transport = null;

    // MCP handlers
    this.methodHandlers = new Map();
    this.setupCoreHandlers();

    // Bind methods to preserve context
    this.handleTransportMessage = this.handleTransportMessage.bind(this);
    this.handleTransportError = this.handleTransportError.bind(this);
    this.handleTransportDisconnect = this.handleTransportDisconnect.bind(this);
  }

  /**
   * Initialize MCP server with services
   * @param {object} services - Services to register
   * @returns {Promise<void>}
   */
  async initialize(services = {}) {
    this.logger.info('Initializing MCP server');

    // Register provided services
    for (const [name, service] of Object.entries(services)) {
      this.serviceRegistry.register(name, service);
    }

    // Initialize transport
    this.initializeTransport();

    this.logger.info('MCP server initialized successfully');
    this.emit('initialized');
  }

  /**
   * Start the MCP server
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      throw new Error('MCP server is already running');
    }

    this.logger.info('Starting MCP server');

    if (!this.transport) {
      throw new Error('Transport not initialized. Call initialize() first.');
    }

    try {
      await this.transport.start();
      this.isRunning = true;
      
      this.logger.info('MCP server started successfully');
      this.emit('started');
    } catch (error) {
      this.logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping MCP server');

    try {
      if (this.transport) {
        await this.transport.stop();
      }
      
      this.isRunning = false;
      this.capabilityManager.reset();
      
      this.logger.info('MCP server stopped successfully');
      this.emit('stopped');
    } catch (error) {
      this.logger.error('Error stopping MCP server:', error);
      throw error;
    }
  }

  /**
   * Initialize transport based on configuration
   */
  initializeTransport() {
    switch (this.config.transport) {
    case 'stdio':
      this.transport = new StdioTransport();
      break;
    // case 'http':
    //   this.transport = new HttpTransport(this.config);
    //   break;
    default:
      throw new Error(`Unsupported transport: ${this.config.transport}`);
    }

    // Set up transport event handlers
    this.transport.on('message', this.handleTransportMessage);
    this.transport.on('error', this.handleTransportError);
    this.transport.on('disconnect', this.handleTransportDisconnect);
    this.transport.on('connect', () => {
      this.logger.info('MCP transport connected');
      this.emit('clientConnected');
    });
  }

  /**
   * Setup core MCP method handlers
   */
  setupCoreHandlers() {
    // Initialize request - client capabilities negotiation
    this.methodHandlers.set('initialize', this.handleInitialize.bind(this));
    
    // Tools capability handlers (will be implemented in Feature 028)
    this.methodHandlers.set('tools/list', this.handleToolsList.bind(this));
    this.methodHandlers.set('tools/call', this.handleToolsCall.bind(this));
    
    // Resources capability handlers (will be implemented in Feature 031)
    this.methodHandlers.set('resources/list', this.handleResourcesList.bind(this));
    this.methodHandlers.set('resources/read', this.handleResourcesRead.bind(this));
    
    // Server control
    this.methodHandlers.set('ping', this.handlePing.bind(this));
  }

  /**
   * Handle incoming transport messages
   * @param {string} rawMessage - Raw JSON-RPC message
   */
  async handleTransportMessage(rawMessage) {
    try {
      // Parse JSON-RPC message
      const parseResult = this.jsonRpc.parseMessage(rawMessage);
      if (!parseResult.success) {
        await this.sendErrorResponse(
          this.jsonRpc.constructor.ErrorCodes.PARSE_ERROR,
          parseResult.error,
          null,
          null
        );
        return;
      }

      const message = parseResult.message;

      // Handle different message types
      if (this.jsonRpc.isRequest(message)) {
        await this.handleRequest(message);
      } else if (this.jsonRpc.isNotification(message)) {
        await this.handleNotification(message);
      } else if (this.jsonRpc.isResponse(message)) {
        // Handle responses to our requests (not implemented yet)
        this.logger.debug('Received response:', message);
      }

    } catch (error) {
      this.logger.error('Error handling transport message:', error);
      await this.sendErrorResponse(
        this.jsonRpc.constructor.ErrorCodes.INTERNAL_ERROR,
        'Internal server error',
        { details: error.message },
        null
      );
    }
  }

  /**
   * Handle JSON-RPC request
   * @param {object} request - JSON-RPC request message
   */
  async handleRequest(request) {
    const { method, params, id } = request;

    this.logger.debug(`Handling request: ${method}`, { id, params });

    // Find method handler
    const handler = this.methodHandlers.get(method);
    if (!handler) {
      await this.sendErrorResponse(
        this.jsonRpc.constructor.ErrorCodes.METHOD_NOT_FOUND,
        `Method not found: ${method}`,
        null,
        id
      );
      return;
    }

    try {
      // Call method handler
      const result = await handler(params || {});
      await this.sendSuccessResponse(result, id);
    } catch (error) {
      this.logger.error(`Error in method handler ${method}:`, error);
      await this.sendErrorResponse(
        this.jsonRpc.constructor.ErrorCodes.INTERNAL_ERROR,
        error.message,
        { method },
        id
      );
    }
  }

  /**
   * Handle JSON-RPC notification
   * @param {object} notification - JSON-RPC notification message
   */
  async handleNotification(notification) {
    const { method, params } = notification;
    
    this.logger.debug(`Handling notification: ${method}`, { params });
    
    // Handle notifications (no response expected)
    const handler = this.methodHandlers.get(method);
    if (handler) {
      try {
        await handler(params || {});
      } catch (error) {
        this.logger.error(`Error in notification handler ${method}:`, error);
      }
    } else {
      this.logger.warn(`No handler for notification: ${method}`);
    }
  }

  /**
   * Handle initialize request
   * @param {object} params - Initialize parameters
   * @returns {object} Initialize response
   */
  async handleInitialize(params) {
    this.logger.info('Handling initialize request');

    // Negotiate capabilities
    if (!this.capabilityManager.negotiateCapabilities(params)) {
      throw new Error('Capability negotiation failed');
    }

    // Return server capabilities
    const response = this.capabilityManager.getServerCapabilities();
    this.logger.info('Initialization successful');
    this.emit('initialized', params);
    
    return response;
  }

  /**
   * Handle tools/list request (placeholder)
   * @param {object} params - Parameters
   * @returns {object} Tools list
   */
  async handleToolsList(_params) {
    // Will be implemented in Feature 028
    return { tools: [] };
  }

  /**
   * Handle tools/call request (placeholder)
   * @param {object} params - Tool call parameters
   * @returns {object} Tool result
   */
  async handleToolsCall(_params) {
    // Will be implemented in Feature 028
    throw new Error('Tool calling not yet implemented');
  }

  /**
   * Handle resources/list request (placeholder)
   * @param {object} params - Parameters
   * @returns {object} Resources list
   */
  async handleResourcesList(_params) {
    // Will be implemented in Feature 031
    return { resources: [] };
  }

  /**
   * Handle resources/read request (placeholder)
   * @param {object} params - Resource read parameters
   * @returns {object} Resource content
   */
  async handleResourcesRead(_params) {
    // Will be implemented in Feature 031
    throw new Error('Resource reading not yet implemented');
  }

  /**
   * Handle ping request
   * @param {object} params - Ping parameters
   * @returns {object} Pong response
   */
  async handlePing(_params) {
    return { pong: true, timestamp: Date.now() };
  }

  /**
   * Send success response
   * @param {*} result - Result data
   * @param {string|number} id - Request ID
   */
  async sendSuccessResponse(result, id) {
    const response = this.jsonRpc.createSuccessResponse(result, id);
    await this.sendMessage(response);
  }

  /**
   * Send error response
   * @param {number} code - Error code
   * @param {string} message - Error message
   * @param {*} data - Additional error data
   * @param {string|number} id - Request ID
   */
  async sendErrorResponse(code, message, data, id) {
    const response = this.jsonRpc.createErrorResponse(code, message, data, id);
    await this.sendMessage(response);
  }

  /**
   * Send message via transport
   * @param {object} message - JSON-RPC message object
   */
  async sendMessage(message) {
    if (!this.transport || !this.transport.isConnected) {
      throw new Error('Transport not connected');
    }

    const serialized = this.jsonRpc.serializeMessage(message);
    await this.transport.send(serialized);
  }

  /**
   * Handle transport errors
   * @param {Error} error - Transport error
   */
  handleTransportError(error) {
    this.logger.error('MCP transport error:', error);
    this.emit('error', error);
  }

  /**
   * Handle transport disconnect
   */
  handleTransportDisconnect() {
    this.logger.info('MCP client disconnected');
    this.isRunning = false;
    this.capabilityManager.reset();
    this.emit('clientDisconnected');
  }

  /**
   * Get server status
   * @returns {object} Server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      transport: this.transport ? this.transport.getStatus() : null,
      capabilities: this.capabilityManager.getStatus(),
      services: this.serviceRegistry.getStatus()
    };
  }
}

module.exports = MCPServer;