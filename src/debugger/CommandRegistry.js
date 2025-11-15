/**
 * Command Registry
 * Manages registration and execution of DBGp commands using Command Pattern
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

const { logger } = require('../utils/Logger');

// Import built-in commands
const StatusCommand = require('./commands/StatusCommand');
const FeatureGetCommand = require('./commands/FeatureGetCommand');
const FeatureSetCommand = require('./commands/FeatureSetCommand');
const StepOverCommand = require('./commands/StepOverCommand');
const BreakpointSetCommand = require('./commands/BreakpointSetCommand');
const BreakpointListCommand = require('./commands/BreakpointListCommand');
const ContextGetCommand = require('./commands/ContextGetCommand');
const ContextNamesCommand = require('./commands/ContextNamesCommand');

/**
 * Command Registry for managing DBGp commands
 * Implements the Command Pattern for extensible command handling
 */
class CommandRegistry {
  /**
   * Create a command registry instance
   */
  constructor() {
    this.commands = new Map();
    this._registerBuiltInCommands();
  }

  /**
   * Register built-in commands
   * @private
   */
  _registerBuiltInCommands() {
    this.register(new StatusCommand());
    this.register(new FeatureGetCommand());
    this.register(new FeatureSetCommand());
    this.register(new StepOverCommand());
    this.register(new BreakpointSetCommand());
    this.register(new BreakpointListCommand());
    this.register(new ContextGetCommand());
    this.register(new ContextNamesCommand());

    logger.debug('Registered built-in DBGp commands');
  }

  /**
   * Register a command
   * @param {BaseCommand} command - Command instance to register
   * @throws {Error} If command is invalid or already registered
   */
  register(command) {
    const BaseCommand = require('./commands/BaseCommand');

    if (!command || !(command instanceof BaseCommand)) {
      throw new Error('Command must be an instance of BaseCommand');
    }

    const commandName = command.name;

    if (this.commands.has(commandName)) {
      // eslint-disable-next-line no-console
      console.warn('CommandRegistry: Overriding existing command:', commandName);
    }

    this.commands.set(commandName, command);
    logger.debug(`Registered command: ${commandName}`);
  }

  /**
   * Unregister a command
   * @param {string} commandName - Name of command to unregister
   * @returns {boolean} True if command was unregistered, false if not found
   */
  unregister(commandName) {
    const wasRemoved = this.commands.delete(commandName);
    if (wasRemoved) {
      logger.debug(`Unregistered command: ${commandName}`);
    }
    return wasRemoved;
  }

  /**
   * Check if a command is registered
   * @param {string} commandName - Command name to check
   * @returns {boolean} True if command is registered
   */
  has(commandName) {
    return this.commands.has(commandName);
  }

  /**
   * Alias for has() method for better readability
   * @param {string} commandName - Command name to check
   * @returns {boolean} True if command is registered
   */
  hasCommand(commandName) {
    return this.has(commandName);
  }

  /**
   * Get a registered command
   * @param {string} commandName - Command name
   * @returns {BaseCommand|null} Command instance or null if not found
   */
  get(commandName) {
    return this.commands.get(commandName) || null;
  }

  /**
   * Execute a command
   * @param {string} commandName - Command name to execute
   * @param {Object} client - DBGp client instance
   * @param {Object} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command execution result
   * @throws {Error} If command is not found or execution fails
   */
  async execute(commandName, client, args = {}, _options = {}) {
    const command = this.get(commandName);

    if (!command) {
      throw new Error(`Command '${commandName}' is not registered`);
    }

    return await command.execute(client, args);
  }

  /**
   * Get all registered command names
   * @returns {string[]} Array of command names
   */
  getCommandNames() {
    return Array.from(this.commands.keys()).sort();
  }

  /**
   * Get command information for documentation/help
   * @param {string} commandName - Command name (optional)
   * @returns {Object|Object[]} Command info or array of command info
   */
  getCommandInfo(commandName = null) {
    if (commandName) {
      const command = this.get(commandName);
      if (!command) {
        return null;
      }

      return {
        name: command.name,
        description: command.description,
        timeout: command.timeout
      };
    }

    // Return info for all commands
    return this.getCommandNames().map(name => this.getCommandInfo(name));
  }

  /**
   * Validate command arguments without executing
   * @param {string} commandName - Command name
   * @param {Object} args - Arguments to validate
   * @returns {boolean} True if arguments are valid
   * @throws {Error} If command not found or arguments invalid
   */
  validateArgs(commandName, args = {}) {
    const command = this.get(commandName);

    if (!command) {
      throw new Error(`Command '${commandName}' is not registered`);
    }

    // This will throw if arguments are invalid
    command.validateArgs(args);
    return true;
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    return {
      totalCommands: this.commands.size,
      commandNames: this.getCommandNames(),
      builtInCommands: ['status', 'feature_get', 'feature_set', 'step_over']
    };
  }

  /**
   * Clear all registered commands
   * @param {boolean} keepBuiltIn - Whether to keep built-in commands (default: true)
   */
  clear(keepBuiltIn = true) {
    if (keepBuiltIn) {
      const builtInNames = ['status', 'feature_get', 'feature_set', 'step_over'];
      const customCommands = [];

      for (const [name] of this.commands) {
        if (!builtInNames.includes(name)) {
          customCommands.push(name);
        }
      }

      customCommands.forEach(name => this.unregister(name));
      logger.debug(`Cleared ${customCommands.length} custom commands`);
    } else {
      this.commands.clear();
      logger.debug('Cleared all commands');
    }
  }
}

// Create singleton instance
const commandRegistry = new CommandRegistry();

module.exports = {
  CommandRegistry,
  commandRegistry
};
