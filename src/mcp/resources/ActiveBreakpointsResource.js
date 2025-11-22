/**
 * ActiveBreakpointsResource MCP Resource
 * Provides access to current breakpoint states and information
 */

const BaseMCPResource = require('./BaseMCPResource');

class ActiveBreakpointsResource extends BaseMCPResource {
  constructor(services) {
    super(
      'ydebug://active-breakpoints',
      'Active Breakpoints',
      'List of currently active breakpoints with states and conditions'
    );

    this.services = services;

    // Enable subscriptions and short-term caching
    this.enableSubscriptions();
    this.setCacheable(2000); // 2 second cache TTL - breakpoints change frequently

    this.bindServiceEvents();
  }

  /**
   * Read current breakpoints data
   * @param {object} options - Read options
   * @returns {Promise<object>} Breakpoints data
   */
  async read(options = {}) {
    const validatedOptions = this.validateReadOptions(options);

    try {
      // Apply filtering
      let filteredData = await this.getBreakpointsData();
      if (validatedOptions.filter) {
        filteredData = this.applyBreakpointFilter(filteredData, validatedOptions.filter);
      }

      // Apply pagination to breakpoints array
      if (filteredData.breakpoints) {
        filteredData.breakpoints = this.applyPagination(
          filteredData.breakpoints,
          validatedOptions
        );
      }

      return {
        ...filteredData,
        timestamp: Date.now()
      };

    } catch (error) {
      throw this.formatError(error, 'Reading breakpoints data');
    }
  }

  /**
   * Get comprehensive breakpoints data
   * @returns {Promise<object>} Breakpoints data
   * @private
   */
  async getBreakpointsData() {
    const debuggerService = this.services.get('debugger');
    // const sessionService = this.services.get('session'); // Currently unused

    if (!debuggerService || !debuggerService.isConnected()) {
      return {
        breakpoints: [],
        summary: {
          total: 0,
          enabled: 0,
          disabled: 0,
          conditional: 0,
          temporary: 0
        },
        status: 'disconnected'
      };
    }

    try {
      // Get breakpoints from debugger service
      const breakpoints = await debuggerService.listBreakpoints();

      // Enhance breakpoint data with additional information
      const enhancedBreakpoints = await Promise.all(
        breakpoints.map(bp => this.enhanceBreakpointData(bp))
      );

      // Calculate summary statistics
      const summary = this.calculateBreakpointSummary(enhancedBreakpoints);

      return {
        breakpoints: enhancedBreakpoints,
        summary: summary,
        status: 'connected',
        lastRefresh: Date.now()
      };

    } catch (error) {
      this.logger.error('Failed to get breakpoints data', error);
      throw error;
    }
  }

  /**
   * Enhance breakpoint data with additional context
   * @param {object} breakpoint - Basic breakpoint data
   * @returns {Promise<object>} Enhanced breakpoint data
   * @private
   */
  async enhanceBreakpointData(breakpoint) {
    const enhanced = {
      id: breakpoint.id,
      filename: breakpoint.filename,
      line: breakpoint.line,
      enabled: breakpoint.enabled !== false,
      condition: breakpoint.condition || null,
      hitCount: breakpoint.hitCount || 0,
      temporary: breakpoint.temporary || false,
      createdAt: breakpoint.createdAt || null,
      lastHit: breakpoint.lastHit || null
    };

    // Add file context if available
    try {
      enhanced.fileExists = await this.checkFileExists(breakpoint.filename);
      enhanced.relativeFilename = this.getRelativeFilename(breakpoint.filename);
    } catch {
      enhanced.fileExists = false;
      enhanced.relativeFilename = breakpoint.filename;
    }

    // Add condition complexity analysis
    if (enhanced.condition) {
      enhanced.conditionComplexity = this.analyzeConditionComplexity(enhanced.condition);
    }

    return enhanced;
  }

  /**
   * Calculate summary statistics for breakpoints
   * @param {Array} breakpoints - Breakpoint list
   * @returns {object} Summary statistics
   * @private
   */
  calculateBreakpointSummary(breakpoints) {
    const summary = {
      total: breakpoints.length,
      enabled: 0,
      disabled: 0,
      conditional: 0,
      temporary: 0,
      hitBreakpoints: 0,
      fileCount: 0
    };

    const uniqueFiles = new Set();

    breakpoints.forEach(bp => {
      if (bp.enabled) {
        summary.enabled++;
      } else {
        summary.disabled++;
      }

      if (bp.condition) {
        summary.conditional++;
      }

      if (bp.temporary) {
        summary.temporary++;
      }

      if (bp.hitCount > 0) {
        summary.hitBreakpoints++;
      }

      uniqueFiles.add(bp.filename);
    });

    summary.fileCount = uniqueFiles.size;

    return summary;
  }

  /**
   * Apply breakpoint-specific filtering
   * @param {object} data - Breakpoints data
   * @param {string|object} filter - Filter criteria
   * @returns {object} Filtered data
   * @private
   */
  applyBreakpointFilter(data, filter) {
    if (typeof filter === 'string') {
      return this.applyPresetFilter(data, filter);
    }

    if (typeof filter === 'object') {
      return this.applyCustomFilter(data, filter);
    }

    return data;
  }

