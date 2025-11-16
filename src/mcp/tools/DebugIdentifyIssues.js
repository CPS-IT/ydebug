/**
 * DebugIdentifyIssues MCP Tool
 * Provides AI-powered identification of potential code issues and problems
 * 
 * FACADE PATTERN: Wraps existing AnalysisService from Feature 014
 */

const BaseMCPTool = require('./BaseMCPTool');
const AnalysisService = require('../../ai/AnalysisService');

class DebugIdentifyIssues extends BaseMCPTool {
  constructor(services, analysisService = null) {
    super(services);
    this.analysisService = analysisService;
  }

  getDefinition() {
    return {
      name: 'debug_identify_issues',
      description: 'AI-powered identification of potential bugs, logic errors, and code issues',
      inputSchema: {
        type: 'object',
        properties: {
          context: {
            type: 'object',
            description: 'Current debugging context',
            properties: {
              filename: { type: 'string' },
              line: { type: 'integer' },
              function: { type: 'string' },
              variables: { type: 'object' },
              execution: { type: 'object' }
            },
            default: {}
          },
          code: {
            type: 'string',
            description: 'Source code to analyze for issues'
          },
          symptoms: {
            type: 'string',
            description: 'Observed symptoms or unexpected behavior',
            default: ''
          },
          errorMessages: {
            type: 'array',
            description: 'Error messages or exceptions encountered',
            items: { type: 'string' },
            default: []
          },
          issueTypes: {
            type: 'array',
            description: 'Types of issues to focus on',
            items: {
              type: 'string',
              enum: ['logic-errors', 'null-pointer', 'type-errors', 'performance', 'security', 'all']
            },
            default: ['all']
          }
        },
        required: ['context']
      }
    };
  }

  async execute(params) {
    const { 
      context, 
      code = '',
      symptoms = '',
      errorMessages = [],
      issueTypes = ['all']
    } = params;

    try {
      // Initialize AnalysisService if not already done
      if (!this.analysisService) {
        this.analysisService = new AnalysisService();
        await this.analysisService.initialize();
      }

      this.logger.info('Identifying potential issues', { 
        filename: context.filename,
        hasCode: !!code,
        symptomLength: symptoms.length,
        errorCount: errorMessages.length 
      });

      // Prepare context for analysis - FACADE PATTERN using existing service
      const analysisContext = {
        filename: context.filename || 'Unknown file',
        line: context.line || 0,
        function: context.function || 'Unknown function',
        variables: context.variables || {},
        execution: context.execution || { status: 'unknown' }
      };

      // Use existing AnalysisService for issue identification
      const analysisResult = await this.analysisService.analyzeContext(
        analysisContext,
        {
          type: 'variableAnalysis', // Use variable analysis as base
          symptoms: symptoms,
          errorMessages: errorMessages,
          code: code
        }
      );

      // Identify specific issues based on context and patterns
      const identifiedIssues = this.identifySpecificIssues(
        context,
        code,
        symptoms,
        errorMessages,
        issueTypes
      );

      // Combine AI insights with pattern-based issue detection
      const allIssues = this.mergeIssues(analysisResult, identifiedIssues);

      this.logger.info('Issue identification completed', { 
        issueCount: allIssues.length,
        confidence: analysisResult.confidence 
      });

      return this.formatResponse({
        issues: allIssues,
        analysis: {
          insights: analysisResult.insights || [],
          confidence: analysisResult.confidence || 'medium',
          recommendations: this.generateRecommendations(allIssues),
          summary: `Identified ${allIssues.length} potential issues`,
          priority: this.prioritizeIssues(allIssues)
        },
        context: {
          filename: context.filename,
          line: context.line,
          function: context.function,
          hasExecution: !!context.execution
        },
        symptoms: {
          description: symptoms,
          errorMessages: errorMessages,
          hasCode: !!code
        },
        metadata: {
          analysisTime: new Date().toISOString(),
          focusTypes: issueTypes,
          serviceReady: this.analysisService.isReady()
        }
      });

    } catch (error) {
      this.logger.error('Failed to identify issues', error);
      return this.formatErrorResponse(error, 'Failed to identify issues');
    }
  }

