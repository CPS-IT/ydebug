/**
 * ExecutionHistoryResource MCP Resource
 * Provides access to execution flow and call history for debugging analysis
 */

const BaseMCPResource = require('./BaseMCPResource');

class ExecutionHistoryResource extends BaseMCPResource {
  constructor(services) {
    super(
      'ydebug://execution-history',
      'Execution History',
      'Historical execution flow, call traces, and debugging session timeline'
    );
    
    this.services = services;
    
    // Enable subscriptions with longer cache TTL (history is relatively stable)
    this.enableSubscriptions();
    this.setCacheable(10000); // 10 second cache TTL
    
    // Internal history tracking
    this.executionHistory = [];
    this.maxHistorySize = 1000; // Limit history size to prevent memory issues
    this.sessionStartTime = null;
    
    this.bindServiceEvents();
  }

  /**
   * Initialize the resource and start tracking execution history
   */
  async doInitialize() {
    this.sessionStartTime = Date.now();
    this.logger.debug('Started execution history tracking');
  }

  /**
   * Read execution history data
   * @param {object} options - Read options
   * @returns {Promise<object>} Execution history data
   */
  async read(options = {}) {
    const validatedOptions = this.validateReadOptions(options);
    
    try {
      const historyData = await this.getExecutionHistoryData(validatedOptions);
      
      // Apply filtering
      let filteredData = historyData;
      if (validatedOptions.filter) {
        filteredData = this.applyHistoryFilter(filteredData, validatedOptions.filter);
      }

      // Apply pagination to history entries
      if (filteredData.entries && (validatedOptions.limit || validatedOptions.offset)) {
        filteredData.entries = this.applyPagination(
          filteredData.entries, 
          validatedOptions
        );
        filteredData.paginationApplied = true;
      }

      return {
        ...filteredData,
        timestamp: Date.now()
      };
      
    } catch (error) {
      throw this.formatError(error, 'Reading execution history data');
    }
  }

  /**
   * Get comprehensive execution history data
   * @param {object} options - Read options
   * @returns {Promise<object>} Execution history data
   * @private
   */
  async getExecutionHistoryData(_options) {
    const sessionService = this.services.get('session');
    
    // Get additional session history if available
    let sessionHistory = [];
    if (sessionService) {
      try {
        sessionHistory = await sessionService.getExecutionHistory();
      } catch (error) {
        this.logger.debug('No session history available', error);
      }
    }

    // Merge our tracked history with session history
    const mergedHistory = this.mergeHistoryData(this.executionHistory, sessionHistory);
    
    // Build comprehensive history data
    const historyData = {
      entries: mergedHistory,
      summary: this.generateHistorySummary(mergedHistory),
      timeline: this.generateTimeline(mergedHistory),
      patterns: this.analyzeExecutionPatterns(mergedHistory),
      statistics: this.calculateHistoryStatistics(mergedHistory),
      sessionInfo: {
        startTime: this.sessionStartTime,
        duration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0,
        totalEntries: mergedHistory.length
      },
      lastRefresh: Date.now()
    };

    return historyData;
  }

