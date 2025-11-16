/**
 * DebugSuggestBreakpoints MCP Tool
 * Provides AI-powered suggestions for optimal breakpoint placement
 * 
 * FACADE PATTERN: Wraps existing AnalysisService from Feature 014
 */

const BaseMCPTool = require('./BaseMCPTool');
const AnalysisService = require('../../ai/AnalysisService');

class DebugSuggestBreakpoints extends BaseMCPTool {
  constructor(services, analysisService = null) {
    super(services);
    this.analysisService = analysisService;
  }

  getDefinition() {
    return {
      name: 'debug_suggest_breakpoints',
      description: 'AI-powered suggestions for strategic breakpoint placement',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Source code to analyze for breakpoint suggestions'
          },
          context: {
            type: 'object',
            description: 'Context information',
            properties: {
              filename: { type: 'string' },
              function: { type: 'string' },
              startLine: { type: 'integer', default: 1 },
              endLine: { type: 'integer' }
            },
            default: {}
          },
          problemDescription: {
            type: 'string',
            description: 'Description of the issue being debugged',
            default: ''
          },
          existingBreakpoints: {
            type: 'array',
            description: 'Currently set breakpoints',
            items: {
              type: 'object',
              properties: {
                line: { type: 'integer' },
                condition: { type: 'string' }
              }
            },
            default: []
          },
          debuggingGoal: {
            type: 'string',
            description: 'What you want to achieve with debugging',
            enum: ['trace-execution', 'find-bug', 'understand-flow', 'performance-analysis'],
            default: 'find-bug'
          }
        },
        required: ['code']
      }
    };
  }

  async execute(params) {
    const { 
      code, 
      context = {}, 
      problemDescription = '',
      existingBreakpoints = [],
      debuggingGoal = 'find-bug'
    } = params;

    try {
      // Initialize AnalysisService if not already done
      if (!this.analysisService) {
        this.analysisService = new AnalysisService();
        await this.analysisService.initialize();
      }

      this.logger.info('Generating breakpoint suggestions', { 
        codeLength: code.length,
        goal: debuggingGoal,
        existingCount: existingBreakpoints.length 
      });

      // Prepare context for analysis - FACADE PATTERN using existing service
      const analysisContext = {
        filename: context.filename || 'code.php',
        line: context.startLine || 1,
        function: context.function || 'Unknown',
        variables: {},
        execution: {
          status: 'break',
          reason: 'breakpoint-analysis',
          code: code
        }
      };

      // Use existing AnalysisService for code analysis
      const analysisResult = await this.analysisService.analyzeContext(
        analysisContext,
        {
          type: 'executionAnalysis',
          problemDescription: problemDescription,
          debuggingGoal: debuggingGoal,
          code: code
        }
      );

      // Generate strategic breakpoint suggestions
      const suggestions = this.generateBreakpointSuggestions(
        code, 
        context, 
        debuggingGoal, 
        existingBreakpoints,
        problemDescription
      );

      // Filter and prioritize suggestions based on AI analysis
      const prioritizedSuggestions = this.prioritizeSuggestions(suggestions, analysisResult);

      this.logger.info('Breakpoint suggestions generated', { 
        suggestionCount: prioritizedSuggestions.length,
        goal: debuggingGoal 
      });

      return this.formatResponse({
        suggestions: prioritizedSuggestions,
        analysis: {
          insights: analysisResult.insights || [],
          confidence: analysisResult.confidence || 'medium',
          recommendations: analysisResult.recommendations || [],
          summary: `Generated ${prioritizedSuggestions.length} breakpoint suggestions for ${debuggingGoal}`,
          goal: debuggingGoal
        },
        context: {
          filename: context.filename,
          function: context.function,
          codeRange: {
            start: context.startLine || 1,
            end: context.endLine || this.countLines(code)
          }
        },
        existing: {
          breakpoints: existingBreakpoints,
          count: existingBreakpoints.length
        },
        metadata: {
          analysisTime: new Date().toISOString(),
          codeLength: code.length,
          debuggingGoal: debuggingGoal,
          serviceReady: this.analysisService.isReady()
        }
      });

    } catch (error) {
      this.logger.error('Failed to generate breakpoint suggestions', error);
      return this.formatErrorResponse(error, 'Failed to generate breakpoint suggestions');
    }
  }

  /**
   * Generate strategic breakpoint suggestions
   * @param {string} code - Source code
   * @param {Object} context - Context information
   * @param {string} goal - Debugging goal
   * @param {Array} existing - Existing breakpoints
   * @param {string} problemDescription - Problem description
   * @returns {Array} Breakpoint suggestions
   */
  generateBreakpointSuggestions(code, context, goal, existing, problemDescription) {
    const lines = code.split('\n');
    const suggestions = [];
    const existingLines = new Set(existing.map(bp => bp.line));

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Skip if breakpoint already exists
      if (existingLines.has(lineNumber)) return;

      const suggestion = this.analyzeLineForBreakpoint(line, lineNumber, goal, problemDescription);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    return suggestions;
  }

  /**
   * Analyze a line for breakpoint potential
   * @param {string} line - Code line
   * @param {number} lineNumber - Line number
   * @param {string} goal - Debugging goal
   * @param {string} problemDescription - Problem description
   * @returns {Object|null} Suggestion or null
   */
  analyzeLineForBreakpoint(line, lineNumber, goal, problemDescription) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return null;
    }

    const suggestion = {
      line: lineNumber,
      code: trimmedLine,
      reason: '',
      priority: 'low',
      type: 'standard',
      condition: null
    };

    // Goal-specific analysis
    switch (goal) {
    case 'trace-execution':
      return this.analyzeForTraceExecution(suggestion, trimmedLine);
    case 'find-bug':
      return this.analyzeForBugFinding(suggestion, trimmedLine, problemDescription);
    case 'understand-flow':
      return this.analyzeForFlowUnderstanding(suggestion, trimmedLine);
    case 'performance-analysis':
      return this.analyzeForPerformance(suggestion, trimmedLine);
    default:
      return this.analyzeGeneral(suggestion, trimmedLine);
    }
  }

  /**
   * Analyze line for trace execution
   */
  analyzeForTraceExecution(suggestion, line) {
    if (line.includes('function ') || line.includes('public function') || line.includes('private function')) {
      suggestion.reason = 'Function entry point - good for tracing execution flow';
      suggestion.priority = 'high';
      suggestion.type = 'function-entry';
      return suggestion;
    }

    if (line.includes('return ')) {
      suggestion.reason = 'Function exit point - trace return values';
      suggestion.priority = 'medium';
      suggestion.type = 'return';
      return suggestion;
    }

    return null;
  }

  /**
   * Analyze line for bug finding
   */
  analyzeForBugFinding(suggestion, line, _problemDescription) {
    // Variable assignments
    if (line.includes('=') && !line.includes('==') && !line.includes('!=')) {
      suggestion.reason = 'Variable assignment - check values being set';
      suggestion.priority = 'medium';
      suggestion.type = 'assignment';
      return suggestion;
    }

    // Conditional statements
    if (line.includes('if (') || line.includes('elseif (') || line.includes('while (')) {
      suggestion.reason = 'Conditional statement - verify logic flow';
      suggestion.priority = 'high';
      suggestion.type = 'conditional';
      return suggestion;
    }

    // Array/object access
    if (line.includes('[') && line.includes(']')) {
      suggestion.reason = 'Array/object access - potential null or undefined issues';
      suggestion.priority = 'high';
      suggestion.type = 'array-access';
      return suggestion;
    }

    // Function calls
    if (line.includes('(') && line.includes(')') && !line.startsWith('if') && !line.startsWith('while')) {
      suggestion.reason = 'Function call - check parameters and return values';
      suggestion.priority = 'medium';
      suggestion.type = 'function-call';
      return suggestion;
    }

    return null;
  }

  /**
   * Analyze line for flow understanding
   */
  analyzeForFlowUnderstanding(suggestion, line) {
    // Control flow
    if (line.includes('for (') || line.includes('foreach (')) {
      suggestion.reason = 'Loop start - understand iteration behavior';
      suggestion.priority = 'high';
      suggestion.type = 'loop';
      return suggestion;
    }

    // Switch statements
    if (line.includes('switch (') || line.includes('case ')) {
      suggestion.reason = 'Switch logic - trace different execution paths';
      suggestion.priority = 'medium';
      suggestion.type = 'switch';
      return suggestion;
    }

    return null;
  }

  /**
   * Analyze line for performance analysis
   */
  analyzeForPerformance(suggestion, line) {
    // Database queries
    if (line.includes('query') || line.includes('SELECT') || line.includes('INSERT')) {
      suggestion.reason = 'Database operation - measure query performance';
      suggestion.priority = 'high';
      suggestion.type = 'database';
      return suggestion;
    }

    // File operations
    if (line.includes('file_get_contents') || line.includes('fopen') || line.includes('curl_exec')) {
      suggestion.reason = 'I/O operation - measure file/network performance';
      suggestion.priority = 'high';
      suggestion.type = 'io';
      return suggestion;
    }

    // Loops (performance bottlenecks)
    if (line.includes('for (') || line.includes('while (')) {
      suggestion.reason = 'Loop - potential performance bottleneck';
      suggestion.priority = 'medium';
      suggestion.type = 'loop';
      return suggestion;
    }

    return null;
  }

  /**
   * General analysis for any debugging goal
   */
  analyzeGeneral(suggestion, line) {
    // Exception handling
    if (line.includes('try {') || line.includes('catch (')) {
      suggestion.reason = 'Exception handling - monitor error conditions';
      suggestion.priority = 'medium';
      suggestion.type = 'exception';
      return suggestion;
    }

    return null;
  }

  /**
   * Prioritize suggestions based on AI analysis
   * @param {Array} suggestions - Raw suggestions
   * @param {Object} analysisResult - AI analysis result
   * @returns {Array} Prioritized suggestions
   */
  prioritizeSuggestions(suggestions, analysisResult) {
    // Sort by priority and add AI insights
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return suggestions
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 10) // Limit to top 10 suggestions
      .map(suggestion => ({
        ...suggestion,
        aiConfidence: analysisResult.confidence || 'medium',
        relatedInsights: this.findRelatedInsights(suggestion, analysisResult.insights || [])
      }));
  }

  /**
   * Find AI insights related to a suggestion
   * @param {Object} suggestion - Breakpoint suggestion
   * @param {Array} insights - AI insights
   * @returns {Array} Related insights
   */
  findRelatedInsights(suggestion, insights) {
    return insights.filter(insight => {
      const lowerInsight = insight.toLowerCase();
      const lowerCode = suggestion.code.toLowerCase();
      
      // Simple keyword matching
      return lowerInsight.includes('variable') && lowerCode.includes('=') ||
             lowerInsight.includes('condition') && suggestion.type === 'conditional' ||
             lowerInsight.includes('loop') && suggestion.type === 'loop' ||
             lowerInsight.includes('function') && suggestion.type === 'function-call';
    });
  }

  /**
   * Count lines in code
   * @param {string} code - Source code
   * @returns {number} Line count
   */
  countLines(code) {
    return code.split('\n').length;
  }
}

module.exports = DebugSuggestBreakpoints;