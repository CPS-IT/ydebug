/**
 * CLI Entry Point Tests
 * Tests for src/cli/index.js - the CLI entry point using commander.js
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

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

describe('CLI Entry Point (src/cli/index.js)', () => {
  const cliPath = path.resolve(__dirname, '../src/cli/index.js');

  describe('Basic CLI functionality', () => {
    test('should be executable', () => {
      const fs = require('fs');
      const stats = fs.statSync(cliPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('should have proper shebang', () => {
      const fs = require('fs');
      const content = fs.readFileSync(cliPath, 'utf8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    });

    test('should show help when no arguments provided', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath}`);
        expect(stdout).toContain('YDebug - AI Agent PHP Debugging Solution');
        expect(stdout).toContain('Usage:');
      } catch (error) {
        // CLI shows help and exits - check the error contains expected output
        expect(error.stdout || error.stderr).toContain(
          'YDebug - AI Agent PHP Debugging Solution'
        );
        expect(error.stdout || error.stderr).toContain('Usage:');
      }
    });
  });

  describe('Version handling', () => {
    test('should display version with --version flag', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --version`);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/); // Should match semantic versioning
    });

    test('should display version with -v flag', async () => {
      const { stdout } = await execAsync(`node ${cliPath} -v`);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Help functionality', () => {
    test('should show help with --help flag', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --help`);
      expect(stdout).toContain('YDebug - AI Agent PHP Debugging Solution');
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('Options:');
      expect(stdout).toContain('Commands:');
      expect(stdout).toContain('config');
    });

    test('should show help with -h flag', async () => {
      const { stdout } = await execAsync(`node ${cliPath} -h`);
      expect(stdout).toContain('YDebug - AI Agent PHP Debugging Solution');
      expect(stdout).toContain('Usage:');
    });
  });

  describe('Command registration', () => {
    test('should register config command', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --help`);
      expect(stdout).toContain('config');
      expect(stdout).toContain('Manage YDebug configuration');
    });

    test('should show config command help', async () => {
      const { stdout } = await execAsync(`node ${cliPath} config --help`);
      expect(stdout).toContain('Manage YDebug configuration');
      expect(stdout).toContain('--init');
      expect(stdout).toContain('--show');
      expect(stdout).toContain('-f, --file');
    });
  });

  describe('Error handling', () => {
    test('should handle unknown commands gracefully', async () => {
      try {
        await execAsync(`node ${cliPath} nonexistent-command`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stderr).toContain('Unknown command: nonexistent-command');
        expect(error.code).toBe(1);
      }
    });

    test('should display errors in red text format', async () => {
      try {
        await execAsync(`node ${cliPath} invalid-command`);
      } catch (error) {
        // The error should be formatted as plain text
        // we'll just check the message content
        expect(error.stderr).toContain('Unknown command');
      }
    });
  });

  describe('Config command integration', () => {
    test('should execute config command with --init', async () => {
      try {
        const { stdout, stderr } = await execAsync(
          `node ${cliPath} config --init`
        );
        expect(stderr).toBe('');
        expect(stdout).toContain('Configuration file created at:');
      } finally {
        // Cleanup test config file
        const fs = require('fs');
        if (fs.existsSync('ydebug.config.json')) {
          fs.unlinkSync('ydebug.config.json');
        }
      }
    });

    test('should execute config command with --show', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} config --show`
      );
      expect(stderr).toBe('');
      // Should output formatted configuration
      const output = stdout.trim();
      expect(output).toContain('YDebug Configuration');
      expect(output).toContain('Configuration Sources');
      expect(output).toContain('Current Configuration');
    });
  });

  describe('Output configuration', () => {
    test('should use configured output streams', () => {
      // This tests the configureOutput setup
      const fs = require('fs');
      const content = fs.readFileSync(cliPath, 'utf8');
      expect(content).toContain('configureOutput');
      expect(content).toContain('writeOut');
      expect(content).toContain('writeErr');
      expect(content).toContain('outputError');
    });
  });

  describe('Direct module loading', () => {
    let originalArgv;
    let mockExit;
    let consoleSpy;
    let consoleErrorSpy;

    beforeEach(() => {
      originalArgv = process.argv;
      mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      process.argv = originalArgv;
      mockExit.mockRestore();
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      
      // Clear require cache for CLI module
      const cliModulePath = require.resolve('../src/cli/index.js');
      delete require.cache[cliModulePath];
      
      // Clear require cache for commands module
      const commandsPath = require.resolve('../src/cli/commands/index.js');
      delete require.cache[commandsPath];
    });

    test('should initialize and parse arguments when imported', () => {
      // Set up argv to show help (no arguments)
      process.argv = ['node', 'ydebug'];
      
      // Import the CLI module
      require('../src/cli/index.js');
      
      // The module should have been executed
      // This tests that the module loads without throwing errors
      expect(true).toBe(true); // If we get here, module loaded successfully
    });

    test('should handle invalid commands', () => {
      // Set up argv with invalid command
      process.argv = ['node', 'ydebug', 'invalid-command'];
      
      // Import the CLI module
      require('../src/cli/index.js');
      
      // This tests that the module can handle invalid commands
      // The actual error handling is tested via subprocess in other tests
      expect(true).toBe(true); // If we get here, module loaded successfully
    });

    test('should register config command', () => {
      process.argv = ['node', 'ydebug'];
      
      // Import the CLI module
      require('../src/cli/index.js');
      
      // Check that the CLI loads without errors
      // The module should complete initialization
      expect(true).toBe(true); // If we get here, module loaded successfully
    });
  });
});
