/**
 * DebugAnalyzeExecution MCP Tool
 * Provides AI-powered analysis of execution flow and behavior
 * 
 * FACADE PATTERN: Wraps existing AnalysisService from Feature 014
 */

const BaseMCPTool = require('./BaseMCPTool');
const AnalysisService = require('../../ai/AnalysisService');

class DebugAnalyzeExecution extends BaseMCPTool {
  constructor(services, analysisService = null) {
    super(services);
    this.analysisService = analysisService;
  }

  getDefinition() {
    return {
      name: 'debug_analyze_execution',
      description: 'AI-powered analysis of execution flow, performance, and behavior patterns',
      inputSchema: {
        type: 'object',
        properties: {
          execution: {
            type: 'object',
            description: 'Execution context information',
            properties: {
              status: {
                type: 'string',
                description: 'Current execution status'
              },
              reason: {
                type: 'string',
                description: 'Reason for current state'
              },
              stack: {
                type: 'array',
                description: 'Call stack information',
                items: { type: 'object' }
              },
              breakpoint: {
                type: 'object',
                description: 'Current breakpoint information'
              }
            }
          },
          context: {
            type: 'object',
            description: 'Additional context',
            properties: {
              filename: { type: 'string' },
              line: { type: 'integer' },
              function: { type: 'string' },
              variables: { type: 'object' }
            },
            default: {}
          },
          expectedBehavior: {
            type: 'string',
            description: 'Expected execution behavior for comparison',
            default: ''
          },
          performanceMetrics: {
            type: 'object',
            description: 'Performance-related metrics',
            properties: {
              executionTime: { type: 'number' },
              memoryUsage: { type: 'number' },
              iterationCount: { type: 'integer' }
            },
            default: {}
          }
        },
        required: ['execution']
      }
    };
  }

  async execute(params) {
    const { 
      execution, 
      context = {}, 
      expectedBehavior = '',
      performanceMetrics = {}
    } = params;

    try {
      // Initialize AnalysisService if not already done
      if (!this.analysisService) {
        this.analysisService = new AnalysisService();
        await this.analysisService.initialize();
      }

      this.logger.info('Performing AI execution analysis', { 
        status: execution.status,
        stackDepth: execution.stack?.length || 0,
        filename: context.filename 
      });

      // Prepare context for execution analysis - FACADE PATTERN using existing service
      const analysisContext = {
        filename: context.filename || 'Unknown file',
        line: context.line || 0,
        function: context.function || 'Unknown function',
        variables: context.variables || {},
        execution: execution
      };

      // Use existing AnalysisService with execution analysis type
      const analysisResult = await this.analysisService.analyzeContext(
        analysisContext,
        {
          type: 'executionAnalysis',
          expectedBehavior: expectedBehavior,
          performanceMetrics: performanceMetrics
        }
      );

      // Enhance with execution-specific analysis
      const executionInsights = this.analyzeExecutionPatterns(execution, performanceMetrics);
      const allInsights = [...(analysisResult.insights || []), ...executionInsights];

      this.logger.info('Execution analysis completed successfully', { 
        insightCount: allInsights.length,
        confidence: analysisResult.confidence 
      });

      return this.formatResponse({
        execution: this.formatExecutionForResponse(execution),
        analysis: {
          insights: allInsights,
          confidence: analysisResult.confidence || 'medium',
          recommendations: analysisResult.recommendations || [],
          issues: this.identifyExecutionIssues(execution, performanceMetrics),
          summary: analysisResult.summary || 'Execution analysis completed',
          patterns: this.identifyExecutionPatterns(execution)
        },
        context: {
          filename: context.filename,
          line: context.line,
          function: context.function
        },
        performance: this.analyzePerformanceMetrics(performanceMetrics),
        metadata: {
          analysisTime: new Date().toISOString(),
          stackDepth: execution.stack?.length || 0,
          executionStatus: execution.status,
          serviceReady: this.analysisService.isReady()
        }
      });

    } catch (error) {
      this.logger.error('Failed to analyze execution', error);
      return this.formatErrorResponse(error, 'Failed to perform execution analysis');
    }
  }