  /**
   * Identify specific issues based on patterns and context
   * @param {Object} context - Debugging context
   * @param {string} code - Source code
   * @param {string} symptoms - Symptoms description
   * @param {Array} errorMessages - Error messages
   * @param {Array} issueTypes - Issue types to focus on
   * @returns {Array} Identified issues
   */
  identifySpecificIssues(context, code, symptoms, errorMessages, issueTypes) {
    const issues = [];

    // Variable-based issues
    if (context.variables) {
      issues.push(...this.identifyVariableIssues(context.variables));
    }

    // Code pattern issues
    if (code) {
      issues.push(...this.identifyCodePatternIssues(code));
    }

    // Error message analysis
    if (errorMessages.length > 0) {
      issues.push(...this.analyzeErrorMessages(errorMessages));
    }

    // Execution context issues
    if (context.execution) {
      issues.push(...this.identifyExecutionIssues(context.execution));
    }

    // Filter by requested issue types
    return this.filterIssuesByType(issues, issueTypes);
  }

  /**
   * Identify issues in variables
   * @param {Object} variables - Variable data
   * @returns {Array} Variable issues
   */
  identifyVariableIssues(variables) {
    const issues = [];

    Object.entries(variables).forEach(([name, value]) => {
      // Null/undefined issues
      if (value === null || value === undefined) {
        issues.push({
          type: 'null-pointer',
          severity: 'high',
          description: `Variable '${name}' is ${value === null ? 'null' : 'undefined'}`,
          suggestion: `Check if '${name}' should have a value at this point`,
          location: 'variable',
          variable: name
        });
      }

      // Type consistency issues
      if (typeof value === 'number' && !isFinite(value)) {
        issues.push({
          type: 'type-errors',
          severity: 'high',
          description: `Variable '${name}' contains invalid number: ${value}`,
          suggestion: `Validate numeric input for '${name}'`,
          location: 'variable',
          variable: name
        });
      }

      // Empty array/object that might be unexpected
      if ((Array.isArray(value) && value.length === 0) || 
          (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
        issues.push({
          type: 'logic-errors',
          severity: 'medium',
          description: `Variable '${name}' is empty ${Array.isArray(value) ? 'array' : 'object'}`,
          suggestion: `Verify if empty ${Array.isArray(value) ? 'array' : 'object'} is expected for '${name}'`,
          location: 'variable',
          variable: name
        });
      }
    });

    return issues;
  }

  /**
   * Identify issues in code patterns
   * @param {string} code - Source code
   * @returns {Array} Code pattern issues
   */
  identifyCodePatternIssues(code) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      // Assignment in conditional (potential typo)
      if ((trimmed.includes('if (') || trimmed.includes('while (')) && 
          trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('!=')) {
        issues.push({
          type: 'logic-errors',
          severity: 'high',
          description: `Possible assignment instead of comparison in conditional at line ${lineNumber}`,
          suggestion: 'Check if you meant to use == or === instead of =',
          location: 'code',
          line: lineNumber,
          code: trimmed
        });
      }

      // Unreachable code after return
      if (trimmed === 'return;' || trimmed.startsWith('return ')) {
        if (index < lines.length - 1 && lines[index + 1].trim() && 
            !lines[index + 1].trim().startsWith('}') && 
            !lines[index + 1].trim().startsWith('//')) {
          issues.push({
            type: 'logic-errors',
            severity: 'medium',
            description: `Potentially unreachable code after return at line ${lineNumber}`,
            suggestion: 'Remove unreachable code or restructure logic',
            location: 'code',
            line: lineNumber + 1
          });
        }
      }

      // Missing null checks before array/object access
      if (trimmed.includes('[') && trimmed.includes(']') && 
          !trimmed.includes('isset(') && !trimmed.includes('!empty(')) {
        const variable = trimmed.match(/(\$\w+)\[/);
        if (variable) {
          issues.push({
            type: 'null-pointer',
            severity: 'medium',
            description: `Array access without null check at line ${lineNumber}`,
            suggestion: `Check if ${variable[1]} is set before accessing array elements`,
            location: 'code',
            line: lineNumber,
            variable: variable[1]
          });
        }
      }
    });

