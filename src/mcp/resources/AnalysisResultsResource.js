/**
 * AnalysisResultsResource MCP Resource
 * Provides access to cached AI analysis results for debugging insights
 */

const BaseMCPResource = require('./BaseMCPResource');

class AnalysisResultsResource extends BaseMCPResource {
  constructor(services) {
    super(
      'ydebug://analysis-results',
      'Analysis Results',
      'Cached AI analysis results and debugging insights'
    );

    this.services = services;

    // Enable subscriptions with medium cache TTL (analysis results are semi-stable)
    this.enableSubscriptions();
    this.setCacheable(5000); // 5 second cache TTL

    // Internal analysis cache
    this.analysisCache = new Map();
    this.maxCacheSize = 100; // Limit cache size
    this.cacheStats = {
      totalAnalyses: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this.bindServiceEvents();
  }

  /**
   * Read analysis results data
   * @param {object} options - Read options
   * @returns {Promise<object>} Analysis results data
   */
  async read(options = {}) {
    const validatedOptions = this.validateReadOptions(options);

    try {
      // Apply filtering
      let filteredData = await this.getAnalysisResultsData(validatedOptions);
      if (validatedOptions.filter) {
        filteredData = this.applyAnalysisFilter(filteredData, validatedOptions.filter);
      }

      // Apply pagination to analysis results
      if (filteredData.results && (validatedOptions.limit || validatedOptions.offset)) {
        filteredData.results = this.applyPagination(
          filteredData.results,
          validatedOptions
        );
        filteredData.paginationApplied = true;
      }

      return {
        ...filteredData,
        timestamp: Date.now()
      };

    } catch (error) {
      throw this.formatError(error, 'Reading analysis results data');
    }
  }

  /**
   * Get comprehensive analysis results data
   * @param {object} options - Read options
   * @returns {Promise<object>} Analysis results data
   * @private
   */
  async getAnalysisResultsData(options) {
    const analysisService = this.services.get('analysis');

    // Get cached results from our internal cache
    const cachedResults = this.getCachedResults();

    // Get recent analysis results from the analysis service if available
    let serviceResults = [];
    if (analysisService && analysisService.getRecentAnalyses) {
      try {
        serviceResults = await analysisService.getRecentAnalyses(options.maxResults || 50);
      } catch (error) {
        this.logger.debug('Failed to get service analysis results', error);
      }
    }

    // Merge and deduplicate results
    const allResults = this.mergeAnalysisResults(cachedResults, serviceResults);

    // Build comprehensive analysis data
    return {
      results: allResults,
      summary: this.generateAnalysisSummary(allResults),
      insights: this.extractKeyInsights(allResults),
      patterns: this.analyzeAnalysisPatterns(allResults),
      statistics: this.calculateAnalysisStatistics(allResults),
      cacheInfo: {
        ...this.cacheStats,
        cacheSize: this.analysisCache.size,
        lastUpdate: this.getLastCacheUpdate()
      },
      lastRefresh: Date.now()
    };
  }

  /**
   * Get cached analysis results
   * @returns {Array} Cached analysis results
   * @private
   */
  getCachedResults() {
    const results = [];

    for (const [key, analysis] of this.analysisCache.entries()) {
      // Check if analysis is still valid (not expired)
      if (!this.isAnalysisExpired(analysis)) {
        results.push({
          id: key,
          ...analysis
        });
      } else {
        // Remove expired analysis
        this.analysisCache.delete(key);
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Merge analysis results from different sources
   * @param {Array} cachedResults - Our cached results
   * @param {Array} serviceResults - Service results
   * @returns {Array} Merged and deduplicated results
   * @private
   */
  mergeAnalysisResults(cachedResults, serviceResults) {
    const merged = [...cachedResults, ...serviceResults];

    // Remove duplicates based on context fingerprint
    const unique = merged.filter((result, index, array) => {
      return index === array.findIndex(r =>
        this.getAnalysisFingerprint(r) === this.getAnalysisFingerprint(result)
      );
    });

    // Sort by timestamp (most recent first)
    return unique.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate analysis summary
   * @param {Array} results - Analysis results
   * @returns {object} Summary data
   * @private
   */
  generateAnalysisSummary(results) {
    const summary = {
      totalAnalyses: results.length,
      analysisTypes: {},
      confidenceLevels: {},
      timeRange: {
        earliest: null,
        latest: null,
        duration: 0
      },
      mostAnalyzedContext: null,
      averageConfidence: 0,
      totalInsights: 0
    };

    if (results.length === 0) return summary;

    let totalConfidence = 0;
    let totalInsights = 0;
    const contextCounts = {};
    let earliestTime = Number.MAX_SAFE_INTEGER;
    let latestTime = 0;

    results.forEach(result => {
      // Analysis type counting
      const type = result.type || result.analysisType || 'unknown';
      summary.analysisTypes[type] = (summary.analysisTypes[type] || 0) + 1;

      // Confidence level tracking
      const confidence = result.confidence || 'unknown';
      summary.confidenceLevels[confidence] = (summary.confidenceLevels[confidence] || 0) + 1;

      // Time range tracking
      if (result.timestamp < earliestTime) earliestTime = result.timestamp;
      if (result.timestamp > latestTime) latestTime = result.timestamp;

      // Context tracking
      const contextKey = this.getContextKey(result.context);
      contextCounts[contextKey] = (contextCounts[contextKey] || 0) + 1;

      // Confidence calculation
      if (result.confidence && this.isNumericConfidence(result.confidence)) {
        totalConfidence += this.normalizeConfidence(result.confidence);
      }

      // Insights counting
      if (result.insights && Array.isArray(result.insights)) {
        totalInsights += result.insights.length;
      }
    });

    // Set calculated values
    summary.timeRange.earliest = earliestTime;
    summary.timeRange.latest = latestTime;
    summary.timeRange.duration = latestTime - earliestTime;
    summary.mostAnalyzedContext = this.getMostFrequent(contextCounts);
    summary.averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;
    summary.totalInsights = totalInsights;

    return summary;
  }

  /**
   * Extract key insights across all analyses
   * @param {Array} results - Analysis results
   * @returns {Array} Key insights
   * @private
   */
  extractKeyInsights(results) {
    const allInsights = [];
    const insightFrequency = {};

    results.forEach(result => {
      if (result.insights && Array.isArray(result.insights)) {
        result.insights.forEach(insight => {
          const normalizedInsight = this.normalizeInsight(insight);
          allInsights.push({
            insight: insight,
            normalized: normalizedInsight,
            analysisId: result.id,
            analysisType: result.type || result.analysisType,
            timestamp: result.timestamp,
            confidence: result.confidence
          });

          // Track frequency
          insightFrequency[normalizedInsight] = (insightFrequency[normalizedInsight] || 0) + 1;
        });
      }
    });

    // Return most recent and most frequent insights
    const recentInsights = allInsights
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    const frequentInsights = Object.entries(insightFrequency)
      .filter(([_insight, frequency]) => frequency > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([insight, frequency]) => ({ insight, frequency }));

    return {
      recent: recentInsights,
      frequent: frequentInsights,
      total: allInsights.length
    };
  }

  /**
   * Analyze patterns in analysis results
   * @param {Array} results - Analysis results
   * @returns {object} Pattern analysis
   * @private
   */
  analyzeAnalysisPatterns(results) {
    const patterns = {
      repeatingIssues: false,
      improvingConfidence: false,
      focusAreas: [],
      analysisFrequency: 'unknown',
      commonThemes: []
    };

    if (results.length < 3) return patterns;

    // Check for repeating issues
    const issuePatterns = {};
    results.forEach(result => {
      if (result.issues && Array.isArray(result.issues)) {
        result.issues.forEach(issue => {
          const pattern = this.extractIssuePattern(issue);
          issuePatterns[pattern] = (issuePatterns[pattern] || 0) + 1;
        });
      }
    });

    const repeatingIssueCount = Object.values(issuePatterns).filter(count => count > 2).length;
    patterns.repeatingIssues = repeatingIssueCount > 0;

    // Check confidence trends
    const confidenceValues = results
      .map(r => this.normalizeConfidence(r.confidence))
      .filter(c => c > 0);

    if (confidenceValues.length > 2) {
      const firstHalf = confidenceValues.slice(0, Math.floor(confidenceValues.length / 2));
      const secondHalf = confidenceValues.slice(Math.floor(confidenceValues.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      patterns.improvingConfidence = secondAvg > firstAvg;
    }

    // Identify focus areas
    const focusAreas = {};
    results.forEach(result => {
      const focus = result.focus || result.analysisType || 'general';
      focusAreas[focus] = (focusAreas[focus] || 0) + 1;
    });

    patterns.focusAreas = Object.entries(focusAreas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area, count]) => ({ area, count }));

    // Determine analysis frequency
    if (results.length > 0 && patterns.timeRange) {
      const timeSpan = (results[0].timestamp - results[results.length - 1].timestamp) / 1000 / 60; // minutes
      const analysesPerMinute = results.length / timeSpan;

      if (analysesPerMinute > 1) patterns.analysisFrequency = 'high';
      else if (analysesPerMinute > 0.1) patterns.analysisFrequency = 'moderate';
      else patterns.analysisFrequency = 'low';
    }

    // Extract common themes
    patterns.commonThemes = this.extractCommonThemes(results);

    return patterns;
  }

  /**
   * Calculate analysis statistics
   * @param {Array} results - Analysis results
   * @returns {object} Statistics
   * @private
   */
  calculateAnalysisStatistics(results) {
    const stats = {
      successRate: 0,
      averageInsightsPerAnalysis: 0,
      averageProcessingTime: 0,
      analysisTypeDistribution: {},
      confidenceDistribution: {},
      errorRate: 0
    };

    if (results.length === 0) return stats;

    let successCount = 0;
    let totalInsights = 0;
    let totalProcessingTime = 0;
    let processingTimeCount = 0;
    let errorCount = 0;

    results.forEach(result => {
      // Success tracking
      if (result.success !== false && !result.error) {
        successCount++;
      } else {
        errorCount++;
      }

      // Insights counting
      if (result.insights && Array.isArray(result.insights)) {
        totalInsights += result.insights.length;
      }

      // Processing time tracking
      if (result.processingTime && typeof result.processingTime === 'number') {
        totalProcessingTime += result.processingTime;
        processingTimeCount++;
      }

      // Type distribution
      const type = result.type || result.analysisType || 'unknown';
      stats.analysisTypeDistribution[type] = (stats.analysisTypeDistribution[type] || 0) + 1;

      // Confidence distribution
      const confidence = result.confidence || 'unknown';
      stats.confidenceDistribution[confidence] = (stats.confidenceDistribution[confidence] || 0) + 1;
    });

    // Calculate rates and averages
    stats.successRate = (successCount / results.length) * 100;
    stats.errorRate = (errorCount / results.length) * 100;
    stats.averageInsightsPerAnalysis = totalInsights / results.length;
    stats.averageProcessingTime = processingTimeCount > 0 ?
      totalProcessingTime / processingTimeCount : 0;

    return stats;
  }

  /**
   * Apply analysis-specific filtering
   * @param {object} data - Analysis results data
   * @param {string|object} filter - Filter criteria
   * @returns {object} Filtered data
   * @private
   */
  applyAnalysisFilter(data, filter) {
    if (typeof filter === 'string') {
      return this.applyPresetAnalysisFilter(data, filter);
    }

    if (typeof filter === 'object') {
      return this.applyCustomAnalysisFilter(data, filter);
    }

    return data;
  }

  /**
   * Apply preset analysis filter
   * @param {object} data - Analysis results data
   * @param {string} filterType - Preset filter type
   * @returns {object} Filtered data
   * @private
   */
  applyPresetAnalysisFilter(data, filterType) {
    let filteredResults = data.results;

    switch (filterType) {
    case 'high-confidence':
      filteredResults = data.results.filter(result =>
        this.normalizeConfidence(result.confidence) > 0.7);
      break;
    case 'recent': {
      // Last 24 hours
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      filteredResults = data.results.filter(result => result.timestamp > dayAgo);
      break;
    }
    case 'with-issues':
      filteredResults = data.results.filter(result =>
        result.issues && result.issues.length > 0);
      break;
    case 'variable-analysis':
      filteredResults = data.results.filter(result =>
        result.type === 'variableAnalysis' || result.analysisType === 'variableAnalysis');
      break;
    case 'execution-analysis':
      filteredResults = data.results.filter(result =>
        result.type === 'executionAnalysis' || result.analysisType === 'executionAnalysis');
      break;
    case 'errors-only':
      filteredResults = data.results.filter(result => result.error || result.success === false);
      break;
    case 'summary-only':
      return {
        summary: data.summary,
        patterns: data.patterns,
        statistics: data.statistics,
        cacheInfo: data.cacheInfo,
        timestamp: Date.now()
      };
    case 'insights-only':
      return {
        insights: data.insights,
        summary: data.summary,
        timestamp: Date.now()
      };
    default:
      break;
    }

    return {
      ...data,
      results: filteredResults,
      filterApplied: filterType,
      filteredCount: filteredResults.length
    };
  }

  /**
   * Apply custom analysis filter
   * @param {object} data - Analysis results data
   * @param {object} filter - Custom filter object
   * @returns {object} Filtered data
   * @private
   */
  applyCustomAnalysisFilter(data, filter) {
    let filteredResults = data.results;

    // Filter by analysis type
    if (filter.analysisType) {
      filteredResults = filteredResults.filter(result =>
        result.type === filter.analysisType || result.analysisType === filter.analysisType);
    }

    // Filter by confidence threshold
    if (filter.minConfidence !== undefined) {
      filteredResults = filteredResults.filter(result =>
        this.normalizeConfidence(result.confidence) >= filter.minConfidence);
    }

    // Filter by time range
    if (filter.startTime || filter.endTime) {
      const startTime = filter.startTime || 0;
      const endTime = filter.endTime || Date.now();
      filteredResults = filteredResults.filter(result =>
        result.timestamp >= startTime && result.timestamp <= endTime);
    }

    // Filter by context
    if (filter.context) {
      filteredResults = filteredResults.filter(result => {
        if (!result.context) return false;

        return Object.entries(filter.context).every(([key, value]) => {
          return result.context[key] === value;
        });
      });
    }

    return {
      ...data,
      results: filteredResults,
      filterApplied: 'custom',
      filteredCount: filteredResults.length,
      filterCriteria: filter
    };
  }

  /**
   * Cache analysis result
   * @param {object} analysisResult - Analysis result to cache
   * @private
   */
  cacheAnalysisResult(analysisResult) {
    const id = this.generateAnalysisId(analysisResult);
    const cacheEntry = {
      ...analysisResult,
      timestamp: Date.now(),
      cached: true,
      ttl: 30 * 60 * 1000 // 30 minutes TTL
    };

    this.analysisCache.set(id, cacheEntry);
    this.cacheStats.totalAnalyses++;

    // Maintain cache size limit
    if (this.analysisCache.size > this.maxCacheSize) {
      const oldestKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(oldestKey);
    }

    // Notify subscribers
    this.notifyUpdate({
      changeType: 'analysis_cached',
      analysisId: id,
      cacheSize: this.analysisCache.size
    });
  }

  /**
   * Bind to service events for analysis tracking
   * @private
   */
  bindServiceEvents() {
    if (this.services.has('analysis')) {
      const analysisService = this.services.get('analysis');

      analysisService.on('analysis:completed', (result) => {
        this.cacheAnalysisResult(result);
      });

      analysisService.on('analysis:failed', (error) => {
        this.recordAnalysisError(error);
      });
    }

    // Listen for MCP tool analysis events
    if (this.services.has('mcp')) {
      const mcpServer = this.services.get('mcp');
      if (mcpServer && mcpServer.on) {
        mcpServer.on('tool:executed', (data) => {
          if (this.isAnalysisTool(data.toolName) && data.result) {
            this.cacheAnalysisResult({
              type: data.toolName,
              result: data.result,
              context: data.params,
              toolExecution: true
            });
          }
        });
      }
    }
  }

  /**
   * Record analysis error
   * @param {object} error - Error information
   * @private
   */
  recordAnalysisError(error) {
    this.cacheStats.totalAnalyses++;

    this.notifyUpdate({
      changeType: 'analysis_error',
      error: error.message || String(error),
      timestamp: Date.now()
    });
  }

  /**
   * Helper methods
   */

  generateAnalysisId(analysis) {
    const fingerprint = this.getAnalysisFingerprint(analysis);
    return `analysis_${Date.now()}_${fingerprint.substring(0, 8)}`;
  }

  getAnalysisFingerprint(analysis) {
    const contextStr = JSON.stringify(analysis.context || {});
    const typeStr = analysis.type || analysis.analysisType || 'unknown';
    return Buffer.from(contextStr + typeStr).toString('base64').substring(0, 16);
  }

  isAnalysisExpired(analysis) {
    return analysis.ttl && (Date.now() - analysis.timestamp) > analysis.ttl;
  }

  getContextKey(context) {
    if (!context) return 'unknown';
    return `${context.filename || 'unknown'}:${context.line || 0}:${context.function || 'unknown'}`;
  }

  isNumericConfidence(confidence) {
    return typeof confidence === 'number' ||
           (typeof confidence === 'string' && !isNaN(parseFloat(confidence)));
  }

  normalizeConfidence(confidence) {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(1, confidence));
    }
    if (typeof confidence === 'string') {
      const numConfidence = parseFloat(confidence);
      if (!isNaN(numConfidence)) {
        return Math.max(0, Math.min(1, numConfidence));
      }

      // Convert string confidence levels
      switch (confidence.toLowerCase()) {
      case 'high': return 0.8;
      case 'medium': case 'moderate': return 0.6;
      case 'low': return 0.3;
      default: return 0;
      }
    }
    return 0;
  }

  normalizeInsight(insight) {
    if (typeof insight !== 'string') return String(insight);
    return insight.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }

  extractIssuePattern(issue) {
    if (typeof issue === 'string') return issue.substring(0, 50);
    if (issue.type) return issue.type;
    if (issue.description) return issue.description.substring(0, 50);
    return 'unknown';
  }

  extractCommonThemes(results) {
    const themes = {};

    results.forEach(result => {
      if (result.insights && Array.isArray(result.insights)) {
        result.insights.forEach(insight => {
          const words = this.extractKeywords(insight);
          words.forEach(word => {
            themes[word] = (themes[word] || 0) + 1;
          });
        });
      }
    });

    return Object.entries(themes)
      .filter(([_theme, count]) => count > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }));
  }

  extractKeywords(text) {
    if (typeof text !== 'string') return [];

    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];

    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5);
  }

  getMostFrequent(countObject) {
    if (Object.keys(countObject).length === 0) return null;

    return Object.entries(countObject).reduce((max, [key, count]) =>
      count > max.count ? { key, count } : max, { key: null, count: 0 }).key;
  }

  getLastCacheUpdate() {
    if (this.analysisCache.size === 0) return null;

    let latestTime = 0;
    for (const analysis of this.analysisCache.values()) {
      if (analysis.timestamp > latestTime) {
        latestTime = analysis.timestamp;
      }
    }

    return latestTime;
  }

  isAnalysisTool(toolName) {
    const analysisTools = [
      'debug_analyze_context',
      'debug_analyze_variables',
      'debug_analyze_execution',
      'debug_suggest_breakpoints',
      'debug_identify_issues',
      'debug_explain_behavior'
    ];

    return analysisTools.includes(toolName);
  }

  /**
   * Validate read options specific to analysis results resource
   */
  validateReadOptions(options) {
    const baseOptions = super.validateReadOptions(options);

    const validFilters = ['high-confidence', 'recent', 'with-issues', 'variable-analysis', 'execution-analysis', 'errors-only', 'summary-only', 'insights-only'];

    if (baseOptions.filter && typeof baseOptions.filter === 'string') {
      if (!validFilters.includes(baseOptions.filter)) {
        this.logger.warn(`Invalid analysis results filter: ${baseOptions.filter}. Using default.`);
        baseOptions.filter = null;
      }
    }

    // Add analysis-specific options
    baseOptions.maxResults = options.maxResults || 50;

    return baseOptions;
  }
}

module.exports = AnalysisResultsResource;
