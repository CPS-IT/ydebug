/**
 * DebuggingSessionResource MCP Resource
 * Provides access to current debugging session information
 */

const BaseMCPResource = require('./BaseMCPResource');

class DebuggingSessionResource extends BaseMCPResource {
  constructor(services) {
    super(
      'ydebug://debugging-session',
      'Debugging Session',
      'Current debugging session state and information'
    );
    
    this.services = services;
    
    // Enable subscriptions and caching
    this.enableSubscriptions();
    this.setCacheable(5000); // 5 second cache TTL
    
    // Session state
    this.sessionState = {
      active: false,
      sessionId: null,
      startTime: null,
      endTime: null,
      targetScript: null,
      connectionStatus: 'disconnected',
      debuggerInfo: {},
      statistics: {
        totalBreakpoints: 0,
        stepsExecuted: 0,
        variablesInspected: 0,
        analysisRequests: 0
      }
    };
    
    this.bindServiceEvents();
  }

  /**
   * Initialize the resource with service connections
   */
  async doInitialize() {
    // Get initial session state from debugger service if available
    await this.updateSessionState();
  }

  /**
   * Read current session data
   * @param {object} options - Read options
   * @returns {Promise<object>} Session data
   */
  async read(options = {}) {
    const validatedOptions = this.validateReadOptions(options);
    
    try {
      // Refresh session state
      await this.updateSessionState();
      
      // Build response data
      const sessionData = {
        ...this.sessionState,
        timestamp: Date.now(),
        uptime: this.sessionState.startTime ? 
          Date.now() - this.sessionState.startTime : null
      };

      // Apply filtering if specified
      if (validatedOptions.filter) {
        return this.filterSessionData(sessionData, validatedOptions.filter);
      }

      return sessionData;
      
    } catch (error) {
      throw this.formatError(error, 'Reading session data');
    }
  }

  /**
   * Update session state from services
   * @private
   */
  async updateSessionState() {
    const debuggerService = this.services.get('debugger');
    const sessionService = this.services.get('session');
    const analysisService = this.services.get('analysis');

    // Update connection status
    if (debuggerService) {
      this.sessionState.connectionStatus = debuggerService.isConnected() ? 
        'connected' : 'disconnected';
      
      if (debuggerService.isConnected()) {
        this.sessionState.debuggerInfo = {
          protocol: debuggerService.getProtocolInfo(),
          capabilities: debuggerService.getCapabilities(),
          version: debuggerService.getVersion()
        };
      }
    }

    // Update session information
    if (sessionService) {
      const sessionInfo = sessionService.getCurrentSession();
      if (sessionInfo) {
        this.sessionState.active = true;
        this.sessionState.sessionId = sessionInfo.id;
        this.sessionState.startTime = sessionInfo.startTime;
        this.sessionState.targetScript = sessionInfo.targetScript;
        
        // Update statistics
        this.sessionState.statistics = {
          totalBreakpoints: sessionService.getBreakpointCount(),
          stepsExecuted: sessionInfo.stepsExecuted || 0,
          variablesInspected: sessionInfo.variablesInspected || 0,
          analysisRequests: sessionInfo.analysisRequests || 0
        };
      } else {
        this.sessionState.active = false;
        this.sessionState.sessionId = null;
        this.sessionState.endTime = Date.now();
      }
    }

    // Add analysis service status
    if (analysisService && analysisService.isReady) {
      this.sessionState.analysisAvailable = analysisService.isReady();
    }
  }

  /**
   * Filter session data based on criteria
   * @param {object} sessionData - Full session data
   * @param {string|object} filter - Filter criteria
   * @returns {object} Filtered data
   * @private
   */
  filterSessionData(sessionData, filter) {
    if (typeof filter === 'string') {
      // Predefined filters
      switch (filter) {
      case 'basic':
        return {
          active: sessionData.active,
          sessionId: sessionData.sessionId,
          connectionStatus: sessionData.connectionStatus,
          timestamp: sessionData.timestamp
        };
      case 'statistics':
        return {
          statistics: sessionData.statistics,
          uptime: sessionData.uptime,
          timestamp: sessionData.timestamp
        };
      case 'connection':
        return {
          connectionStatus: sessionData.connectionStatus,
          debuggerInfo: sessionData.debuggerInfo,
          timestamp: sessionData.timestamp
        };
      default:
        return sessionData;
      }
    }

    // Custom object filter
    if (typeof filter === 'object') {
      const result = { timestamp: sessionData.timestamp };
      
      Object.keys(filter).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(sessionData, key)) {
          result[key] = sessionData[key];
        }
      });
      
      return result;
    }

    return sessionData;
  }

  /**
   * Bind to service events for real-time updates
   * @private
   */
  bindServiceEvents() {
    // Listen for debugger connection events
    if (this.services.has('debugger')) {
      const debuggerService = this.services.get('debugger');
      
      debuggerService.on('connected', () => {
        this.handleSessionChange('debugger_connected');
      });
      
      debuggerService.on('disconnected', () => {
        this.handleSessionChange('debugger_disconnected');
      });
    }

    // Listen for session events
    if (this.services.has('session')) {
      const sessionService = this.services.get('session');
      
      sessionService.on('session:started', (sessionInfo) => {
        this.handleSessionChange('session_started', sessionInfo);
      });
      
      sessionService.on('session:ended', (sessionInfo) => {
        this.handleSessionChange('session_ended', sessionInfo);
      });
      
      sessionService.on('breakpoint:added', () => {
        this.handleSessionChange('breakpoint_added');
      });
      
      sessionService.on('breakpoint:removed', () => {
        this.handleSessionChange('breakpoint_removed');
      });
    }
  }

  /**
   * Handle session state changes
   * @param {string} eventType - Type of change
   * @param {object} eventData - Event data
   * @private
   */
  async handleSessionChange(eventType, eventData = {}) {
    try {
      // Update our cached state
      await this.updateSessionState();
      
      // Notify subscribers
      this.notifyUpdate({
        changeType: eventType,
        eventData: eventData,
        newState: this.sessionState
      });
      
    } catch (error) {
      this.logger.error(`Failed to handle session change: ${eventType}`, error);
    }
  }

  /**
   * Validate read options specific to session resource
   * @param {object} options - Read options
   * @returns {object} Validated options
   */
  validateReadOptions(options) {
    const baseOptions = super.validateReadOptions(options);
    
    // Add session-specific validation
    const validFilters = ['basic', 'statistics', 'connection'];
    
    if (baseOptions.filter && typeof baseOptions.filter === 'string') {
      if (!validFilters.includes(baseOptions.filter)) {
        this.logger.warn(`Invalid session filter: ${baseOptions.filter}. Using default.`);
        baseOptions.filter = null;
      }
    }

    return baseOptions;
  }

  /**
   * Get session resource statistics
   * @returns {object} Resource statistics
   */
  getResourceStats() {
    return {
      ...this.getStatus(),
      sessionActive: this.sessionState.active,
      connectionStatus: this.sessionState.connectionStatus,
      totalBreakpoints: this.sessionState.statistics.totalBreakpoints,
      uptime: this.sessionState.startTime ? 
        Date.now() - this.sessionState.startTime : null
    };
  }
}

module.exports = DebuggingSessionResource;