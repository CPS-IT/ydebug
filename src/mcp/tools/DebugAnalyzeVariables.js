/**
 * DebugAnalyzeVariables MCP Tool
 * Provides AI-powered analysis of variable states and values
 * 
 * FACADE PATTERN: Wraps existing AnalysisService from Feature 014
 */

const BaseMCPTool = require('./BaseMCPTool');
const AnalysisService = require('../../ai/AnalysisService');

class DebugAnalyzeVariables extends BaseMCPTool {
  constructor(services, analysisService = null) {
    super(services);
    this.analysisService = analysisService;
  }

  getDefinition() {
    return {
      name: 'debug_analyze_variables',
      description: 'AI-powered analysis focused on variable states, types, and values',
      inputSchema: {
        type: 'object',
        properties: {
          variables: {
            type: 'object',
            description: 'Variable data to analyze',
            additionalProperties: true
          },
          context: {
            type: 'object',
            description: 'Additional context information',
            properties: {
              filename: {
                type: 'string',
                description: 'Current file being debugged'
              },
              line: {
                type: 'integer',
                description: 'Current line number'
              },
              function: {
                type: 'string',
                description: 'Current function/method name'
              },
              scope: {
                type: 'string',
                description: 'Variable scope (local, global, class)',
                default: 'local'
              }
            },
            default: {}
          },
          focus: {
            type: 'string',
            description: 'Specific aspect to focus on (types, values, nulls, performance)',
            enum: ['types', 'values', 'nulls', 'performance', 'security', 'general'],
            default: 'general'
          },
          expectedValues: {
            type: 'object',
            description: 'Expected variable values for comparison',
            additionalProperties: true,
            default: {}
          }
        },
        required: ['variables']
      }
    };
  }

  async execute(params) {
    const { 
      variables, 
      context = {}, 
      focus = 'general',
      expectedValues = {}
    } = params;

    try {
      // Initialize AnalysisService if not already done
      if (!this.analysisService) {
        this.analysisService = new AnalysisService();
        await this.analysisService.initialize();
      }

      this.logger.info('Performing AI variable analysis', { 
        focus,
        variableCount: Object.keys(variables).length,
        filename: context.filename,
        scope: context.scope 
      });

      // Prepare context for analysis - FACADE PATTERN using existing service
      const analysisContext = {
        filename: context.filename || 'Unknown file',
        line: context.line || 0,
        function: context.function || 'Unknown function',
        variables: variables,
        execution: {
          status: 'break',
          reason: 'variable-analysis',
          scope: context.scope || 'local'
        }
      };

      // Use existing AnalysisService with variable analysis type
      const analysisResult = await this.analysisService.analyzeContext(
        analysisContext,
        {
          type: 'variableAnalysis',
          focus: focus,
          expectedValues: expectedValues
        }
      );

      // Extract variable-specific insights
      const variableInsights = this.extractVariableInsights(
        analysisResult, 
        variables, 
        expectedValues,
        focus
      );

      this.logger.info('Variable analysis completed successfully', { 
        focus,
        insightCount: variableInsights.length,
        confidence: analysisResult.confidence 
      });

      return this.formatResponse({
        variables: this.formatVariablesForResponse(variables),
        analysis: {
          insights: variableInsights,
          confidence: analysisResult.confidence || 'medium',
          focus: focus,
          recommendations: analysisResult.recommendations || [],
          issues: this.identifyVariableIssues(variables, expectedValues),
          summary: analysisResult.summary || 'Variable analysis completed'
        },
        context: {
          filename: context.filename,
          line: context.line,
          function: context.function,
          scope: context.scope
        },
        metadata: {
          analysisTime: new Date().toISOString(),
          variableCount: Object.keys(variables).length,
          focusArea: focus,
          serviceReady: this.analysisService.isReady()
        }
      });

    } catch (error) {
      this.logger.error('Failed to analyze variables', error);
      return this.formatErrorResponse(error, 'Failed to perform variable analysis');
    }
  }

  /**
   * Extract variable-specific insights from analysis result
   * @param {Object} analysisResult - AI analysis result
   * @param {Object} variables - Variable data
   * @param {Object} expectedValues - Expected values
   * @param {string} focus - Analysis focus
   * @returns {Array} Variable insights
   */
  extractVariableInsights(analysisResult, variables, expectedValues, focus) {
    const insights = analysisResult.insights || [];
    const variableInsights = [];

    // Add focus-specific insights
    switch (focus) {
    case 'nulls':
      variableInsights.push(...this.analyzeNullValues(variables));
      break;
    case 'types':
      variableInsights.push(...this.analyzeTypes(variables, expectedValues));
      break;
    case 'values':
      variableInsights.push(...this.analyzeValues(variables, expectedValues));
      break;
    case 'performance':
      variableInsights.push(...this.analyzePerformance(variables));
      break;
    case 'security':
      variableInsights.push(...this.analyzeSecurity(variables));
      break;
    default:
      // General analysis - include all insights from AI
      variableInsights.push(...insights);
    }

    return variableInsights;
  }

