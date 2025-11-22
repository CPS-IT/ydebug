#!/usr/bin/env node
/**
 * MCP Server Wrapper for Claude MCP compatibility
 * Ensures the server stays alive and handles stdin properly
 */

const { spawn } = require('child_process');

// Path to the actual ydebug binary
const ydebugPath = '/opt/homebrew/bin/ydebug';

// Start the MCP server process
const server = spawn(ydebugPath, ['mcp-server', '--debug'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  env: process.env
});

// Forward signals
process.on('SIGINT', () => {
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});

// Handle server exit
server.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code);
  }
});

// Keep wrapper alive
server.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('MCP server error:', err);
  process.exit(1);
});