  /**
   * Merge execution history from different sources
   * @param {Array} trackedHistory - Our tracked history
   * @param {Array} sessionHistory - Session service history
   * @returns {Array} Merged and sorted history
   * @private
   */
  mergeHistoryData(trackedHistory, sessionHistory) {
    const merged = [...trackedHistory, ...sessionHistory];
    
    // Remove duplicates based on timestamp and event type
    const unique = merged.filter((entry, index, array) => {
      return index === array.findIndex(e => 
        e.timestamp === entry.timestamp && e.type === entry.type
      );
    });
    
    // Sort by timestamp (most recent first)
    return unique.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate history summary
   * @param {Array} history - Execution history
   * @returns {object} Summary data
   * @private
   */
  generateHistorySummary(history) {
    const summary = {
      totalEvents: history.length,
      eventTypes: {},
      timeRange: {
        earliest: null,
        latest: null,
        duration: 0
      },
      mostActiveFunction: null,
      mostActiveFile: null,
      executionPattern: 'unknown'
    };

    if (history.length === 0) return summary;

    // Count event types
    const functionCounts = {};
    const fileCounts = {};
    let earliestTime = Number.MAX_SAFE_INTEGER;
    let latestTime = 0;

    history.forEach(entry => {
      // Event type counting
      summary.eventTypes[entry.type] = (summary.eventTypes[entry.type] || 0) + 1;
      
      // Time range tracking
      if (entry.timestamp < earliestTime) earliestTime = entry.timestamp;
      if (entry.timestamp > latestTime) latestTime = entry.timestamp;
      
      // Function and file activity tracking
      if (entry.function) {
        functionCounts[entry.function] = (functionCounts[entry.function] || 0) + 1;
      }
      if (entry.filename) {
        const filename = this.getRelativeFilename(entry.filename);
        fileCounts[filename] = (fileCounts[filename] || 0) + 1;
      }
    });

    // Set time range
    summary.timeRange.earliest = earliestTime;
    summary.timeRange.latest = latestTime;
    summary.timeRange.duration = latestTime - earliestTime;

    // Find most active function and file
    summary.mostActiveFunction = this.getMostFrequent(functionCounts);
    summary.mostActiveFile = this.getMostFrequent(fileCounts);

    // Determine execution pattern
    summary.executionPattern = this.determineExecutionPattern(summary.eventTypes);

    return summary;
  }

  /**
   * Generate timeline data for visualization
   * @param {Array} history - Execution history
   * @returns {Array} Timeline data
   * @private
   */
  generateTimeline(history) {
    if (history.length === 0) return [];

    // Group events by time buckets (e.g., per second)
    const bucketSize = 1000; // 1 second buckets
    const buckets = {};

    history.forEach(entry => {
      const bucketTime = Math.floor(entry.timestamp / bucketSize) * bucketSize;
      
      if (!buckets[bucketTime]) {
        buckets[bucketTime] = {
          timestamp: bucketTime,
          events: [],
          eventTypes: {},
          count: 0
        };
      }
      
      buckets[bucketTime].events.push(entry);
      buckets[bucketTime].eventTypes[entry.type] = (buckets[bucketTime].eventTypes[entry.type] || 0) + 1;
      buckets[bucketTime].count++;
    });

    // Convert to sorted array
    return Object.values(buckets).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Analyze execution patterns
   * @param {Array} history - Execution history
   * @returns {object} Pattern analysis
   * @private
   */
  analyzeExecutionPatterns(history) {
    const patterns = {
      recursionDetected: false,
      loopingBehavior: false,
      frequentBreakpoints: false,
      exceptionPattern: false,
      details: {}
    };

    if (history.length < 3) return patterns;

    // Analyze for recursion
    const functionCallStack = [];
    history.forEach(entry => {
      if (entry.type === 'function_call' && entry.function) {
        if (functionCallStack.includes(entry.function)) {
          patterns.recursionDetected = true;
          patterns.details.recursiveFunction = entry.function;
        }
        functionCallStack.push(entry.function);
      } else if (entry.type === 'function_return') {
        functionCallStack.pop();
      }
    });

    // Analyze for looping behavior (same line visited multiple times)
    const lineVisits = {};
    history.forEach(entry => {
      if (entry.filename && entry.line) {
        const key = `${entry.filename}:${entry.line}`;
        lineVisits[key] = (lineVisits[key] || 0) + 1;
      }
    });
    
    const maxVisits = Math.max(...Object.values(lineVisits));
    if (maxVisits > 10) {
      patterns.loopingBehavior = true;
      patterns.details.maxLineVisits = maxVisits;
      patterns.details.mostVisitedLine = this.getMostFrequent(lineVisits);
    }

    // Check for frequent breakpoints
    const breakpointHits = history.filter(entry => entry.type === 'breakpoint_hit').length;
    if (breakpointHits > 5) {
      patterns.frequentBreakpoints = true;
      patterns.details.breakpointHitCount = breakpointHits;
    }

    // Check for exception patterns
    const exceptions = history.filter(entry => entry.type === 'exception' || entry.type === 'error').length;
    if (exceptions > 0) {
      patterns.exceptionPattern = true;
      patterns.details.exceptionCount = exceptions;
    }

    return patterns;
  }

  /**
   * Calculate history statistics
   * @param {Array} history - Execution history
   * @returns {object} Statistics
   * @private
   */
  calculateHistoryStatistics(history) {
    const stats = {
      averageEventsPerSecond: 0,
      peakActivity: {
        timestamp: null,
        eventCount: 0
      },
      executionTime: {
        total: 0,
        average: 0,
        longest: 0
      },
      breakpointStatistics: {
        totalHits: 0,
        uniqueBreakpoints: new Set(),
        averageHitsPerBreakpoint: 0
      }
    };

    if (history.length === 0) return stats;

    // Calculate time-based statistics
    const timespan = (history[0].timestamp - history[history.length - 1].timestamp) / 1000;
    stats.averageEventsPerSecond = timespan > 0 ? history.length / timespan : 0;

    // Find peak activity
    const timeline = this.generateTimeline(history);
    const peakBucket = timeline.reduce((peak, bucket) => 
      bucket.count > peak.count ? bucket : peak, { count: 0 });
    
    stats.peakActivity = {
      timestamp: peakBucket.timestamp,
      eventCount: peakBucket.count
    };

    // Calculate execution time statistics
    const executionEvents = history.filter(entry => entry.executionTime);
    if (executionEvents.length > 0) {
      const times = executionEvents.map(entry => entry.executionTime);
      stats.executionTime.total = times.reduce((sum, time) => sum + time, 0);
      stats.executionTime.average = stats.executionTime.total / times.length;
      stats.executionTime.longest = Math.max(...times);
    }

    // Calculate breakpoint statistics
    const breakpointHits = history.filter(entry => entry.type === 'breakpoint_hit');
    stats.breakpointStatistics.totalHits = breakpointHits.length;
    
    breakpointHits.forEach(entry => {
      if (entry.breakpoint && entry.breakpoint.id) {
        stats.breakpointStatistics.uniqueBreakpoints.add(entry.breakpoint.id);
      }
    });

    const uniqueCount = stats.breakpointStatistics.uniqueBreakpoints.size;
    stats.breakpointStatistics.averageHitsPerBreakpoint = uniqueCount > 0 ? 
      stats.breakpointStatistics.totalHits / uniqueCount : 0;
    
    // Convert Set to count for JSON serialization
    stats.breakpointStatistics.uniqueBreakpointCount = uniqueCount;
    delete stats.breakpointStatistics.uniqueBreakpoints;

    return stats;
  }

  /**
   * Apply history-specific filtering
   * @param {object} data - History data
   * @param {string|object} filter - Filter criteria
   * @returns {object} Filtered data
   * @private
   */
  applyHistoryFilter(data, filter) {
    if (typeof filter === 'string') {
      return this.applyPresetHistoryFilter(data, filter);
    }

    if (typeof filter === 'object') {
      return this.applyCustomHistoryFilter(data, filter);
    }

    return data;
  }

  /**
   * Apply preset history filter
   * @param {object} data - History data
   * @param {string} filterType - Preset filter type
   * @returns {object} Filtered data
   * @private
   */
  applyPresetHistoryFilter(data, filterType) {
    let filteredEntries = data.entries;

    switch (filterType) {
    case 'breakpoints':
      filteredEntries = data.entries.filter(entry => entry.type === 'breakpoint_hit');
      break;
    case 'exceptions':
      filteredEntries = data.entries.filter(entry => 
        entry.type === 'exception' || entry.type === 'error');
      break;
    case 'function-calls':
      filteredEntries = data.entries.filter(entry => 
        entry.type === 'function_call' || entry.type === 'function_return');
      break;
    case 'step-execution':
      filteredEntries = data.entries.filter(entry => entry.type === 'step');
      break;
    case 'recent':
      // Last 100 entries
      filteredEntries = data.entries.slice(0, 100);
      break;
    case 'summary-only':
      return {
        summary: data.summary,
        patterns: data.patterns,
        statistics: data.statistics,
        sessionInfo: data.sessionInfo,
        timestamp: Date.now()
      };
    case 'timeline-only':
      return {
        timeline: data.timeline,
        sessionInfo: data.sessionInfo,
        timestamp: Date.now()
      };
    default:
      break;
    }

    return {
      ...data,
      entries: filteredEntries,
      filterApplied: filterType,
      filteredCount: filteredEntries.length
    };
  }

  /**
   * Apply custom history filter
   * @param {object} data - History data
   * @param {object} filter - Custom filter object
   * @returns {object} Filtered data
   * @private
   */
  applyCustomHistoryFilter(data, filter) {
    let filteredEntries = data.entries;

    // Filter by event type
    if (filter.eventType) {
      filteredEntries = filteredEntries.filter(entry => entry.type === filter.eventType);
    }

    // Filter by time range
    if (filter.startTime || filter.endTime) {
      const startTime = filter.startTime || 0;
      const endTime = filter.endTime || Date.now();
      filteredEntries = filteredEntries.filter(entry => 
        entry.timestamp >= startTime && entry.timestamp <= endTime);
    }

    // Filter by function
    if (filter.function) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.function && entry.function.includes(filter.function));
    }

    // Filter by filename
    if (filter.filename) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.filename && entry.filename.includes(filter.filename));
    }

    return {
      ...data,
      entries: filteredEntries,
      filterApplied: 'custom',
      filteredCount: filteredEntries.length,
      filterCriteria: filter
    };
  }

  /**
   * Record execution event in history
   * @param {string} type - Event type
   * @param {object} data - Event data
   * @private
   */
  recordExecutionEvent(type, data = {}) {
    const entry = {
      id: this.generateHistoryId(),
      type: type,
      timestamp: Date.now(),
      ...data
    };

    // Add to history
    this.executionHistory.unshift(entry);

    // Maintain size limit
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.splice(this.maxHistorySize);
    }

    // Notify subscribers of update
    this.notifyUpdate({
      changeType: 'history_entry_added',
      newEntry: entry,
      totalEntries: this.executionHistory.length
    });
  }

  /**
   * Bind to service events for history tracking
   * @private
   */
  bindServiceEvents() {
    if (this.services.has('debugger')) {
      const debuggerService = this.services.get('debugger');
      
      debuggerService.on('execution:stepped', (data) => {
        this.recordExecutionEvent('step', {
          filename: data.filename,
          line: data.line,
          function: data.function,
          executionTime: data.executionTime
        });
      });
      
      debuggerService.on('breakpoint:hit', (breakpoint) => {
        this.recordExecutionEvent('breakpoint_hit', {
          filename: breakpoint.filename,
          line: breakpoint.line,
          breakpoint: {
            id: breakpoint.id,
            condition: breakpoint.condition
          }
        });
      });
      
      debuggerService.on('exception:occurred', (exception) => {
        this.recordExecutionEvent('exception', {
          message: exception.message,
          filename: exception.filename,
          line: exception.line,
          type: exception.type
        });
      });
      
      debuggerService.on('function:entered', (functionData) => {
        this.recordExecutionEvent('function_call', {
          function: functionData.name,
          filename: functionData.filename,
          line: functionData.line,
          arguments: functionData.arguments
        });
      });
      
      debuggerService.on('function:exited', (functionData) => {
        this.recordExecutionEvent('function_return', {
          function: functionData.name,
          filename: functionData.filename,
          line: functionData.line,
          returnValue: functionData.returnValue
        });
      });
    }
  }

  /**
   * Helper methods
   */

  generateHistoryId() {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRelativeFilename(fullPath) {
    if (!fullPath) return '';
    const parts = fullPath.split(/[/\\]/);
    return parts.slice(-2).join('/');
  }

  getMostFrequent(countObject) {
    if (Object.keys(countObject).length === 0) return null;
    
    return Object.entries(countObject).reduce((max, [key, count]) => 
      count > max.count ? { key, count } : max, { key: null, count: 0 }).key;
  }

  determineExecutionPattern(eventTypes) {
    const stepCount = eventTypes.step || 0;
    const breakpointCount = eventTypes.breakpoint_hit || 0;
    const exceptionCount = eventTypes.exception || 0;

    if (exceptionCount > 0) return 'exception-heavy';
    if (breakpointCount > stepCount) return 'breakpoint-driven';
    if (stepCount > 20) return 'step-debugging';
    return 'normal';
  }

  /**
   * Validate read options specific to execution history resource
   */
  validateReadOptions(options) {
    const baseOptions = super.validateReadOptions(options);
    
    const validFilters = ['breakpoints', 'exceptions', 'function-calls', 'step-execution', 'recent', 'summary-only', 'timeline-only'];
    
    if (baseOptions.filter && typeof baseOptions.filter === 'string') {
      if (!validFilters.includes(baseOptions.filter)) {
        this.logger.warn(`Invalid execution history filter: ${baseOptions.filter}. Using default.`);
        baseOptions.filter = null;
      }
    }

    return baseOptions;
  }
}

module.exports = ExecutionHistoryResource;