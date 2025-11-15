/**
 * Analyze Command
 * 
 * CLI command for AI-powered analysis of debugging contexts and variable states.
 * Provides insights and recommendations based on current debugging session data.
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

const BaseCommand = require('./base');
const AnalysisService = require('../../ai/AnalysisService');

class AnalyzeCommand extends BaseCommand {
  /**
   * Execute the analyze command
   * @param {Object} options - Command options
   * @param {string} [options.type='variableAnalysis'] - Analysis type
   * @param {string} [options.file] - PHP file to analyze
   * @param {number} [options.line] - Line number for analysis context
   * @param {string} [options.context] - Context data (JSON string or file path)
   * @param {string} [options.variables] - Variables data (JSON string or file path)
   * @param {boolean} [options.verbose=false] - Show detailed output
   * @param {boolean} [options.json=false] - Output in JSON format
   * @param {string} [options.expectedBehavior] - Expected behavior description
   * @param {number} [options.maxTokens] - Maximum tokens for AI response
   * @returns {Promise<void>}
   */
  async execute(options = {}) {
    try {
      // Initialize analysis service
      this.info('Initializing AI analysis service...');
      const analysisService = new AnalysisService();
      await analysisService.initialize();

      // Prepare analysis context
      const context = await this.prepareAnalysisContext(options);
      
      // Validate context
      if (!context || Object.keys(context).length === 0) {
        this.error('No debugging context provided. Use --context, --file, or provide session data.');
        process.exit(1);
      }

      // Determine analysis type
      const analysisType = this.determineAnalysisType(options, context);
      
      if (options.verbose) {
        this.info(`Analysis type: ${analysisType}`);
        this.info(`Context: ${JSON.stringify(context, null, 2)}`);
      }

      // Perform AI analysis
      this.info('Analyzing debugging context with AI...');
      const analysis = await analysisService.analyzeContext(context, {
        type: analysisType,
        expectedBehavior: options.expectedBehavior,
        maxTokens: options.maxTokens
      });

      // Display results
      this.displayAnalysisResults(analysis, options);

    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Prepare analysis context from various input sources
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Analysis context
   */
  async prepareAnalysisContext(options) {
    let context = {};

    // Handle context from JSON string or file
    if (options.context) {
      try {
        // Try parsing as JSON first
        if (options.context.startsWith('{') || options.context.startsWith('[')) {
          const contextData = JSON.parse(options.context);
          Object.assign(context, contextData);
        } else {
          // Try reading as file path
          const fs = require('fs').promises;
          const contextData = await fs.readFile(options.context, 'utf8');
          Object.assign(context, JSON.parse(contextData));
        }
      } catch (error) {
        this.warn(`Failed to parse context data: ${error.message}`);
      }
    }

    // Handle variables from JSON string or file
    if (options.variables) {
      try {
        let variablesData;
        if (options.variables.startsWith('{') || options.variables.startsWith('[')) {
          variablesData = JSON.parse(options.variables);
        } else {
          const fs = require('fs').promises;
          const variableFile = await fs.readFile(options.variables, 'utf8');
          variablesData = JSON.parse(variableFile);
        }
        context.variables = Array.isArray(variablesData) ? variablesData : [variablesData];
      } catch (error) {
        this.warn(`Failed to parse variables data: ${error.message}`);
      }
    }

    // Add file and line information
    if (options.file) {
      context.filename = options.file;
    }
    
    if (options.line) {
      context.line = options.line;
    }

    // Try to extract context from current session (if available)
    if (!context.variables && !context.filename) {
      const sessionContext = await this.extractSessionContext();
      Object.assign(context, sessionContext);
    }

    // Add sample context if nothing is provided (for demo purposes)
    if (!context.variables && !context.filename) {
      context = this.createSampleContext();
    }

    return context;
  }

  /**
   * Extract context from current debugging session
   * @returns {Promise<Object>} Session context
   */
  async extractSessionContext() {
    // In a real implementation, this would connect to an active debugging session
    // For now, return empty context
    return {};
  }

  /**
   * Create sample context for demonstration
   * @returns {Object} Sample context
   */
  createSampleContext() {
    return {
      filename: 'example-script.php',
      line: 25,
      function: 'processUserData',
      variables: [
        { name: '$user_id', type: 'int', value: 12345 },
        { name: '$user_data', type: 'array', value: { name: 'John Doe', email: 'john@example.com', active: true } },
        { name: '$validation_errors', type: 'array', value: [] },
        { name: '$processed_count', type: 'int', value: 0 }
      ],
      execution: {
        status: 'break',
        reason: 'breakpoint',
        breakpoint: 'line_breakpoint_25'
      }
    };
  }

  /**
   * Determine analysis type based on options and context
   * @param {Object} options - Command options
   * @param {Object} context - Analysis context
   * @returns {string} Analysis type
   */
  determineAnalysisType(options, context) {
    // Use explicit type if provided
    if (options.type) {
      return options.type;
    }

    // Auto-detect based on context
    if (context.error) {
      return 'errorAnalysis';
    }

    if (options.expectedBehavior) {
      return 'logicAnalysis';
    }

    // Default to variable analysis
    return 'variableAnalysis';
  }

  /**
   * Display analysis results
   * @param {Object} analysis - Analysis results
   * @param {Object} options - Display options
   */
  displayAnalysisResults(analysis, options) {
    if (options.json) {
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    // Terminal-friendly display
    console.log('');
    this.success('AI Analysis Complete');
    console.log('');
    
    console.log(`Analysis Type: ${analysis.type}`);
    console.log(`Model: ${analysis.model}`);
    console.log(`Timestamp: ${analysis.timestamp}`);
    console.log('');
    
    console.log('Context Analyzed:');
    console.log(`   File: ${analysis.context.filename}`);
    console.log(`   Line: ${analysis.context.line}`);
    console.log(`   Function: ${analysis.context.function}`);
    console.log('');
    
    console.log('AI Insights:');
    console.log('================');
    console.log(this.formatInsights(analysis.insights));
    console.log('');

    if (options.verbose) {
      console.log('Full Context:');
      console.log(JSON.stringify(analysis.context, null, 2));
      console.log('');
    }
  }

  /**
   * Format AI insights for terminal display
   * @param {string} insights - Raw insights from AI
   * @returns {string} Formatted insights
   */
  formatInsights(insights) {
    // Add some basic formatting to make insights more readable
    const formatted = insights
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Highlight important sections
        if (line.match(/^(Key finding|Important|Warning|Error|Issue|Problem):/i)) {
          return `[!] ${line}`;
        }
        if (line.match(/^(Recommendation|Suggestion|Fix|Solution):/i)) {
          return `[+] ${line}`;
        }
        if (line.match(/^(Note|Info|Observation):/i)) {
          return `[-] ${line}`;
        }
        return `    ${line}`;
      })
      .join('\n');

    return formatted;
  }

  /**
   * Show usage information
   */
  showUsage() {
    console.log('');
    this.info('YDebug AI Analysis Command');
    console.log('');
    this.info('Usage Examples:');
    console.log('');
    console.log('  # Analyze with sample context:');
    console.log('  ydebug analyze');
    console.log('');
    console.log('  # Analyze specific file and line:');
    console.log('  ydebug analyze --file script.php --line 25');
    console.log('');
    console.log('  # Analyze with custom context:');
    console.log('  ydebug analyze --context \'{"filename":"test.php","variables":[...]}\'');
    console.log('');
    console.log('  # Analyze with variables file:');
    console.log('  ydebug analyze --variables variables.json');
    console.log('');
    console.log('  # Performance analysis:');
    console.log('  ydebug analyze --type performanceAnalysis --file script.php');
    console.log('');
    console.log('  # Logic analysis with expected behavior:');
    console.log('  ydebug analyze --type logicAnalysis --expected-behavior "Should return array of users"');
    console.log('');
    this.info('Available Analysis Types:');
    console.log('  - variableAnalysis (default)');
    console.log('  - errorAnalysis');
    console.log('  - performanceAnalysis');
    console.log('  - logicAnalysis');
    console.log('');
  }
}

module.exports = AnalyzeCommand;