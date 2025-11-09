/**
 * Inspect Command
 * CLI command for variable inspection during debugging sessions
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
const DBGpClient = require('../../debugger/DBGpClient');
const { DBGpCommands } = require('../../debugger/DBGpCommands');
const VariableFormatter = require('../../debugger/VariableFormatter');
const { logger } = require('../../utils/Logger');

/**
 * Inspect Command for variable inspection
 * Connects to debugging session and inspects variables
 */
class InspectCommand extends BaseCommand {
  /**
   * Execute the inspect command
   * @param {Object} options - Command options
   * @param {number} [options.context=0] - Context ID to inspect (0=local, 1=global, 2=class)
   * @param {number} [options.depth=0] - Stack frame depth
   * @param {string} [options.filter] - Variable name filter (partial match)
   * @param {boolean} [options.json=false] - Output in JSON format
   * @param {boolean} [options.noColors=false] - Disable colored output
   * @param {number} [options.maxDepth=3] - Maximum nesting depth to display
   * @param {number} [options.maxLength=100] - Maximum string length to display
   * @param {boolean} [options.listContexts=false] - List available contexts only
   * @param {string} [options.host='localhost'] - Debugger host
   * @param {number} [options.port=9003] - Debugger port
   * @param {number} [options.timeout=10000] - Connection timeout
   * @returns {Promise<void>}
   */
  async execute(options = {}) {
    const startTime = Date.now();
    let client = null;

    try {
      // Build connection configuration
      const config = this.buildConnectionConfig(options);
      
      // Display connection info
      this.displayConnectionAttempt(config);

      // Create and connect to debugger
      client = new DBGpClient(config);
      const commands = new DBGpCommands(client);

      // Connect to debugger
      await client.connect();
      this.displayConnectionSuccess(Date.now() - startTime);

      // Create variable formatter
      const formatter = new VariableFormatter({
        colors: !options.noColors,
        maxDepth: options.maxDepth || 3,
        maxStringLength: options.maxLength || 100
      });

      if (options.listContexts) {
        // List available contexts only
        await this.listContexts(commands, formatter, options);
      } else {
        // Inspect variables in specified context
        await this.inspectVariables(commands, formatter, options);
      }

    } catch (error) {
      this.displayInspectionError(error, Date.now() - startTime);
      throw error;
    } finally {
      if (client) {
        try {
          await client.disconnect();
        } catch (disconnectError) {
          logger.debug('Error during disconnect:', disconnectError.message);
        }
      }
    }
  }

  /**
   * List available contexts
   * @param {DBGpCommands} commands - DBGp commands instance
   * @param {VariableFormatter} formatter - Variable formatter
   * @param {Object} options - Command options
   */
  async listContexts(commands, formatter, options) {
    console.log('\n=== Available Execution Contexts ===\n');

    try {
      const result = await commands.getContextNames(options.depth);
      
      if (result.contexts.length === 0) {
        console.log('No contexts available');
        return;
      }

      for (const context of result.contexts) {
        const idColor = formatter.colorize(`[${context.id}]`, 'cyan');
        const nameColor = formatter.colorize(context.name, 'yellow');
        console.log(`${idColor} ${nameColor}`);
        console.log(`    ${context.description}`);
        console.log('');
      }

      console.log(`Total: ${result.count} context(s) available`);

    } catch (error) {
      console.error('Failed to retrieve contexts:', error.message);
      throw error;
    }
  }

  /**
   * Inspect variables in specified context
   * @param {DBGpCommands} commands - DBGp commands instance
   * @param {VariableFormatter} formatter - Variable formatter
   * @param {Object} options - Command options
   */
  async inspectVariables(commands, formatter, options) {
    const contextId = options.context || 0;
    const depth = options.depth || 0;

    console.log(`\n=== Variables in Context ${contextId} (Depth ${depth}) ===\n`);

    try {
      const result = await commands.getContext(contextId, depth);
      
      if (result.variables.length === 0) {
        console.log('No variables found in this context');
        return;
      }

      // Filter variables if filter option provided
      let variables = result.variables;
      if (options.filter) {
        const filterLower = options.filter.toLowerCase();
        variables = variables.filter(variable => 
          variable.name && variable.name.toLowerCase().includes(filterLower)
        );

        if (variables.length === 0) {
          console.log(`No variables found matching filter: "${options.filter}"`);
          return;
        }

        console.log(`Filtered ${variables.length} of ${result.variables.length} variables (filter: "${options.filter}")\n`);
      }

      // Format and display variables
      if (options.json) {
        const jsonOutput = formatter.formatAsJSON(variables, options);
        console.log(jsonOutput);
      } else {
        const formattedOutput = formatter.formatVariables(variables, options);
        console.log(formattedOutput);
        console.log(`\nTotal: ${variables.length} variable(s) displayed`);
      }

    } catch (error) {
      console.error(`Failed to inspect variables in context ${contextId}:`, error.message);
      throw error;
    }
  }

  /**
   * Build connection configuration from options and config file
   * @param {Object} options - Command options
   * @returns {Object} Connection configuration
   */
  buildConnectionConfig(options) {
    const config = this.loadConfig();
    const xdebugConfig = config.xdebug || {};

    return {
      host: options.host || xdebugConfig.host || 'localhost',
      port: parseInt(options.port || xdebugConfig.port || 9003, 10),
      timeout: parseInt(options.timeout || xdebugConfig.timeout || 10000, 10),
      // Add any path mappings from config
      pathMappings: xdebugConfig.pathMappings || {}
    };
  }

  /**
   * Display connection attempt information
   * @param {Object} config - Connection configuration
   */
  displayConnectionAttempt(config) {
    console.log(`Connecting to Xdebug at ${config.host}:${config.port}...`);
  }

  /**
   * Display successful connection
   * @param {number} duration - Connection time in milliseconds
   */
  displayConnectionSuccess(duration) {
    console.log(`Connected successfully (${duration}ms)`);
  }

  /**
   * Display inspection error
   * @param {Error} error - Error that occurred
   * @param {number} duration - Time elapsed
   */
  displayInspectionError(error, duration) {
    console.error(`\nInspection failed after ${duration}ms:`);
    console.error(`Error: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.error('\nTroubleshooting:');
      console.error('• Make sure Xdebug is running and listening for connections');
      console.error('• Verify the host and port settings');
      console.error('• Check if a PHP script with Xdebug is currently paused at a breakpoint');
    } else if (error.message.includes('timeout')) {
      console.error('\nTroubleshooting:');
      console.error('• Increase the timeout value with --timeout option');
      console.error('• Ensure the debugging session is active and paused');
    }

    console.error('\nFor configuration help, run: ydebug config --show');
  }
}

module.exports = InspectCommand;