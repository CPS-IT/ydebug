/**
 * ExecutionStateResource MCP Resource
 * Provides access to current execution position and state information
 */

const BaseMCPResource = require('./BaseMCPResource');

class ExecutionStateResource extends BaseMCPResource {
  constructor(services) {
    super(
      'ydebug://execution-state',
      'Execution State',
      'Current execution position, call stack, and runtime state'
    );
    
    this.services = services;
    
    // Enable subscriptions with very short cache TTL (execution state changes rapidly)
    this.enableSubscriptions();
    this.setCacheable(1000); // 1 second cache TTL
    
    this.bindServiceEvents();
  }

  /**
   * Read current execution state data
   * @param {object} options - Read options
   * @returns {Promise<object>} Execution state data
   */
  async read(options = {}) {
    const validatedOptions = this.validateReadOptions(options);
    
    try {
      const executionData = await this.getExecutionData();
      
      // Apply filtering
      let filteredData = executionData;
      if (validatedOptions.filter) {
        filteredData = this.applyExecutionFilter(filteredData, validatedOptions.filter);
      }

      // Apply pagination to stack frames if requested
      if (filteredData.callStack && validatedOptions.limit) {
        filteredData.callStack = this.applyPagination(
          filteredData.callStack, 
          validatedOptions
        );
      }

      return {
        ...filteredData,
        timestamp: Date.now()
      };
      
    } catch (error) {
      throw this.formatError(error, 'Reading execution state data');
    }
  }

  /**
   * Get comprehensive execution state data
   * @returns {Promise<object>} Execution state data
   * @private
   */
  async getExecutionData() {
    const debuggerService = this.services.get('debugger');
    const sessionService = this.services.get('session');
    
    if (!debuggerService || !debuggerService.isConnected()) {
      return {
        status: 'disconnected',
        position: null,
        callStack: [],
        variables: {},
        breakpointInfo: null,
        executionMetrics: {
          stepCount: 0,
          executionTime: 0,
          lastStepTime: null
        }
      };
    }

    try {
      // Get current execution position
      const currentPosition = await debuggerService.getCurrentPosition();
      
      // Get call stack
      const callStack = await debuggerService.getCallStack();
      
      // Get current scope variables
      const variables = await debuggerService.getCurrentScopeVariables();
      
      // Get breakpoint information if stopped at breakpoint
      const breakpointInfo = await this.getCurrentBreakpointInfo();
      
      // Get execution metrics from session
      const metrics = sessionService ? 
        sessionService.getExecutionMetrics() : 
        this.getDefaultMetrics();

      // Get execution status and reason
      const status = debuggerService.getExecutionStatus();
      const reason = debuggerService.getStopReason();

      return {
        status: status || 'running',
        reason: reason || null,
        position: this.formatPosition(currentPosition),
        callStack: this.formatCallStack(callStack),
        variables: this.formatVariables(variables),
        breakpointInfo: breakpointInfo,
        executionMetrics: metrics,
        capabilities: debuggerService.getCapabilities(),
        lastUpdate: Date.now()
      };
      
    } catch (error) {
      this.logger.error('Failed to get execution state data', error);
      throw error;
    }
  }

  /**
   * Format current position information
   * @param {object} position - Raw position data
   * @returns {object|null} Formatted position
   * @private
   */
  formatPosition(position) {
    if (!position) return null;

    return {
      filename: position.filename || null,
      line: position.line || null,
      column: position.column || null,
      function: position.function || null,
      class: position.class || null,
      method: position.method || null,
      relativeFilename: this.getRelativeFilename(position.filename)
    };
  }

  /**
   * Format call stack information
   * @param {Array} callStack - Raw call stack data
   * @returns {Array} Formatted call stack
   * @private
   */
  formatCallStack(callStack) {
    if (!Array.isArray(callStack)) return [];

    return callStack.map((frame, index) => ({
      level: index,
      function: frame.function || frame.name || '<anonymous>',
      filename: frame.filename || null,
      line: frame.line || null,
      class: frame.class || null,
      method: frame.method || null,
      arguments: this.formatFrameArguments(frame.arguments),
      relativeFilename: this.getRelativeFilename(frame.filename),
      isCurrentFrame: index === 0
    }));
  }

