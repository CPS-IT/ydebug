/**
 * Analysis Service
 * 
 * Provides AI-powered analysis of debugging contexts, variable states, and code execution.
 * Uses prompt templates to generate relevant insights for debugging scenarios.
 *
 * Copyright (C) 2024 YDebug Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const { ClaudeClient } = require('./ClaudeClient');
const ConfigManager = require('../config/ConfigManager');
const { logger } = require('../utils/Logger');

/**
 * Analysis Service for AI-powered debugging insights
 */
class AnalysisService {
  constructor(_options = {}) {
    this.configManager = new ConfigManager();
    this.claudeClient = null;
    this.config = null;
    this.promptTemplates = this.initializePromptTemplates();
  }

  /**
   * Initialize the service with configuration
   */
  async initialize() {
    try {
      this.config = await this.configManager.load();
      
      // Create Claude client with config (only pass defined values)
      const claudeConfig = {};
      if (this.config.ai?.apiKey) claudeConfig.apiKey = this.config.ai.apiKey;
      if (this.config.ai?.model) claudeConfig.model = this.config.ai.model;
      if (this.config.ai?.maxTokens) claudeConfig.maxTokens = this.config.ai.maxTokens;
      if (this.config.ai?.timeout) claudeConfig.timeout = this.config.ai.timeout;
      if (this.config.ai?.rateLimitRpm) claudeConfig.rateLimitRpm = this.config.ai.rateLimitRpm;
      
      this.claudeClient = new ClaudeClient(claudeConfig);

      await this.claudeClient.initialize();
      logger.info('AnalysisService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AnalysisService:', error);
      throw error;
    }
  }

  /**
   * Initialize prompt templates for different analysis types
   */
  initializePromptTemplates() {
    return {
      variableAnalysis: {
        system: `You are an expert PHP debugging assistant. Analyze the provided debugging context and variable states to provide insights that help developers understand what might be wrong or unexpected in their code.

Focus on:
- Unusual variable values or types
- Potential logic errors
- Missing or unexpected data
- Performance concerns
- Security considerations

Be concise and actionable. Highlight the most important findings first.`,
        
        user: `Please analyze this debugging context:

**File:** {filename}
**Line:** {line}
**Function:** {function}

**Variable States:**
{variables}

**Execution Context:**
{context}

What insights can you provide about potential issues or unexpected behavior?`
      },

      errorAnalysis: {
        system: `You are an expert PHP debugging assistant. Analyze the provided error context and help identify the root cause and potential solutions.

Focus on:
- Root cause analysis
- Common patterns that lead to this type of error
- Specific variable states that might be problematic
- Actionable fix suggestions
- Prevention strategies

Be direct and solution-oriented.`,
        
        user: `Please analyze this error context:

**Error:** {error}
**File:** {filename}
**Line:** {line}

**Variable States at Error:**
{variables}

**Stack Context:**
{context}

What is the likely root cause and how can it be fixed?`
      },

      performanceAnalysis: {
        system: `You are an expert PHP performance analyst. Review the provided context to identify potential performance bottlenecks and optimization opportunities.

Focus on:
- Inefficient algorithms or patterns
- Resource-heavy operations
- Memory usage concerns
- Database query optimization opportunities
- Caching opportunities

Provide practical performance improvement suggestions.`,
        
        user: `Please analyze this code context for performance issues:

**File:** {filename}
**Line:** {line}
**Function:** {function}

**Variable States:**
{variables}

**Execution Context:**
{context}

What performance optimizations would you recommend?`
      },

      logicAnalysis: {
        system: `You are an expert PHP code analyst. Examine the provided debugging context to identify potential logic errors, edge cases, or unexpected behavior.

Focus on:
- Logic flow issues
- Edge case handling
- Conditional statement problems
- Loop behavior analysis
- Data validation concerns

Help the developer understand if the code is behaving as expected.`,
        
        user: `Please analyze this code logic:

**File:** {filename}
**Line:** {line}
**Function:** {function}

**Variable States:**
{variables}

**Execution Context:**
{context}

**Expected Behavior:** {expectedBehavior}

Is the code logic working as expected? What issues do you see?`
      }
    };
  }