  /**
   * Apply preset filter to breakpoints
   * @param {object} data - Breakpoints data
   * @param {string} filterType - Preset filter type
   * @returns {object} Filtered data
   * @private
   */
  applyPresetFilter(data, filterType) {
    let filteredBreakpoints = data.breakpoints;

    switch (filterType) {
    case 'enabled':
      filteredBreakpoints = data.breakpoints.filter(bp => bp.enabled);
      break;
    case 'disabled':
      filteredBreakpoints = data.breakpoints.filter(bp => !bp.enabled);
      break;
    case 'conditional':
      filteredBreakpoints = data.breakpoints.filter(bp => bp.condition);
      break;
    case 'temporary':
      filteredBreakpoints = data.breakpoints.filter(bp => bp.temporary);
      break;
    case 'hit':
      filteredBreakpoints = data.breakpoints.filter(bp => bp.hitCount > 0);
      break;
    case 'summary-only':
      return {
        summary: data.summary,
        status: data.status,
        timestamp: Date.now()
      };
    default:
      // Unknown filter, return all
      break;
    }

    return {
      ...data,
      breakpoints: filteredBreakpoints,
      filterApplied: filterType,
      filteredCount: filteredBreakpoints.length
    };
  }

  /**
   * Apply custom object filter to breakpoints
   * @param {object} data - Breakpoints data
   * @param {object} filter - Custom filter object
   * @returns {object} Filtered data
   * @private
   */
  applyCustomFilter(data, filter) {
    let filteredBreakpoints = data.breakpoints;

    // Filter by filename
    if (filter.filename) {
      filteredBreakpoints = filteredBreakpoints.filter(bp =>
        bp.filename.includes(filter.filename) ||
        bp.relativeFilename.includes(filter.filename)
      );
    }

    // Filter by line range
    if (filter.lineStart || filter.lineEnd) {
      filteredBreakpoints = filteredBreakpoints.filter(bp => {
        const line = bp.line;
        const start = filter.lineStart || 0;
        const end = filter.lineEnd || Number.MAX_SAFE_INTEGER;
        return line >= start && line <= end;
      });
    }

    // Filter by enabled state
    if (filter.enabled !== undefined) {
      filteredBreakpoints = filteredBreakpoints.filter(bp =>
        bp.enabled === filter.enabled
      );
    }

    // Filter by hit count
    if (filter.minHits !== undefined) {
      filteredBreakpoints = filteredBreakpoints.filter(bp =>
        bp.hitCount >= filter.minHits
      );
    }

    return {
      ...data,
      breakpoints: filteredBreakpoints,
      filterApplied: 'custom',
      filteredCount: filteredBreakpoints.length,
      filterCriteria: filter
    };
  }

  /**
   * Bind to service events for real-time updates
   * @private
   */
  bindServiceEvents() {
    if (this.services.has('debugger')) {
      const debuggerService = this.services.get('debugger');

      debuggerService.on('breakpoint:set', (breakpoint) => {
        this.handleBreakpointChange('added', breakpoint);
      });

      debuggerService.on('breakpoint:removed', (breakpoint) => {
        this.handleBreakpointChange('removed', breakpoint);
      });

      debuggerService.on('breakpoint:hit', (breakpoint) => {
        this.handleBreakpointChange('hit', breakpoint);
      });

      debuggerService.on('breakpoint:enabled', (breakpoint) => {
        this.handleBreakpointChange('enabled', breakpoint);
      });

      debuggerService.on('breakpoint:disabled', (breakpoint) => {
        this.handleBreakpointChange('disabled', breakpoint);
      });
    }
  }

  /**
   * Handle breakpoint change events
   * @param {string} changeType - Type of change
   * @param {object} breakpoint - Breakpoint data
   * @private
   */
  handleBreakpointChange(changeType, breakpoint) {
    this.notifyUpdate({
      changeType: changeType,
      breakpoint: {
        id: breakpoint.id,
        filename: breakpoint.filename,
        line: breakpoint.line,
        enabled: breakpoint.enabled
      }
    });
  }

  /**
   * Check if file exists (mock implementation)
   * @param {string} filename - File path
   * @returns {Promise<boolean>} True if file exists
   * @private
   */
  async checkFileExists(filename) {
    // Mock implementation - in real scenario would check filesystem
    return filename && filename.length > 0;
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
    return parts.slice(-2).join('/'); // Return last 2 parts for context
  }

  /**
   * Analyze condition complexity
   * @param {string} condition - Breakpoint condition
   * @returns {string} Complexity level
   * @private
   */
  analyzeConditionComplexity(condition) {
    if (!condition) return 'none';

    const length = condition.length;
    const operators = (condition.match(/[&|!=<>]/g) || []).length;

    if (length > 100 || operators > 5) return 'complex';
    if (length > 30 || operators > 2) return 'moderate';
    return 'simple';
  }

  /**
   * Validate read options specific to breakpoints resource
   * @param {object} options - Read options
   * @returns {object} Validated options
   */
  validateReadOptions(options) {
    const baseOptions = super.validateReadOptions(options);

    // Add breakpoints-specific validation
    const validFilters = ['enabled', 'disabled', 'conditional', 'temporary', 'hit', 'summary-only'];

    if (baseOptions.filter && typeof baseOptions.filter === 'string') {
      if (!validFilters.includes(baseOptions.filter)) {
        this.logger.warn(`Invalid breakpoints filter: ${baseOptions.filter}. Using default.`);
        baseOptions.filter = null;
      }
    }

    return baseOptions;
  }
}

module.exports = ActiveBreakpointsResource;
