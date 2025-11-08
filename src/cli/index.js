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
const { ConfigCommand } = require('./commands');

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
  // Config command
  program
    .command('config')
    .description('Manage YDebug configuration')
    .option('--init', 'create a sample configuration file')
    .option('--show', 'show current configuration')
    .option('-f, --file <path>', 'configuration file path')
    .action(async options => {
      const cmd = new ConfigCommand();
      await cmd.execute(options);
    });
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