  /**
   * Format variables for current scope
   * @param {object} variables - Raw variables data
   * @returns {object} Formatted variables
   * @private
   */
  formatVariables(variables) {
    if (!variables || typeof variables !== 'object') return {};

    const formatted = {};
    
    Object.entries(variables).forEach(([name, value]) => {
      formatted[name] = {
        value: value,
        type: typeof value,
        isNull: value === null || value === undefined,
        isArray: Array.isArray(value),
        isObject: value !== null && typeof value === 'object' && !Array.isArray(value),
        size: this.getValueSize(value),
        preview: this.getValuePreview(value)
      };
    });

    return formatted;
  }

  /**
   * Format frame arguments
   * @param {Array} args - Frame arguments
   * @returns {Array} Formatted arguments
   * @private
   */
  formatFrameArguments(args) {
    if (!Array.isArray(args)) return [];

    return args.map((arg, index) => ({
      index: index,
      name: arg.name || `arg${index}`,
      value: arg.value,
      type: typeof arg.value,
      preview: this.getValuePreview(arg.value)
    }));
  }

  /**
   * Get current breakpoint information
   * @returns {Promise<object|null>} Breakpoint info or null
   * @private
   */
  async getCurrentBreakpointInfo() {
    const debuggerService = this.services.get('debugger');
    
    if (!debuggerService) return null;

    try {
      const currentBreakpoint = await debuggerService.getCurrentBreakpoint();
      
      if (!currentBreakpoint) return null;

      return {
        id: currentBreakpoint.id,
        filename: currentBreakpoint.filename,
        line: currentBreakpoint.line,
        condition: currentBreakpoint.condition,
        hitCount: currentBreakpoint.hitCount || 0,
        temporary: currentBreakpoint.temporary || false,
        enabled: currentBreakpoint.enabled !== false
      };
      
    } catch (error) {
      this.logger.debug('No current breakpoint information available', error);
      return null;
    }
  }

  /**
   * Apply execution state filtering
   * @param {object} data - Execution state data
   * @param {string|object} filter - Filter criteria
   * @returns {object} Filtered data
   * @private
   */
  applyExecutionFilter(data, filter) {
    if (typeof filter === 'string') {
      return this.applyPresetExecutionFilter(data, filter);
    }

    if (typeof filter === 'object') {
      return this.applyCustomExecutionFilter(data, filter);
    }

    return data;
  }

  /**
   * Apply preset execution filter
   * @param {object} data - Execution state data
   * @param {string} filterType - Preset filter type
   * @returns {object} Filtered data
   * @private
   */
  applyPresetExecutionFilter(data, filterType) {
    switch (filterType) {
    case 'position-only':
      return {
        status: data.status,
        position: data.position,
        timestamp: Date.now()
      };
    case 'stack-only':
      return {
        status: data.status,
        callStack: data.callStack,
        timestamp: Date.now()
      };
    case 'variables-only':
      return {
        status: data.status,
        variables: data.variables,
        timestamp: Date.now()
      };
    case 'breakpoint-only':
      return {
        status: data.status,
        position: data.position,
        breakpointInfo: data.breakpointInfo,
        timestamp: Date.now()
      };
    case 'summary':
      return {
        status: data.status,
        reason: data.reason,
        position: data.position ? {
          filename: data.position.relativeFilename,
          line: data.position.line,
          function: data.position.function
        } : null,
        stackDepth: data.callStack.length,
        variableCount: Object.keys(data.variables).length,
        hasBreakpoint: !!data.breakpointInfo,
        timestamp: Date.now()
      };
    default:
      return data;
    }
  }