  /**
   * Analyze null values in variables
   * @param {Object} variables - Variable data
   * @returns {Array} Null analysis insights
   */
  analyzeNullValues(variables) {
    const insights = [];
    const nullVars = Object.entries(variables).filter(([, value]) => 
      value === null || value === undefined
    );

    if (nullVars.length > 0) {
      insights.push(
        `Found ${nullVars.length} null/undefined variables: ${nullVars.map(([name]) => name).join(', ')}`
      );
    }

    return insights;
  }

  /**
   * Analyze variable types
   * @param {Object} variables - Variable data
   * @param {Object} expectedValues - Expected values
   * @returns {Array} Type analysis insights
   */
  analyzeTypes(variables, expectedValues) {
    const insights = [];
    const typeMap = {};

    Object.entries(variables).forEach(([name, value]) => {
      const actualType = typeof value;
      typeMap[actualType] = (typeMap[actualType] || 0) + 1;

      if (expectedValues[name] !== undefined) {
        const expectedType = typeof expectedValues[name];
        if (actualType !== expectedType) {
          insights.push(
            `Type mismatch for ${name}: expected ${expectedType}, got ${actualType}`
          );
        }
      }
    });

    if (Object.keys(typeMap).length > 0) {
      insights.push(
        `Variable types: ${Object.entries(typeMap)
          .map(([type, count]) => `${type}(${count})`)
          .join(', ')}`
      );
    }

    return insights;
  }

  /**
   * Analyze variable values
   * @param {Object} variables - Variable data
   * @param {Object} expectedValues - Expected values
   * @returns {Array} Value analysis insights
   */
  analyzeValues(variables, expectedValues) {
    const insights = [];

    Object.entries(expectedValues).forEach(([name, expectedValue]) => {
      if (Object.prototype.hasOwnProperty.call(variables, name)) {
        const actualValue = variables[name];
        if (actualValue !== expectedValue) {
          insights.push(
            `Value mismatch for ${name}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
          );
        }
      } else {
        insights.push(`Expected variable ${name} is missing`);
      }
    });

    return insights;
  }

  /**
   * Analyze performance implications
   * @param {Object} variables - Variable data
   * @returns {Array} Performance insights
   */
  analyzePerformance(variables) {
    const insights = [];

    Object.entries(variables).forEach(([name, value]) => {
      if (Array.isArray(value) && value.length > 1000) {
        insights.push(`Large array ${name} (${value.length} items) may impact performance`);
      }
      if (typeof value === 'string' && value.length > 10000) {
        insights.push(`Large string ${name} (${value.length} chars) may impact memory usage`);
      }
    });

    return insights;
  }

  /**
   * Analyze security implications
   * @param {Object} variables - Variable data
   * @returns {Array} Security insights
   */
  analyzeSecurity(variables) {
    const insights = [];
    const sensitivePatterns = ['password', 'token', 'key', 'secret', 'auth'];

    Object.entries(variables).forEach(([name, value]) => {
      const lowerName = name.toLowerCase();
      if (sensitivePatterns.some(pattern => lowerName.includes(pattern))) {
        if (typeof value === 'string' && value.length > 0) {
          insights.push(`Potentially sensitive data in ${name} - ensure proper handling`);
        }
      }
    });

    return insights;
  }

  /**
   * Identify common variable issues
   * @param {Object} variables - Variable data
   * @param {Object} expectedValues - Expected values
   * @returns {Array} Identified issues
   */
  identifyVariableIssues(variables, _expectedValues) {
    const issues = [];

    // Check for common issues
    Object.entries(variables).forEach(([name, value]) => {
      if (value === null || value === undefined) {
        issues.push(`Null/undefined value: ${name}`);
      }
      if (typeof value === 'number' && !isFinite(value)) {
        issues.push(`Invalid number: ${name} = ${value}`);
      }
      if (Array.isArray(value) && value.length === 0) {
        issues.push(`Empty array: ${name}`);
      }
    });

    return issues;
  }

  /**
   * Format variables for response
   * @param {Object} variables - Variable data
   * @returns {Object} Formatted variables
   */
  formatVariablesForResponse(variables) {
    const formatted = {};
    
    Object.entries(variables).forEach(([name, value]) => {
      formatted[name] = {
        value: value,
        type: typeof value,
        isNull: value === null || value === undefined,
        isEmpty: this.isEmpty(value),
        size: this.getSize(value)
      };
    });

    return formatted;
  }

  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {boolean} Is empty
   */
  isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Get size of value
   * @param {*} value - Value to measure
   * @returns {number|string} Size
   */
  getSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return Object.keys(value).length;
    return 'n/a';
  }
}

module.exports = DebugAnalyzeVariables;