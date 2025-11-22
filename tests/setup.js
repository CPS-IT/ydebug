/**
 * Jest setup file for YDebug tests
 * Runs before all tests to configure testing environment
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

// Set test environment variables
process.env.NODE_ENV = 'test';

// Configure test timeout
jest.setTimeout(10000);

// Silence console output during tests for better readability
// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// Override console methods to suppress output during tests
// Only show console.error for actual test failures
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};

// Keep console.error but filter out expected error messages from tests
console.error = (...args) => {
  const message = args.join(' ');
  // Only show errors that are not expected test errors
  if (!message.includes('Service \'') && 
      !message.includes('not found in registry') &&
      !message.includes('DBGp connection error') &&
      !message.includes('Command \'test\' may not be') &&
      !message.includes('Unknown command:') &&
      !message.includes('XML parsing failed') &&
      !message.includes('XML parsing error') &&
      !message.includes('Command status failed') &&
      !message.includes('Command failed after') &&
      !message.includes('Failed to get debugger status') &&
      !message.includes('Failed to get context') &&
      !message.includes('Failed to get property') &&
      !message.includes('Failed to analyze') &&
      !message.includes('Invalid client capabilities') &&
      !message.includes('Failed to set breakpoint') &&
      !message.includes('Context error') &&
      !message.includes('Property error') &&
      !message.includes('Analysis service error') &&
      !message.includes('AI service unavailable') &&
      !message.includes('Invalid filename') &&
      !message.includes('Command test_command failed') &&
      !message.includes('Failed to evaluate expression') &&
      !message.includes('Failed to start debugging session') &&
      !message.includes('Connection refused') &&
      !message.includes('Evaluation failed') &&
      !message.includes('invalid syntax') &&
      !message.includes('Failed to write to log file') &&
      !message.includes('ENOENT: no such file or directory') &&
      !message.includes('write EPIPE') &&
      !message.includes('MCP tool execution failed') &&
      !message.includes('MCP resource read failed') &&
      !message.includes('Tool name is required') &&
      !message.includes('Resource URI is required') &&
      !message.includes('Resource not found:') &&
      !message.includes('Command context_names failed') &&
      !message.includes('Command context_get failed') &&
      !message.includes('Command breakpoint_set failed') &&
      !message.includes('Command breakpoint_list failed') &&
      !message.includes('Connection lost') &&
      !message.includes('Invalid context') &&
      !message.includes('Not connected to debugger') &&
      !message.includes('Invalid XML structure') &&
      !message.includes('Invalid breakpoint response') &&
      !message.includes('Network timeout') &&
      !message.includes('Command breakpoint_list timed out')) {
    originalConsole.error(...args);
  }
};

// Store original methods for tests that might need them
global.originalConsole = originalConsole;

// Global test utilities
global.testHelpers = {
  // Add test helper functions here as needed
};