  /**
   * Apply custom execution filter
   * @param {object} data - Execution state data
   * @param {object} filter - Custom filter object
   * @returns {object} Filtered data
   * @private
   */
  applyCustomExecutionFilter(data, filter) {
    const result = { timestamp: Date.now() };

    // Include requested fields
    if (filter.includeStatus !== false) result.status = data.status;
    if (filter.includeReason !== false) result.reason = data.reason;
    if (filter.includePosition !== false) result.position = data.position;
    if (filter.includeCallStack !== false) result.callStack = data.callStack;
    if (filter.includeVariables !== false) result.variables = data.variables;
    if (filter.includeBreakpoint !== false) result.breakpointInfo = data.breakpointInfo;
    if (filter.includeMetrics) result.executionMetrics = data.executionMetrics;

    // Apply stack depth limit
    if (result.callStack && filter.maxStackDepth) {
      result.callStack = result.callStack.slice(0, filter.maxStackDepth);
    }

    // Filter variables by name pattern
    if (result.variables && filter.variablePattern) {
      const pattern = new RegExp(filter.variablePattern, 'i');
      const filteredVars = {};
      
      Object.entries(result.variables).forEach(([name, info]) => {
        if (pattern.test(name)) {
          filteredVars[name] = info;
        }
      });
      
      result.variables = filteredVars;
    }

    return result;
  }

  /**
   * Bind to service events for real-time updates
   * @private
   */
  bindServiceEvents() {
    if (this.services.has('debugger')) {
      const debuggerService = this.services.get('debugger');
      
      debuggerService.on('execution:paused', (data) => {
        this.handleExecutionChange('paused', data);
      });
      
      debuggerService.on('execution:continued', (data) => {
        this.handleExecutionChange('continued', data);
      });
      
      debuggerService.on('execution:stepped', (data) => {
        this.handleExecutionChange('stepped', data);
      });
      
      debuggerService.on('breakpoint:hit', (breakpoint) => {
        this.handleExecutionChange('breakpoint_hit', { breakpoint });
      });
    }
  }

  /**
   * Handle execution state change events
   * @param {string} changeType - Type of change
   * @param {object} data - Event data
   * @private
   */
  handleExecutionChange(changeType, data) {
    this.notifyUpdate({
      changeType: changeType,
      eventData: data
    });
  }

  /**
   * Get default execution metrics
   * @returns {object} Default metrics
   * @private
   */
  getDefaultMetrics() {
    return {
      stepCount: 0,
      executionTime: 0,
      lastStepTime: null
    };
  }

  /**
   * Get relative filename for display
   * @param {string} fullPath - Full file path
   * @returns {string} Relative filename
   * @private
   */
  getRelativeFilename(fullPath) {
    if (!fullPath) return '';
    
    const parts = fullPath.split(/[/\\]/);
    return parts.slice(-2).join('/');
  }

  /**
   * Get size information for a value
   * @param {*} value - Value to measure
   * @returns {number|string} Size information
   * @private
   */
  getValueSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return Object.keys(value).length;
    return 'n/a';
  }

  /**
   * Get preview string for a value
   * @param {*} value - Value to preview
   * @returns {string} Preview string
   * @private
   */
  getValuePreview(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    const str = String(value);
    if (str.length <= 50) return str;
    
    return str.substring(0, 47) + '...';
  }

  /**
   * Validate read options specific to execution state resource
   * @param {object} options - Read options
   * @returns {object} Validated options
   */
  validateReadOptions(options) {
    const baseOptions = super.validateReadOptions(options);
    
    const validFilters = ['position-only', 'stack-only', 'variables-only', 'breakpoint-only', 'summary'];
    
    if (baseOptions.filter && typeof baseOptions.filter === 'string') {
      if (!validFilters.includes(baseOptions.filter)) {
        this.logger.warn(`Invalid execution state filter: ${baseOptions.filter}. Using default.`);
        baseOptions.filter = null;
      }
    }

    return baseOptions;
  }
}

module.exports = ExecutionStateResource;