  /**
   * Analyze execution patterns and flow
   * @param {Object} execution - Execution context
   * @param {Object} performanceMetrics - Performance data
   * @returns {Array} Execution insights
   */
  analyzeExecutionPatterns(execution, performanceMetrics) {
    const insights = [];

    // Stack depth analysis
    if (execution.stack && execution.stack.length > 10) {
      insights.push(`Deep call stack detected (${execution.stack.length} levels) - potential recursion or complex flow`);
    }

    // Status analysis
    if (execution.status === 'stopped' && execution.reason) {
      insights.push(`Execution stopped: ${execution.reason}`);
    }

    // Performance insights
    if (performanceMetrics.executionTime && performanceMetrics.executionTime > 1000) {
      insights.push(`Slow execution detected: ${performanceMetrics.executionTime}ms`);
    }

    if (performanceMetrics.iterationCount && performanceMetrics.iterationCount > 10000) {
      insights.push(`High iteration count: ${performanceMetrics.iterationCount} - check for infinite loops`);
    }

    return insights;
  }

  /**
   * Identify execution issues
   * @param {Object} execution - Execution context
   * @param {Object} performanceMetrics - Performance data
   * @returns {Array} Issues found
   */
  identifyExecutionIssues(execution, performanceMetrics) {
    const issues = [];

    if (execution.status === 'error') {
      issues.push(`Execution error state: ${execution.reason || 'Unknown error'}`);
    }

    if (!execution.stack || execution.stack.length === 0) {
      issues.push('No call stack information available');
    }

    if (performanceMetrics.memoryUsage && performanceMetrics.memoryUsage > 100 * 1024 * 1024) {
      issues.push(`High memory usage: ${Math.round(performanceMetrics.memoryUsage / 1024 / 1024)}MB`);
    }

    return issues;
  }

  /**
   * Identify execution patterns
   * @param {Object} execution - Execution context
   * @returns {Object} Pattern analysis
   */
  identifyExecutionPatterns(execution) {
    const patterns = {
      recursion: false,
      loops: false,
      exceptionHandling: false,
      asyncFlow: false
    };

    if (execution.stack && execution.stack.length > 0) {
      // Check for recursion (same function appearing multiple times)
      const functionNames = execution.stack.map(frame => frame.function || frame.name);
      const uniqueFunctions = [...new Set(functionNames)];
      patterns.recursion = functionNames.length > uniqueFunctions.length;

      // Check for exception handling
      patterns.exceptionHandling = execution.stack.some(frame => 
        frame.function?.includes('exception') || 
        frame.function?.includes('catch') ||
        frame.function?.includes('throw')
      );
    }

    if (execution.reason?.includes('loop') || execution.status === 'break') {
      patterns.loops = true;
    }

    return patterns;
  }

  /**
   * Analyze performance metrics
   * @param {Object} performanceMetrics - Performance data
   * @returns {Object} Performance analysis
   */
  analyzePerformanceMetrics(performanceMetrics) {
    if (!performanceMetrics || Object.keys(performanceMetrics).length === 0) {
      return { status: 'No performance data available' };
    }

    const analysis = {
      status: 'good',
      warnings: [],
      recommendations: []
    };

    if (performanceMetrics.executionTime > 5000) {
      analysis.status = 'slow';
      analysis.warnings.push('Very slow execution time');
      analysis.recommendations.push('Consider optimizing algorithm or breaking into smaller chunks');
    } else if (performanceMetrics.executionTime > 1000) {
      analysis.status = 'moderate';
      analysis.warnings.push('Moderate execution time');
    }

    if (performanceMetrics.memoryUsage > 50 * 1024 * 1024) {
      analysis.warnings.push('High memory usage detected');
      analysis.recommendations.push('Review memory allocation and consider cleanup');
    }

    return analysis;
  }

  /**
   * Format execution data for response
   * @param {Object} execution - Execution context
   * @returns {Object} Formatted execution data
   */
  formatExecutionForResponse(execution) {
    return {
      status: execution.status,
      reason: execution.reason,
      stackDepth: execution.stack?.length || 0,
      hasBreakpoint: !!execution.breakpoint,
      breakpointInfo: execution.breakpoint ? {
        id: execution.breakpoint.id,
        line: execution.breakpoint.line,
        condition: execution.breakpoint.condition
      } : null
    };
  }
}

module.exports = DebugAnalyzeExecution;