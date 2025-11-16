/**
 * DebugExplainBehavior MCP Tool
 * Provides AI-powered explanations of code behavior and execution patterns
 * 
 * FACADE PATTERN: Wraps existing AnalysisService from Feature 014
 */

const BaseMCPTool = require('./BaseMCPTool');
const AnalysisService = require('../../ai/AnalysisService');

class DebugExplainBehavior extends BaseMCPTool {
  constructor(services, analysisService = null) {
    super(services);
    this.analysisService = analysisService;
  }

  getDefinition() {
    return {
      name: 'debug_explain_behavior',
      description: 'AI-powered explanation of code behavior, execution flow, and why code acts as it does',
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
            }
          },
          question: {
            type: 'string',
            description: 'Specific question about the behavior',
            default: 'Why is this code behaving this way?'
          },
          code: {
            type: 'string',
            description: 'Relevant code section to explain'
          },
          observedBehavior: {
            type: 'string',
            description: 'What behavior was observed',
            default: ''
          },
          expectedBehavior: {
            type: 'string',
            description: 'What behavior was expected',
            default: ''
          },
          explainType: {
            type: 'string',
            description: 'Type of explanation needed',
            enum: ['step-by-step', 'high-level', 'technical', 'simple'],
            default: 'step-by-step'
          }
        },
        required: ['context']
      }
    };
  }

  async execute(params) {
    const { 
      context,
      question = 'Why is this code behaving this way?',
      code = '',
      observedBehavior = '',
      expectedBehavior = '',
      explainType = 'step-by-step'
    } = params;

    try {
      // Initialize AnalysisService if not already done
      if (!this.analysisService) {
        this.analysisService = new AnalysisService();
        await this.analysisService.initialize();
      }

      this.logger.info('Generating behavior explanation', { 
        filename: context.filename,
        explainType,
        hasCode: !!code,
        hasObservedBehavior: !!observedBehavior 
      });

      // Prepare context for analysis - FACADE PATTERN using existing service
      const analysisContext = {
        filename: context.filename || 'Unknown file',
        line: context.line || 0,
        function: context.function || 'Unknown function',
        variables: context.variables || {},
        execution: context.execution || { status: 'unknown' }
      };

      // Use existing AnalysisService for behavior explanation
      const analysisResult = await this.analysisService.analyzeContext(
        analysisContext,
        {
          type: 'executionAnalysis',
          question: question,
          observedBehavior: observedBehavior,
          expectedBehavior: expectedBehavior,
          code: code
        }
      );

      // Generate detailed explanation based on context and type
      const explanation = this.generateDetailedExplanation(
        context,
        code,
        observedBehavior,
        expectedBehavior,
        explainType,
        analysisResult
      );

      this.logger.info('Behavior explanation generated successfully', { 
        explainType,
        explanationLength: explanation.summary.length,
        confidence: analysisResult.confidence 
      });

      return this.formatResponse({
        explanation: explanation,
        analysis: {
          insights: analysisResult.insights || [],
          confidence: analysisResult.confidence || 'medium',
          recommendations: analysisResult.recommendations || [],
          summary: analysisResult.summary || 'Behavior analysis completed'
        },
        context: {
          filename: context.filename,
          line: context.line,
          function: context.function,
          executionStatus: context.execution?.status
        },
        question: {
          original: question,
          type: explainType,
          observedBehavior: observedBehavior,
          expectedBehavior: expectedBehavior
        },
        metadata: {
          analysisTime: new Date().toISOString(),
          explanationType: explainType,
          hasCode: !!code,
          serviceReady: this.analysisService.isReady()
        }
      });

    } catch (error) {
      this.logger.error('Failed to explain behavior', error);
      return this.formatErrorResponse(error, 'Failed to explain behavior');
    }
  }

  /**
   * Generate detailed explanation based on context and type
   * @param {Object} context - Debugging context
   * @param {string} code - Code to explain
   * @param {string} observed - Observed behavior
   * @param {string} expected - Expected behavior
   * @param {string} explainType - Type of explanation
   * @param {Object} analysisResult - AI analysis result
   * @returns {Object} Detailed explanation
   */
  generateDetailedExplanation(context, code, observed, expected, explainType, analysisResult) {
    const explanation = {
      summary: '',
      steps: [],
      reasoning: [],
      variables: this.explainVariableStates(context.variables || {}),
      execution: this.explainExecutionFlow(context.execution || {}),
      differences: this.explainDifferences(observed, expected),
      codeAnalysis: code ? this.explainCodeBehavior(code) : null
    };

    // Generate explanation based on type
    switch (explainType) {
    case 'step-by-step':
      explanation.summary = this.generateStepByStepExplanation(context, observed, expected);
      explanation.steps = this.breakDownExecutionSteps(context, code);
      break;
    
    case 'high-level':
      explanation.summary = this.generateHighLevelExplanation(context, observed, expected);
      explanation.reasoning = this.generateHighLevelReasoning(context, analysisResult);
      break;
    
    case 'technical':
      explanation.summary = this.generateTechnicalExplanation(context, observed, expected);
      explanation.reasoning = this.generateTechnicalReasoning(context, code, analysisResult);
      break;
    
    case 'simple':
      explanation.summary = this.generateSimpleExplanation(context, observed, expected);
      explanation.reasoning = this.generateSimpleReasoning(context);
      break;
    }

    return explanation;
  }

  /**
   * Generate step-by-step explanation
   */
  generateStepByStepExplanation(context, observed, expected) {
    const parts = ['Here\'s what happened step by step:'];
    
    if (context.function) {
      parts.push(`1. Code execution is in function '${context.function}'`);
    }
    
    if (context.line) {
      parts.push(`2. Currently at line ${context.line} in ${context.filename || 'the file'}`);
    }
    
    if (context.variables && Object.keys(context.variables).length > 0) {
      parts.push(`3. Variable states: ${Object.keys(context.variables).length} variables are tracked`);
    }
    
    if (observed) {
      parts.push(`4. Observed behavior: ${observed}`);
    }
    
    if (expected && expected !== observed) {
      parts.push(`5. Expected behavior: ${expected}`);
      parts.push('6. The difference suggests there may be a logic issue or unexpected condition');
    }

    return parts.join('\n');
  }

  /**
   * Generate high-level explanation
   */
  generateHighLevelExplanation(context, observed, expected) {
    let explanation = `The code is executing in ${context.function || 'an unknown function'}`;
    
    if (context.execution?.status) {
      explanation += ` and is currently ${context.execution.status}`;
    }
    
    if (observed && expected && observed !== expected) {
      explanation += `. The observed behavior (${observed}) differs from expected (${expected}), indicating a potential issue in the logic or data flow.`;
    } else if (observed) {
      explanation += `. The current behavior shows: ${observed}`;
    }
    
    return explanation;
  }

  /**
   * Generate technical explanation
   */
  generateTechnicalExplanation(context, observed, expected) {
    const technical = ['Execution context analysis:'];
    
    if (context.execution) {
      technical.push(`- Status: ${context.execution.status || 'unknown'}`);
      technical.push(`- Stack depth: ${context.execution.stack?.length || 0} frames`);
      technical.push(`- Breakpoint active: ${!!context.execution.breakpoint}`);
    }
    
    if (context.variables) {
      const varTypes = {};
      Object.values(context.variables).forEach(val => {
        const type = typeof val;
        varTypes[type] = (varTypes[type] || 0) + 1;
      });
      technical.push(`- Variable types: ${Object.entries(varTypes).map(([t, c]) => `${t}(${c})`).join(', ')}`);
    }
    
    if (observed !== expected) {
      technical.push('- Behavior variance detected between observed and expected outcomes');
    }
    
    return technical.join('\n');
  }

  /**
   * Generate simple explanation
   */
  generateSimpleExplanation(context, observed, expected) {
    if (observed && expected && observed !== expected) {
      return `The code isn't doing what you expected. You expected "${expected}" but got "${observed}". This usually means there's a bug or the data isn't what you thought it would be.`;
    } else if (observed) {
      return `The code is working and showing: ${observed}. This appears to be the normal behavior at this point in execution.`;
    } else {
      return `The code is running normally at line ${context.line || 'unknown'} in the ${context.function || 'current'} function.`;
    }
  }

  /**
   * Break down execution into steps
   * @param {Object} context - Context
   * @param {string} code - Code
   * @returns {Array} Execution steps
   */
  breakDownExecutionSteps(context, code) {
    const steps = [];
    
    if (code) {
      const lines = code.split('\n');
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('//')) {
          steps.push({
            step: index + 1,
            code: trimmed,
            explanation: this.explainCodeLine(trimmed, index + 1)
          });
        }
      });
    }
    
    return steps.slice(0, 10); // Limit to 10 steps
  }

  /**
   * Explain a single code line
   * @param {string} line - Code line
   * @param {number} lineNum - Line number
   * @returns {string} Explanation
   */
  explainCodeLine(line, _lineNum) {
    if (line.includes('=') && !line.includes('==')) {
      return 'Variable assignment - setting a value';
    } else if (line.includes('if (') || line.includes('elseif (')) {
      return 'Conditional check - making a decision based on a condition';
    } else if (line.includes('for (') || line.includes('while (')) {
      return 'Loop start - repeating code multiple times';
    } else if (line.includes('return ')) {
      return 'Function return - sending a value back and ending function';
    } else if (line.includes('(') && line.includes(')')) {
      return 'Function call - executing another piece of code';
    } else {
      return 'Code execution - performing an operation';
    }
  }

  /**
   * Explain variable states
   * @param {Object} variables - Variables
   * @returns {Object} Variable explanations
   */
  explainVariableStates(variables) {
    const explanations = {};
    
    Object.entries(variables).forEach(([name, value]) => {
      if (value === null || value === undefined) {
        explanations[name] = `${name} is ${value === null ? 'null' : 'undefined'} - it has no value`;
      } else if (Array.isArray(value)) {
        explanations[name] = `${name} is an array with ${value.length} items`;
      } else if (typeof value === 'object') {
        explanations[name] = `${name} is an object with ${Object.keys(value).length} properties`;
      } else {
        explanations[name] = `${name} is a ${typeof value} with value: ${String(value).substring(0, 100)}`;
      }
    });
    
    return explanations;
  }

  /**
   * Explain execution flow
   * @param {Object} execution - Execution context
   * @returns {Object} Execution explanation
   */
  explainExecutionFlow(execution) {
    return {
      status: execution.status || 'unknown',
      explanation: this.getStatusExplanation(execution.status),
      stackInfo: execution.stack ? `Call stack has ${execution.stack.length} levels` : 'No stack information',
      breakpointInfo: execution.breakpoint ? 'Stopped at a breakpoint' : 'No breakpoint active'
    };
  }

  /**
   * Get explanation for execution status
   * @param {string} status - Execution status
   * @returns {string} Status explanation
   */
  getStatusExplanation(status) {
    switch (status) {
    case 'break':
      return 'Execution is paused (at a breakpoint or step)';
    case 'running':
      return 'Code is currently executing';
    case 'stopped':
      return 'Execution has ended';
    case 'error':
      return 'An error occurred during execution';
    default:
      return 'Execution status is unknown';
    }
  }

  /**
   * Explain differences between observed and expected
   * @param {string} observed - Observed behavior
   * @param {string} expected - Expected behavior
   * @returns {Object} Difference explanation
   */
  explainDifferences(observed, expected) {
    if (!observed || !expected || observed === expected) {
      return { hasDifference: false };
    }
    
    return {
      hasDifference: true,
      observed: observed,
      expected: expected,
      explanation: 'The behavior doesn\'t match expectations, which often indicates a logic error, incorrect data, or misunderstood requirements.',
      possibleCauses: [
        'Variable has unexpected value',
        'Conditional logic not working as expected',
        'Data type mismatch',
        'Missing or incorrect validation',
        'Logic error in algorithm'
      ]
    };
  }

  /**
   * Explain code behavior
   * @param {string} code - Code to analyze
   * @returns {Object} Code explanation
   */
  explainCodeBehavior(code) {
    const analysis = {
      purpose: 'Code analysis',
      patterns: [],
      complexity: 'simple'
    };
    
    const lines = code.split('\n');
    const significantLines = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    
    if (significantLines > 20) {
      analysis.complexity = 'complex';
    } else if (significantLines > 5) {
      analysis.complexity = 'moderate';
    }
    
    // Identify patterns
    if (code.includes('for (') || code.includes('while (')) {
      analysis.patterns.push('Contains loops - repetitive operations');
    }
    if (code.includes('if (')) {
      analysis.patterns.push('Contains conditionals - decision making');
    }
    if (code.includes('function ') || code.includes('public function')) {
      analysis.patterns.push('Defines functions - reusable code blocks');
    }
    if (code.includes('try {') || code.includes('catch (')) {
      analysis.patterns.push('Has error handling - manages exceptions');
    }
    
    return analysis;
  }

  /**
   * Generate reasoning for different explanation types
   */
  generateHighLevelReasoning(context, analysisResult) {
    return (analysisResult.insights || []).map(insight => `• ${insight}`);
  }

  generateTechnicalReasoning(context, code, analysisResult) {
    const reasoning = [];
    
    if (context.execution?.stack?.length > 0) {
      reasoning.push(`Call stack depth indicates ${context.execution.stack.length} nested function calls`);
    }
    
    if (analysisResult.insights) {
      reasoning.push(...analysisResult.insights);
    }
    
    return reasoning;
  }

  generateSimpleReasoning(context) {
    const simple = [];
    
    if (context.variables && Object.keys(context.variables).length > 0) {
      simple.push('Your variables contain data that affects how the code runs');
    }
    
    if (context.execution?.status === 'break') {
      simple.push('The code stopped so you can examine what\'s happening');
    }
    
    return simple;
  }
}

module.exports = DebugExplainBehavior;