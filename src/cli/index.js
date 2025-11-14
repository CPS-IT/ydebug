#!/usr/bin/env node

/**
 * YDebug CLI - Main entry point
 * Command-line interface for YDebug AI Agent PHP Debugging Solution
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

const { Command } = require('commander');
const packageJson = require('../../package.json');
const { AICommand, ConfigCommand, ConnectCommand, InspectCommand, ServerCommand } = require('./commands');

const program = new Command();

// Configure main program
program
  .name('ydebug')
  .description('YDebug - AI Agent PHP Debugging Solution')
  .version(packageJson.version, '-v, --version', 'display version number');

// Global error handling
program.configureOutput({
  writeOut: str => process.stdout.write(str),
  writeErr: str => process.stderr.write(str),
  outputError: (str, write) => write(`Error: ${str}`),
});

// Register commands
registerCommands();

// Handle unknown commands
program.on('command:*', function (operands) {
  console.error(`Unknown command: ${operands[0]}`);
  console.log('Use --help for available commands');
  process.exit(1);
});

// Parse arguments and execute
program.parse(process.argv);

/**
 * Register all available commands
 */
function registerCommands() {
  // AI test command
  program
    .command('ai-test')
    .description('Test Claude API connection')
    .option('--message', 'send a test message to Claude')
    .option('--verbose', 'show detailed error information')
    .action(async (options) => {
      const cmd = new AICommand();
      await cmd.execute({ test: true, ...options });
    });

  // Config command
  program
    .command('config')
    .description('Manage YDebug configuration')
    .option('--init', 'create a sample configuration file')
    .option('--show', 'show current configuration')
    .option('--reset', 'reset configuration to defaults')
    .option('--confirm', 'confirm reset operation')
    .option('-f, --file <path>', 'configuration file path')
    .action(async (options) => {
      const cmd = new ConfigCommand();
      await cmd.execute(options);
    });

  // Config set subcommand
  program
    .command('config-set <key> <value>')
    .description('Set configuration value')
    .option('-f, --file <path>', 'configuration file path')
    .action(async (key, value, options) => {
      const cmd = new ConfigCommand();
      await cmd.execute({ set: true, key, value, file: options.file });
    });

  // Config get subcommand
  program
    .command('config-get <key>')
    .description('Get configuration value')
    .action(async (key) => {
      const cmd = new ConfigCommand();
      await cmd.execute({ get: true, key });
    });

  // Connect command
  program
    .command('connect')
    .description('Test connection to Xdebug debugger')
    .option('-h, --host <host>', 'debugger host (default: localhost)')
    .option('-p, --port <port>', 'debugger port (default: 9003)')
    .option('-t, --timeout <ms>', 'connection timeout in milliseconds (default: 10000)')
    .action(async options => {
      const cmd = new ConnectCommand();
      await cmd.execute(options);
    });

  // Inspect command
  program
    .command('inspect')
    .description('Inspect variables during debugging session')
    .option('-c, --context <id>', 'context ID to inspect (0=local, 1=global, 2=class)', '0')
    .option('-d, --depth <level>', 'stack frame depth level', '0')
    .option('-f, --filter <pattern>', 'variable name filter (partial match)')
    .option('-j, --json', 'output in JSON format')
    .option('--no-colors', 'disable colored output')
    .option('--max-depth <depth>', 'maximum nesting depth to display', '3')
    .option('--max-length <length>', 'maximum string length to display', '100')
    .option('--list-contexts', 'list available contexts only')
    .option('-h, --host <host>', 'debugger host (default: localhost)')
    .option('-p, --port <port>', 'debugger port (default: 9003)')
    .option('-t, --timeout <ms>', 'connection timeout in milliseconds (default: 10000)')
    .option('-s, --server', 'run in server mode (listen for Xdebug connections)')
    .action(async options => {
      const cmd = new InspectCommand();
      await cmd.execute({
        context: parseInt(options.context, 10),
        depth: parseInt(options.depth, 10),
        filter: options.filter,
        json: options.json,
        noColors: options.noColors,
        maxDepth: parseInt(options.maxDepth, 10),
        maxLength: parseInt(options.maxLength, 10),
        listContexts: options.listContexts,
        host: options.host,
        port: options.port,
        timeout: options.timeout,
        server: options.server
      });
    });

  // Server command
  program
    .command('server')
    .description('Run YDebug in server mode (listen for Xdebug connections)')
    .option('-h, --host <host>', 'server host (default: localhost)', 'localhost')
    .option('-p, --port <port>', 'server port (default: 9003)', '9003')
    .option('--max-connections <num>', 'maximum concurrent connections (default: 10)', '10')
    .option('--session-timeout <ms>', 'session timeout in milliseconds (default: 300000)', '300000')
    .option('--breakpoint-file <file>', 'PHP file for automatic breakpoint')
    .option('--breakpoint-line <line>', 'line number for automatic breakpoint')
    .option('-j, --json', 'output variables in JSON format')
    .option('--no-colors', 'disable colored output')
    .option('--no-auto-inspect', 'disable automatic variable inspection at breakpoints')
    .action(async options => {
      const cmd = new ServerCommand();
      await cmd.execute({
        host: options.host,
        port: parseInt(options.port, 10),
        maxConnections: parseInt(options.maxConnections, 10),
        sessionTimeout: parseInt(options.sessionTimeout, 10),
        breakpointFile: options.breakpointFile,
        breakpointLine: options.breakpointLine ? parseInt(options.breakpointLine, 10) : undefined,
        json: options.json,
        noColors: options.noColors,
        autoInspect: !options.noAutoInspect
      });
    });
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