  /**
   * Analyze debugging context with AI
   * @param {Object} context - Debugging context data
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeContext(context, options = {}) {
    if (!this.claudeClient) {
      await this.initialize();
    }

    const analysisType = options.type || 'variableAnalysis';
    const template = this.promptTemplates[analysisType];
    
    if (!template) {
      throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    // Prepare the context data
    const preparedContext = this.prepareContext(context, options);
    
    // Fill in the prompt template
    const userPrompt = this.fillPromptTemplate(template.user, preparedContext);
    
    try {
      logger.info(`Starting AI analysis of type: ${analysisType}`);
      
      const messages = [
        { role: 'user', content: userPrompt }
      ];

      const response = await this.claudeClient.sendMessage(messages, {
        system: template.system,
        maxTokens: options.maxTokens || 2000
      });

      const analysis = {
        type: analysisType,
        context: preparedContext,
        insights: response.content[0].text,
        timestamp: new Date().toISOString(),
        model: this.claudeClient.config.model
      };

      logger.info('AI analysis completed successfully');
      return analysis;
      
    } catch (error) {
      logger.error('AI analysis failed:', error);
      throw error;
    }
  }

  /**
   * Prepare debugging context for AI analysis
   * @param {Object} context - Raw debugging context
   * @param {Object} options - Preparation options
   * @returns {Object} Prepared context
   */
  prepareContext(context, options = {}) {
    const prepared = {
      filename: context.filename || 'Unknown file',
      line: context.line || 'Unknown line',
      function: context.function || 'Global scope',
      variables: this.formatVariables(context.variables || []),
      context: this.formatExecutionContext(context.execution || {}),
      error: context.error || null,
      expectedBehavior: options.expectedBehavior || null
    };

    return prepared;
  }

  /**
   * Format variables for AI analysis
   * @param {Array} variables - Variable data
   * @returns {string} Formatted variables
   */
  formatVariables(variables) {
    if (!variables || variables.length === 0) {
      return 'No variables available';
    }

    const formatted = variables.map(variable => {
      const name = variable.name || 'unnamed';
      const type = variable.type || 'unknown';
      const value = this.formatVariableValue(variable.value, variable.type);
      
      return `- ${name} (${type}): ${value}`;
    }).join('\n');

    return formatted;
  }

  /**
   * Format a single variable value
   * @param {*} value - Variable value
   * @param {string} type - Variable type
   * @returns {string} Formatted value
   */
  formatVariableValue(value, type) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    switch (type) {
    case 'string': {
      const stringValue = String(value).substring(0, 200);
      return `"${stringValue}"`;
    }
    case 'array':
      if (Array.isArray(value)) {
        return `[${value.length} items] ${JSON.stringify(value).substring(0, 100)}...`;
      }
      return `[array] ${JSON.stringify(value).substring(0, 100)}...`;
    case 'object':
      return `{object} ${JSON.stringify(value).substring(0, 100)}...`;
    case 'bool':
    case 'boolean':
      return value ? 'true' : 'false';
    default:
      return String(value).substring(0, 200);
    }
  }

  /**
   * Format execution context
   * @param {Object} execution - Execution context
   * @returns {string} Formatted context
   */
  formatExecutionContext(execution) {
    const parts = [];
    
    if (execution.status) {
      parts.push(`Status: ${execution.status}`);
    }
    
    if (execution.reason) {
      parts.push(`Reason: ${execution.reason}`);
    }
    
    if (execution.stack) {
      parts.push(`Stack depth: ${execution.stack.length || 'unknown'}`);
    }
    
    if (execution.breakpoint) {
      parts.push(`Breakpoint: ${execution.breakpoint}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No execution context available';
  }

  /**
   * Fill prompt template with context data
   * @param {string} template - Prompt template
   * @param {Object} data - Context data
   * @returns {string} Filled template
   */
  fillPromptTemplate(template, data) {
    let filled = template;
    
    // Replace all placeholders with data values
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      const value = data[key] || 'Not available';
      filled = filled.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    
    // Replace any remaining placeholders with 'Not available'
    filled = filled.replace(/\{[^}]+\}/g, 'Not available');
    
    return filled;
  }

  /**
   * Get available analysis types
   * @returns {Array} Available analysis types
   */
  getAvailableAnalysisTypes() {
    return Object.keys(this.promptTemplates);
  }

  /**
   * Check if service is ready for analysis
   * @returns {boolean} Service readiness
   */
  isReady() {
    return !!(this.claudeClient && this.claudeClient.initialized);
  }
}

module.exports = AnalysisService;