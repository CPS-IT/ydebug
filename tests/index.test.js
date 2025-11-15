/**
 * Main Entry Point Tests
 * Tests for src/index.js - the main entry point of the YDebug application
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
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('Main Entry Point (src/index.js)', () => {
  const indexPath = path.resolve(__dirname, '../src/index.js');

  test('should execute without errors', async () => {
    const { stderr } = await execAsync(`node ${indexPath}`);
    expect(stderr).toBe('');
  });

  test('should output expected messages', async () => {
    const { stdout } = await execAsync(`node ${indexPath}`);
    expect(stdout).toContain('YDebug - AI Agent PHP Debugging Solution');
    expect(stdout).toContain('Starting development server...');
  });

  test('should exit with code 0', async () => {
    const { code } = await execAsync(`node ${indexPath}`).catch(e => e);
    // For successful exit(0), exec doesn't throw but returns normally
    expect(code || 0).toBe(0);
  });

  test('should be executable as a script', () => {
    const fs = require('fs');
    const stats = fs.statSync(indexPath);
    // Check that the file exists and is readable
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should have proper shebang for CLI execution', () => {
    const fs = require('fs');
    const content = fs.readFileSync(indexPath, 'utf8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  test('should contain expected TODO comments for future features', () => {
    const fs = require('fs');
    const content = fs.readFileSync(indexPath, 'utf8');
    expect(content).toContain('TODO: Implement CLI framework (Feature 002)');
    expect(content).toContain(
      'TODO: Implement DBGp client integration (Feature 003)'
    );
    expect(content).toContain(
      'TODO: Implement Claude Code agent communication (Feature 013)'
    );
  });

  test('should output to stdout and not stderr for normal operation', async () => {
    const { stdout, stderr } = await execAsync(`node ${indexPath}`);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stderr).toBe('');
  });

  describe('Direct module execution', () => {
    let consoleSpy;
    let processExitSpy;
    let originalArgv;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      originalArgv = process.argv;
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
      process.argv = originalArgv;
      // Clear the require cache to ensure fresh execution
      const indexPath = require.resolve('../src/index.js');
      delete require.cache[indexPath];
    });

    test('should execute main module code when required', () => {
      // Require the main module directly
      require('../src/index.js');

      expect(consoleSpy).toHaveBeenCalledWith('YDebug - AI Agent PHP Debugging Solution');
      expect(consoleSpy).toHaveBeenCalledWith('Starting development server...');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
});
