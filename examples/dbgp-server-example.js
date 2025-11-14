#!/usr/bin/env node
/**
 * YDebug Server v2 - With Step Control
 * Properly handles breakpoints and execution flow
 */
/* eslint-disable */
const net = require('net');
const { XMLParser } = require('fast-xml-parser');

let server;
let currentSession = null;
let sessionStartTime = null;

console.log('🚀 YDebug Server v2 - With Step Control');
console.log('======================================');
console.log('Starting DBGp server on localhost:9003');
console.log('Waiting for Xdebug connections...');
console.log('');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: true
});

function parseDbgpMessage(data) {
  try {
    const xml = data.toString();
    const parsed = parser.parse(xml);
    return parsed;
  } catch (error) {
    console.log('⚠️ XML Parse error:', error.message);
    return null;
  }
}

function formatVariables(properties) {
  if (!properties) return 'No variables found';

  if (!Array.isArray(properties)) {
    properties = [properties];
  }

  console.log('🎯 VARIABLES FOUND:');
  console.log('==================');

  let localVarCount = 0;
  properties.forEach(prop => {
    const name = prop.name || 'unknown';
    const type = prop.type || 'unknown';
    const encoding = prop.encoding || 'none';
    let value = prop['#text'] || prop._ || '';

    // Skip uninitialized variables and superglobals for cleaner output
    if (type === 'uninitialized' || name.startsWith('$_') || name === '$argc' || name === '$argv') {
      return;
    }

    localVarCount++;

    // Decode base64 if needed
    if (encoding === 'base64' && value) {
      try {
        value = Buffer.from(value, 'base64').toString('utf8');
      } catch (e) {
        console.log(`⚠️ Failed to decode base64 for ${name}`);
      }
    }

    console.log(`${name} (${type}): "${value}"`);

    // Handle nested properties
    if (prop.property) {
      console.log(`  └── Has ${Array.isArray(prop.property) ? prop.property.length : 1} child properties`);
    }
  });

  if (localVarCount === 0) {
    console.log('No local variables found (script may not be paused at breakpoint)');
  } else {
    console.log(`\nTotal: ${localVarCount} local variable(s) displayed`);
  }
}

server = net.createServer((socket) => {
  const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`📡 Xdebug connected from ${clientAddress}`);

  currentSession = socket;
  sessionStartTime = Date.now();
  let buffer = '';
  let transactionId = 1;
  let hasSetBreakpoint = false;

  // Set a breakpoint and continue execution
  function setBreakpointAndContinue() {
    console.log('🎯 Setting breakpoint at line 22 (where variables are defined)...');
    // Set breakpoint at line 22 of the script
    socket.write(`breakpoint_set -i ${transactionId++} -t line -f file:///Users/d.wenzel/projekt/ydebug/ydebug-breakpoint-test.php -n 22\0`);

    setTimeout(() => {
      console.log('▶️ Continuing execution until breakpoint...');
      socket.write(`run -i ${transactionId++}\0`);
    }, 100);
  }

  // Inspect variables when paused at breakpoint
  function inspectVariables() {
    console.log('🔍 Inspecting variables at breakpoint...');

    // Get local variables (context 0)
    setTimeout(() => {
      console.log('📤 Requesting local variables...');
      socket.write(`context_get -i ${transactionId++} -c 0\0`);
    }, 100);
  }

  socket.on('data', (data) => {
    buffer += data.toString();

    // DBGp messages are null-terminated
    while (buffer.includes('\0')) {
      const nullIndex = buffer.indexOf('\0');
      const message = buffer.substring(0, nullIndex);
      buffer = buffer.substring(nullIndex + 1);

      console.log(`📨 Received (${message.length} chars):`, message.substring(0, 100) + '...');

      // Parse the message
      const parsed = parseDbgpMessage(message);

      if (parsed && parsed.init) {
        console.log('✅ Xdebug initialization received');
        console.log(`Session: ${parsed.init.session || 'unknown'}`);
        console.log(`Language: ${parsed.init.language || 'unknown'}`);
        console.log(`Protocol: ${parsed.init.protocol_version || 'unknown'}`);
        console.log('');

        // Set breakpoint and continue after init
        setBreakpointAndContinue();

      } else if (parsed && parsed.response) {
        const command = parsed.response.command;
        const status = parsed.response.status;

        console.log(`✅ Response for: ${command} (status: ${status || 'unknown'})`);

        if (command === 'breakpoint_set') {
          console.log('📍 Breakpoint set successfully');
          hasSetBreakpoint = true;

        } else if (command === 'run' && status === 'break') {
          console.log('⏸️ PAUSED AT BREAKPOINT! Variables should be in scope now.');
          inspectVariables();

        } else if (command === 'context_get') {
          const contextId = parsed.response.context || '0';
          console.log(`📋 Context ${contextId} variables:`);

          if (parsed.response.property) {
            formatVariables(parsed.response.property);
          } else {
            console.log('No variables in this context');
          }
          console.log('');

          // Continue execution after inspection
          setTimeout(() => {
            console.log('▶️ Continuing script execution...');
            socket.write(`run -i ${transactionId++}\0`);
          }, 1000);
        }
      }
    }
  });

  socket.on('close', () => {
    const duration = sessionStartTime ? Date.now() - sessionStartTime : 0;
    console.log(`📡 Xdebug disconnected (session lasted ${duration}ms)`);
    currentSession = null;
  });

  socket.on('error', (err) => {
    console.log('❌ Socket error:', err.message);
  });
});

server.listen(9003, 'localhost', () => {
  console.log('✅ YDebug Server v2 listening on localhost:9003');
  console.log('');
  console.log('🧪 Now run your PHP script:');
  console.log('   XDEBUG_TRIGGER=1 php ydebug-breakpoint-test.php');
  console.log('');
  console.log('💡 Press Ctrl+C to stop server');
});

server.on('error', (err) => {
  console.log('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log('💡 Port 9003 is in use. Stop PhpStorm debugger first.');
  }
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down YDebug Server...');
  if (currentSession) {
    currentSession.end();
  }
  server.close(() => {
    console.log('✅ YDebug Server stopped');
    process.exit(0);
  });
});