    return issues;
  }

  /**
   * Analyze error messages for patterns
   * @param {Array} errorMessages - Error messages
   * @returns {Array} Issues from error analysis
   */
  analyzeErrorMessages(errorMessages) {
    const issues = [];

    errorMessages.forEach((error, index) => {
      const errorLower = error.toLowerCase();

      // Null pointer/undefined issues
      if (errorLower.includes('null') || errorLower.includes('undefined')) {
        issues.push({
          type: 'null-pointer',
          severity: 'high',
          description: `Null/undefined error detected: ${error}`,
          suggestion: 'Add null checks before using variables',
          location: 'error',
          errorIndex: index,
          originalError: error
        });
      }

      // Type errors
      if (errorLower.includes('type') || errorLower.includes('expects')) {
        issues.push({
          type: 'type-errors',
          severity: 'high',
          description: `Type mismatch error: ${error}`,
          suggestion: 'Verify variable types match function expectations',
          location: 'error',
          errorIndex: index,
          originalError: error
        });
      }

      // Array/index issues
      if (errorLower.includes('index') || errorLower.includes('offset')) {
        issues.push({
          type: 'logic-errors',
          severity: 'medium',
          description: `Array index error: ${error}`,
          suggestion: 'Check array bounds and index calculations',
          location: 'error',
          errorIndex: index,
          originalError: error
        });
      }
    });

    return issues;
  }

  /**
   * Identify execution context issues
   * @param {Object} execution - Execution context
   * @returns {Array} Execution issues
   */
  identifyExecutionIssues(execution) {
    const issues = [];

    if (execution.status === 'error') {
      issues.push({
        type: 'logic-errors',
        severity: 'high',
        description: `Execution in error state: ${execution.reason || 'Unknown error'}`,
        suggestion: 'Review execution flow and error handling',
        location: 'execution',
        status: execution.status
      });
    }

    // Deep recursion warning
    if (execution.stack && execution.stack.length > 100) {
      issues.push({
        type: 'performance',
        severity: 'high',
        description: `Very deep call stack (${execution.stack.length} levels) - possible infinite recursion`,
        suggestion: 'Check for recursive functions without proper termination conditions',
        location: 'execution',
        stackDepth: execution.stack.length
      });
    }

    return issues;
  }

  /**
   * Filter issues by requested types
   * @param {Array} issues - All issues
   * @param {Array} issueTypes - Requested types
   * @returns {Array} Filtered issues
   */
  filterIssuesByType(issues, issueTypes) {
    if (issueTypes.includes('all')) {
      return issues;
    }

    return issues.filter(issue => issueTypes.includes(issue.type));
  }

  /**
   * Merge AI analysis results with pattern-based issues
   * @param {Object} analysisResult - AI analysis
   * @param {Array} patternIssues - Pattern-based issues
   * @returns {Array} Combined issues
   */
  mergeIssues(analysisResult, patternIssues) {
    const aiIssues = (analysisResult.insights || []).map(insight => ({
      type: 'ai-insight',
      severity: 'medium',
      description: insight,
      suggestion: 'Consider the AI analysis insight',
      location: 'ai',
      confidence: analysisResult.confidence
    }));

    return [...patternIssues, ...aiIssues];
  }

  /**
   * Generate recommendations based on identified issues
   * @param {Array} issues - Identified issues
   * @returns {Array} Recommendations
   */
  generateRecommendations(issues) {
    const recommendations = [];
    const typeGroups = {};

    // Group issues by type
    issues.forEach(issue => {
      if (!typeGroups[issue.type]) {
        typeGroups[issue.type] = [];
      }
      typeGroups[issue.type].push(issue);
    });

    // Generate type-specific recommendations
    Object.entries(typeGroups).forEach(([type, typeIssues]) => {
      switch (type) {
      case 'null-pointer':
        recommendations.push(`Add null/undefined checks for ${typeIssues.length} variables`);
        break;
      case 'type-errors':
        recommendations.push(`Implement type validation for ${typeIssues.length} variables`);
        break;
      case 'logic-errors':
        recommendations.push(`Review logic flow - ${typeIssues.length} potential logic issues found`);
        break;
      case 'performance':
        recommendations.push(`Optimize performance - ${typeIssues.length} performance issues identified`);
        break;
      case 'security':
        recommendations.push(`Address security concerns - ${typeIssues.length} security issues found`);
        break;
      }
    });

    return recommendations;
  }

  /**
   * Prioritize issues by severity
   * @param {Array} issues - Issues to prioritize
   * @returns {Object} Priority summary
   */
  prioritizeIssues(issues) {
    const priority = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };

    priority.nextAction = priority.critical > 0 ? 'Address critical issues immediately' :
                         priority.high > 0 ? 'Focus on high-severity issues first' :
                         priority.medium > 0 ? 'Review medium-priority issues' :
                         'No urgent issues found';

    return priority;
  }
}

module.exports = DebugIdentifyIssues;