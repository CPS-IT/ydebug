# YDebug MCP Server User Guide

**Complete Model Context Protocol Integration for Claude Code**

This comprehensive guide covers YDebug's MCP server implementation, which provides Claude Code with direct access to professional PHP debugging capabilities through a standardized protocol.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Getting Started](#getting-started)
- [Available Debugging Tools](#available-debugging-tools)
- [Available Resources](#available-resources)
- [MCP Server Commands](#mcp-server-commands)
- [Diagnostic Features](#diagnostic-features)
- [Configuration Management](#configuration-management)
- [Complete Debugging Session Workflow](#complete-debugging-session-workflow)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)
- [Architecture Overview](#architecture-overview)

## Overview

YDebug provides a comprehensive Model Context Protocol (MCP) server that transforms Claude Code into a powerful PHP debugging partner. The MCP server exposes 20+ debugging tools and 6 specialized resources, enabling Claude Code to perform sophisticated debugging tasks with real-time PHP execution data.

**Key Benefits:**
- **20+ Debugging Tools** - Session management, breakpoints, execution control, variable inspection, and AI analysis
- **6 Specialized Resources** - Real-time access to session state, breakpoints, execution context, variables, history, and analysis results
- **Professional Debugging** - Full Xdebug integration with step-by-step execution control
- **AI-Powered Analysis** - Claude Code can analyze execution patterns, identify issues, and suggest solutions
- **Zero-Configuration** - Automatic discovery and connection with Claude Code
- **Diagnostic Tools** - Built-in health checks, testing, and validation features

## What is MCP?

The Model Context Protocol (MCP) is an open standard developed by Anthropic that enables AI assistants like Claude Code to securely connect to external tools and data sources. YDebug implements a complete MCP server that exposes its debugging capabilities through this standardized protocol.

**MCP Architecture:**
- **JSON-RPC 2.0** - Standardized request/response communication
- **Local Security** - STDIO transport keeps all data on your machine
- **Tool Discovery** - Claude Code automatically discovers available debugging capabilities
- **Resource Access** - Real-time access to debugging session data
- **Capability Negotiation** - Server and client agree on supported features

**Why MCP for Debugging:**
- Claude Code gains access to live PHP execution data
- AI analysis can be performed on actual runtime conditions
- Debugging becomes a collaborative process between developer and AI
- No manual data copying or context switching required

## Quick Start for Developers

### Simple Setup Instructions

**What you need to know:** YDebug provides two ways to debug with Claude Code:

1. **MCP Debugging Tools** - Claude Code controls its own debugging session
2. **YDebug Server + Analysis** - Use YDebug server, then share results with Claude Code

**These are separate systems and cannot be used together.**

### Option 1: MCP Tools (Recommended for AI Analysis)

```bash
# 1. Start MCP server
ydebug mcp-server

# 2. Ask Claude Code to debug
# "Start a debugging session and set breakpoint in my-script.php at line 25"
```

### Option 2: YDebug Server (Recommended for Manual Control)

```bash  
# 1. Start YDebug server
ydebug server --port 9003 --json

# 2. Run PHP with Xdebug
XDEBUG_TRIGGER=1 php my-script.php

# 3. Copy debugging output and share with Claude Code for analysis
```

## Getting Started

### Prerequisites

- YDebug installed and configured
- PHP application with Xdebug enabled
- Claude Code (no additional configuration needed)

### Quick Start

1. **Start the MCP Server:**
   ```bash
   ydebug mcp-server
   ```

2. **Server Ready Output:**
   ```
   YDebug MCP Server for Claude Code Integration
   Transport: stdio

   Claude Code client connected
   MCP Server started successfully

   Server is ready to accept MCP connections from Claude Code

   Using STDIO transport - communicate via stdin/stdout
   Send JSON-RPC 2.0 messages to interact with the server

   MCP Server Status:
     Running: true
     Transport: StdioTransport
     Connected: true
     Capabilities Negotiated: false
     Services: 5 registered
     Resources: 6 registered
     Subscriptions: 0 active
     Cached Resources: 0

   Press Ctrl+C to stop server
   ```

3. **Connect from Claude Code:**
   - Claude Code automatically detects the MCP server
   - Connection occurs immediately when Claude Code starts
   - All debugging tools become available to Claude Code

### Connection Verification

Successful connection displays:
```
Claude Code client connected
```

Disconnection shows:
```
Claude Code client disconnected
```

## Available Debugging Tools

YDebug's MCP server provides 20 specialized debugging tools that Claude Code can use to interact with your PHP application during debugging sessions.

### Session Management Tools

#### `debug_start_session`
Start a new debugging session by connecting to Xdebug.

**Parameters:**
- `host` (string, optional) - Xdebug host (default: localhost)
- `port` (integer, optional) - Xdebug port (default: 9003)
- `timeout` (integer, optional) - Connection timeout in ms (default: 10000)

**Claude Code Usage:**
```
Start a debugging session on localhost port 9003
```

#### `debug_stop_session`
Stop the current debugging session and disconnect from Xdebug.

**Parameters:**
- `sessionId` (string, optional) - Session ID to stop (defaults to current)
- `force` (boolean, optional) - Force stop even if execution is paused (default: false)

**Claude Code Usage:**
```
Stop the current debugging session
```

#### `debug_get_status`
Get the current debugging session status and connection information.

**No parameters required**

**Claude Code Usage:**
```
Show me the current debugging session status
```

### Breakpoint Management Tools

#### `debug_set_breakpoint`
Set a breakpoint at a specific file and line number.

**Parameters:**
- `file` (string, required) - PHP file path
- `line` (integer, required) - Line number
- `condition` (string, optional) - Conditional expression
- `temporary` (boolean, optional) - Remove after first hit (default: false)

**Claude Code Usage:**
```
Set a breakpoint in src/User.php at line 45
```

#### `debug_remove_breakpoint`
Remove a specific breakpoint by ID.

**Parameters:**
- `breakpointId` (string, required) - Breakpoint ID to remove

**Claude Code Usage:**
```
Remove breakpoint with ID bp_123
```

#### `debug_list_breakpoints`
List all active breakpoints with their details.

**Parameters:**
- `includeDisabled` (boolean, optional) - Include disabled breakpoints (default: false)

**Claude Code Usage:**
```
Show me all active breakpoints
```

### Execution Control Tools

#### `debug_step_execution`
Step through code execution (step into, step over, or step out).

**Parameters:**
- `type` (string, required) - Step type: 'into', 'over', or 'out'
- `count` (integer, optional) - Number of steps (default: 1)

**Claude Code Usage:**
```
Step into the next function call
```
```
Step over the current line
```

#### `debug_continue_execution`
Continue execution until the next breakpoint or script end.

**Parameters:**
- `until` (object, optional) - Continue until specific location
  - `file` (string) - File path
  - `line` (integer) - Line number

**Claude Code Usage:**
```
Continue execution until the next breakpoint
```

### Variable Inspection Tools

#### `debug_inspect_variables`
Inspect variables in the current execution context.

**Parameters:**
- `scope` (string, optional) - Variable scope: 'local', 'global', 'superglobal' (default: 'local')
- `maxDepth` (integer, optional) - Maximum object depth (default: 3)
- `filter` (string, optional) - Variable name filter pattern

**Claude Code Usage:**
```
Show me all local variables in the current scope
```

#### `debug_inspect_scope`
Inspect a specific variable scope with detailed information.

**Parameters:**
- `scopeType` (string, required) - Scope type: 'local', 'global', 'superglobal'
- `includeMetadata` (boolean, optional) - Include variable metadata (default: true)

**Claude Code Usage:**
```
Inspect the global variable scope
```

#### `debug_inspect_object`
Inspect a specific object's properties and methods.

**Parameters:**
- `objectId` (string, required) - Object identifier or variable name
- `includePrivate` (boolean, optional) - Include private properties (default: true)
- `includeMethods` (boolean, optional) - Include method information (default: true)

**Claude Code Usage:**
```
Inspect the $user object including private properties
```

#### `debug_evaluate_expression`
Evaluate a PHP expression in the current debugging context.

**Parameters:**
- `expression` (string, required) - PHP expression to evaluate
- `maxLength` (integer, optional) - Maximum result length (default: 1000)
- `silent` (boolean, optional) - Don't throw on evaluation errors (default: false)

**Claude Code Usage:**
```
Evaluate the expression '$user->getName()' in the current context
```

### Context and Analysis Tools

#### `debug_get_execution_context`
Get comprehensive information about the current execution context.

**Parameters:**
- `includeVariables` (boolean, optional) - Include variable information (default: true)
- `includeStackTrace` (boolean, optional) - Include stack trace (default: true)
- `maxDepth` (integer, optional) - Maximum data depth (default: 2)

**Claude Code Usage:**
```
Show me the complete execution context with variables and stack trace
```

#### `debug_get_stack_trace`
Get the current execution stack trace with frame details.

**Parameters:**
- `maxFrames` (integer, optional) - Maximum number of frames (default: 20)
- `includeArguments` (boolean, optional) - Include function arguments (default: true)
- `includeSource` (boolean, optional) - Include source code context (default: false)

**Claude Code Usage:**
```
Show me the stack trace with function arguments
```

### AI-Powered Analysis Tools

#### `debug_analyze_context`
Perform AI analysis of the current debugging context.

**Parameters:**
- `focus` (string, optional) - Analysis focus: 'variables', 'execution', 'performance', 'logic'
- `includeHistory` (boolean, optional) - Include execution history (default: true)
- `depth` (string, optional) - Analysis depth: 'shallow', 'medium', 'deep' (default: 'medium')

**Claude Code Usage:**
```
Analyze the current context focusing on variable states
```

#### `debug_analyze_execution`
Analyze execution flow and identify patterns or issues.

**Parameters:**
- `startFrame` (integer, optional) - Starting stack frame (default: 0)
- `endFrame` (integer, optional) - Ending stack frame (default: current)
- `includePerformance` (boolean, optional) - Include performance metrics (default: true)

**Claude Code Usage:**
```
Analyze the execution flow and identify any performance issues
```

#### `debug_analyze_variables`
Perform detailed analysis of variable states and changes.

**Parameters:**
- `variableNames` (array, optional) - Specific variables to analyze
- `includeHistory` (boolean, optional) - Include variable change history (default: true)
- `detectPatterns` (boolean, optional) - Detect data patterns (default: true)

**Claude Code Usage:**
```
Analyze the variables $user and $order for any issues or patterns
```

#### `debug_explain_behavior`
Get AI explanation of current code behavior and execution state.

**Parameters:**
- `includeContext` (boolean, optional) - Include surrounding code context (default: true)
- `explainVariables` (boolean, optional) - Explain variable states (default: true)
- `suggestImprovements` (boolean, optional) - Suggest code improvements (default: false)

**Claude Code Usage:**
```
Explain what's happening at this point in the code execution
```

#### `debug_identify_issues`
Identify potential issues in the current execution state.

**Parameters:**
- `checkTypes` (array, optional) - Issue types to check: 'logic', 'performance', 'security', 'style'
- `severity` (string, optional) - Minimum severity: 'low', 'medium', 'high' (default: 'medium')
- `includeRecommendations` (boolean, optional) - Include fix recommendations (default: true)

**Claude Code Usage:**
```
Identify any logic or performance issues in the current state
```

#### `debug_suggest_breakpoints`
Get AI suggestions for optimal breakpoint placement.

**Parameters:**
- `file` (string, optional) - Specific file to analyze (defaults to current)
- `analysisType` (string, optional) - Analysis type: 'logical', 'performance', 'error-prone' (default: 'logical')
- `maxSuggestions` (integer, optional) - Maximum suggestions (default: 10)

**Claude Code Usage:**
```
Suggest optimal breakpoint locations for debugging this issue
```

## Available Resources

YDebug provides 6 specialized MCP resources that Claude Code can access to get real-time debugging information.

### `ydebug://debugging-session`
**Current debugging session state and information**

Provides:
- Session status and connection information
- Target script and debugger details
- Session statistics and timing
- Connection health metrics

**Claude Code Usage:**
```
Show me the current debugging session information
```

### `ydebug://active-breakpoints`
**Active breakpoint states and hit information**

Provides:
- List of all active breakpoints
- Breakpoint hit counts and conditions
- File locations and line numbers
- Enabled/disabled status

**Claude Code Usage:**
```
What breakpoints are currently active?
```

### `ydebug://execution-state`
**Current execution position and call stack**

Provides:
- Current file and line position
- Full call stack with frame details
- Execution status (running, paused, stopped)
- Performance timing information

**Claude Code Usage:**
```
Where is the execution currently paused?
```

### `ydebug://variable-context`
**Runtime variable states and values**

Provides:
- Local, global, and superglobal variables
- Variable types and values
- Object properties and structures
- Variable change tracking

**Claude Code Usage:**
```
Show me all variables in the current context
```

### `ydebug://execution-history`
**Execution flow history and step tracking**

Provides:
- Step-by-step execution history
- Function call sequences
- Variable state changes over time
- Performance metrics per step

**Claude Code Usage:**
```
Show me the execution history for this debugging session
```

### `ydebug://analysis-results`
**Cached AI analysis results and insights**

Provides:
- Previous AI analysis results
- Performance insights and recommendations
- Issue identification results
- Suggested improvements and optimizations

**Claude Code Usage:**
```
What analysis results are available for this session?
```

## MCP Server Commands

### Basic Command

Start the MCP server with default settings:
```bash
ydebug mcp-server
```

### Command Options

| Option                | Description           | Default | Notes                                |
|-----------------------|-----------------------|---------|--------------------------------------|
| `--transport <type>`  | Transport protocol    | `stdio` | Only `stdio` currently supported     |
| `--port <port>`       | HTTP port number      | -       | HTTP transport not yet implemented   |
| `--debug`             | Enable debug logging  | `false` | Shows detailed MCP protocol messages |

### Examples

**Standard Usage:**
```bash
# Start with default settings
ydebug mcp-server
```

**Debug Mode:**
```bash
# Enable debug logging to see MCP protocol details
ydebug mcp-server --debug
```

**Future HTTP Support:**
```bash
# HTTP transport (planned feature)
ydebug mcp-server --transport http --port 3000
```

## Claude Code Connection

### Automatic Discovery

Claude Code automatically discovers and connects to MCP servers running on your system. No manual configuration is required.

### Connection Process

1. **Server Advertisement:** YDebug MCP server starts and advertises its capabilities
2. **Discovery:** Claude Code detects the available MCP server
3. **Handshake:** Capability negotiation occurs between Claude Code and YDebug
4. **Ready:** Debugging tools become available to Claude Code

### What Claude Code Can Access

**Complete Debugging Toolkit:**
- **20+ Professional Debugging Tools** - Full session management, breakpoint control, execution stepping, variable inspection, and AI analysis
- **6 Real-Time Resources** - Live access to session state, breakpoints, execution context, variables, history, and analysis results
- **AI-Powered Analysis** - Context analysis, execution flow analysis, variable pattern detection, issue identification, and improvement suggestions
- **Professional Features** - Conditional breakpoints, expression evaluation, multi-scope variable inspection, and comprehensive stack trace analysis

## Complete Debugging Session Workflow

The following workflow demonstrates how to use YDebug MCP server with Claude Code to debug PHP applications:

### Prerequisites Check

First, verify your environment is ready:

```bash
# Check PHP and Xdebug installation
php -v
php -m | grep -i xdebug

# Check Xdebug configuration
php -i | grep -E "xdebug\.(mode|start_with_request|client_port|client_host)"
```

Expected output should show:
```
xdebug.client_host => localhost => localhost
xdebug.client_port => 9003 => 9003
xdebug.mode => debug => debug
xdebug.start_with_request => yes => yes
```

### Step 1: Start YDebug Server

Start the YDebug server to listen for Xdebug connections:

```bash
# Start server with automatic breakpoint at specific location
ydebug server --port 9003 --breakpoint-file /path/to/your-script.php --breakpoint-line 25 --json

# Or start server without automatic breakpoint
ydebug server --port 9003 --json
```

Successful server start shows:
```
[2025-11-17T14:05:00.803Z] [general] INFO: Starting YDebug Server Mode...
Starting YDebug Server on localhost:9003
Max connections: 10
Session timeout: 300000ms

[2025-11-17T14:05:00.812Z] [general] INFO: DBGp server listening on ::1:9003
YDebug Server listening on ::1:9003

Ready for Xdebug connections...

To test, run your PHP script with:
   XDEBUG_TRIGGER=1 php your-script.php

Press Ctrl+C to stop server
```

### Step 2: Trigger PHP Script with Xdebug

In a separate terminal, run your PHP script with Xdebug enabled:

```bash
# Method 1: Use XDEBUG_TRIGGER environment variable (recommended)
XDEBUG_TRIGGER=1 php your-script.php

# Method 2: Use Xdebug configuration directly
php -d xdebug.start_with_request=yes your-script.php
```

When the connection is established, YDebug server will show:
```
[2025-11-17T14:05:13.716Z] [general] INFO: New connection from ::1:56162, session: session_1763388313716_oyddf75oz
[2025-11-17T14:05:13.718Z] [general] INFO: Session session_1763388313716_oyddf75oz received init: PHP 1
[2025-11-17T14:05:13.718Z] [general] INFO: Session session_1763388313716_oyddf75oz initialized: PHP 1
Session session_1763388313716_oyddf75oz connected
   Language: PHP
   Protocol: 1
   File: file:///path/to/your-script.php

Setting automatic breakpoint at /path/to/your-script.php:25
[2025-11-17T14:05:13.719Z] [general] INFO: Session session_1763388313716_oyddf75oz breakpoint set: undefined
```

### Step 3: Understanding Architecture Separation

**Important Architectural Note:** YDebug has two separate debugging systems:

1. **YDebug Server** - Listens for Xdebug connections and handles live debugging sessions
2. **MCP Debugging Tools** - Provide independent debugging capabilities to Claude Code

These systems operate separately and **cannot connect to each other**. The MCP debugging tools require their own debugging session and cannot attach to existing YDebug server sessions.

### Step 4: Choose Your Debugging Approach

You have two options for debugging with Claude Code:

#### Option A: Using MCP Debugging Tools (Independent Session)

Claude Code can start its own debugging session using MCP tools:

```
"Start a debugging session and connect to the PHP application"
```

This creates a separate debugging session that Claude Code controls directly.

#### Option B: YDebug Server Analysis (Server-Managed Session)

Use the YDebug server for live debugging, then describe the results to Claude Code for analysis:

1. **PHP script paused at breakpoint** - The script will remain paused waiting for debugging commands
2. **Inspect variables manually** - Use YDebug server output or CLI tools to gather debugging information  
3. **Share results with Claude Code** - Provide the debugging output to Claude Code for analysis

### Step 5: Debugging Session Interaction

**For MCP Tools (Option A):**

Claude Code uses its own debugging session with MCP tools:

```
# Start independent debugging session
"Start a debugging session and connect to my PHP application"

# Check session status
"Show me the current debugging session status"

# Set breakpoints and inspect
"Set a breakpoint in the processPayment function"
"What variables are available in the current scope?"

# Control execution  
"Step into the next function call"
"Continue execution until the next breakpoint"

# Analyze and evaluate
"Analyze the current execution context"
"Evaluate the expression '$order->getTotal()'"
```

**For YDebug Server Analysis (Option B):**

Use YDebug server for debugging, then share results with Claude Code:

```
# 1. YDebug server shows variables at breakpoint
# (Copy the variable output from server logs)

# 2. Share with Claude Code for analysis
"Here are the variables at the current breakpoint: [paste YDebug output]. 
 Can you analyze this state and identify any issues?"

# 3. Get AI insights
"Based on these variable values, what should I check next?"
"Are there any patterns or problems you notice?"
```

### Step 6: Session Cleanup

When debugging is complete:

1. **Stop the debugging session** (optional - Claude Code can do this):
   - Use Claude Code: "Stop the current debugging session"
   - Or manually: Ctrl+C in the PHP script terminal

2. **Stop the YDebug server**:
   - Press Ctrl+C in the YDebug server terminal

### Workflow Summary

```
Terminal 1: Start YDebug Server
┌─────────────────────────────────────┐
│ ydebug server --port 9003 --json   │
│ [Server listening on port 9003]    │
└─────────────────────────────────────┘

Terminal 2: Run PHP Script
┌─────────────────────────────────────┐
│ XDEBUG_TRIGGER=1 php script.php    │
│ [Script paused at breakpoint]      │
└─────────────────────────────────────┘

Claude Code: Debug with MCP Tools
┌─────────────────────────────────────┐
│ "Show me the current variables"     │
│ "Step through the next function"    │
│ "Analyze the execution flow"        │
└─────────────────────────────────────┘
```

### Important Notes

1. **Server First**: Always start the YDebug server before running the PHP script
2. **Script Pauses**: The PHP script will pause at breakpoints - this is expected behavior
3. **Session Active**: Debugging tools only work when there's an active session (script paused)
4. **Automatic Cleanup**: Sessions are automatically cleaned up when the PHP script finishes or times out

## Current Capabilities

### JSON-RPC 2.0 Protocol

- Complete protocol implementation
- Request/response message handling
- Notification support
- Batch request processing
- Standard error responses

### Transport Layer

- **STDIO Transport:** Local communication via standard input/output
- **HTTP Transport:** Foundation implemented (full support planned)
- Connection management and error handling
- Automatic reconnection support

### Service Registry

- Dependency injection system for MCP services
- Dynamic service registration
- Service lifecycle management
- Status reporting and health checks

### Capability Management

- Automatic feature negotiation with MCP clients
- Server capability advertisement
- Protocol version agreement
- Client-server handshake implementation

## Configuration Options

### Environment Variables

The MCP server respects YDebug's configuration system:

```bash
# Enable debug logging
export YDEBUG_LOG_LEVEL=debug

# Set custom Xdebug connection settings
export YDEBUG_XDEBUG_HOST=localhost
export YDEBUG_XDEBUG_PORT=9003
```

### Configuration File

MCP server settings can be managed through YDebug's configuration:

```bash
# View current configuration
ydebug config --show

# Set configuration values
ydebug config-set mcp.transport stdio
ydebug config-set mcp.debug false
```

### Runtime Options

Configure the server at startup:
```bash
# Enable debug mode
ydebug mcp-server --debug

# Specify transport (when multiple options available)
ydebug mcp-server --transport stdio
```

## Troubleshooting

### Server Won't Start

**Problem:** MCP server fails to start
```
Failed to start MCP server: Transport error
```

**Solutions:**
1. Check if another MCP server is running
2. Verify Node.js permissions
3. Try with debug mode: `ydebug mcp-server --debug`

### Claude Code Can't Connect

**Problem:** Claude Code doesn't see the MCP server

**Solutions:**
1. Ensure server is running: `ydebug mcp-server`
2. Check server output for "Server is ready" message
3. Restart Claude Code
4. Try debug mode to see connection attempts

### Connection Drops

**Problem:** Server shows repeated connect/disconnect messages

**Solutions:**
1. Check system resources (memory, CPU)
2. Review debug logs for errors
3. Restart the MCP server
4. Check for conflicting processes

### Debug Information

Enable debug logging for detailed troubleshooting:
```bash
ydebug mcp-server --debug
```

This shows:
- MCP protocol messages
- Client connection events
- Service registration status
- Error details and stack traces

### Debugging Session Issues

**Problem:** "No debugging session is active" when using MCP tools

**Cause:** MCP debugging tools operate independently and cannot connect to YDebug server sessions

**Solutions:**
1. **For MCP tools:** Use Claude Code to start its own session: "Start a debugging session"
2. **For YDebug server:** Use manual analysis approach (copy results to Claude Code)
3. Choose one approach - they cannot be used simultaneously

**Problem:** PHP script exits immediately without pausing

**Cause:** No breakpoint set or Xdebug not connecting properly

**Solutions:**
1. Use automatic breakpoint: `--breakpoint-file /path/to/script.php --breakpoint-line 25`
2. Check Xdebug configuration: `php -i | grep xdebug`
3. Verify server is listening before running script
4. Check for "connection established" message in server logs

**Problem:** PHP script "hangs" or times out

**Cause:** Script is correctly paused at breakpoint waiting for debugging commands

**Solutions:**
- This is expected behavior when debugging is active
- Use Claude Code MCP tools to interact with the paused script
- Continue execution: "Continue execution until the next breakpoint"
- Or stop debugging: "Stop the current debugging session"

**Problem:** "Xdebug: Could not connect to debugging client"

**Cause:** YDebug server not listening when PHP script tries to connect

**Solutions:**
1. Start YDebug server first, then run PHP script
2. Ensure correct port (9003) is used in both server and Xdebug config
3. Check if port is already in use: `lsof -i :9003`
4. Verify Xdebug client_host setting matches server host

### Common Error Messages

| Message                         | Cause                           | Solution                       |
|---------------------------------|---------------------------------|--------------------------------|
| `Transport not initialized`     | Server startup issue            | Restart server                 |
| `Method not found`              | Client sent unknown request     | Update Claude Code             |
| `STDIO transport error`         | Communication issue             | Check system permissions       |
| `Service registration failed`   | Configuration problem           | Check YDebug configuration     |
| `No debugging session is active` | No PHP script connected       | Follow debugging workflow steps |
| `Connection timeout`            | YDebug server not reachable     | Check server status and port   |

## Architecture Details

### MCP Server Components

```
MCPServer
├── ServiceRegistry     # Dependency injection
├── JsonRpcHandler     # JSON-RPC 2.0 protocol
├── CapabilityManager  # Feature negotiation
└── Transport
    └── StdioTransport # STDIO communication
```

### Communication Flow

1. **Startup:** MCP server initializes and starts STDIO transport
2. **Connection:** Claude Code connects via STDIO
3. **Handshake:** Capabilities negotiated through JSON-RPC
4. **Operation:** Tool calls handled through protocol handlers
5. **Cleanup:** Graceful shutdown on termination

### Message Format

All communication uses JSON-RPC 2.0:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": []
  }
}
```

### Security Model

- **Local-only communication** via STDIO
- **No network exposure** of debugging data
- **Process isolation** between MCP server and Claude Code
- **Controlled access** to debugging capabilities

## Future Features

### Planned MCP Tools (Roadmap)

**Variable Inspection Tools:**
- Direct variable access from Claude Code
- Context-aware variable filtering
- Real-time variable watching
- Data transformation analysis

**Breakpoint Management:**
- Set and remove breakpoints through Claude Code
- Conditional breakpoint support
- Breakpoint hit analysis
- Automatic breakpoint optimization

**Session Control:**
- Start and stop debugging sessions
- Session status monitoring
- Multi-session management
- Session data persistence

**Code Analysis:**
- AI-powered code analysis during debugging
- Performance bottleneck detection
- Logic flow analysis
- Error pattern recognition

### HTTP Transport

Future HTTP+SSE transport will enable:
- Remote debugging scenarios
- Web-based debugging interfaces
- Integration with cloud development environments
- Multi-client debugging sessions

### Enhanced Capabilities

- **Resource Discovery:** Access to PHP files and project structure
- **Real-time Notifications:** Debugging events pushed to Claude Code
- **Batch Operations:** Multiple debugging operations in single requests
- **Custom Tool Registration:** Plugin system for specialized debugging tools

## Best Practices

### Development Workflow

1. **Start MCP Server First:** Always start the MCP server before initiating debugging
2. **Use Debug Mode:** Enable debug logging during development and troubleshooting
3. **Monitor Connections:** Watch for connection status messages
4. **Graceful Shutdown:** Use Ctrl+C to properly stop the server

### Performance Optimization

- **Resource Management:** Monitor memory usage during long debugging sessions
- **Connection Limits:** Be aware of system limits on concurrent connections
- **Log Management:** Use appropriate log levels to balance detail and performance

### Security Considerations

- **Local Development Only:** Current STDIO transport is designed for local use
- **Process Permissions:** Ensure proper file system permissions
- **Debug Data:** Be cautious with debug logs containing sensitive information
- **Network Security:** Future HTTP transport will include authentication mechanisms

## Support and Resources

### Documentation

- [YDebug README](../../README.md) - Main project documentation
- [Configuration Guide](configuration.md) - Complete configuration reference
- [Architecture Overview](../architecture/ArchitecturalOverview.md) - System architecture

### Getting Help

- **Debug Mode:** First step for troubleshooting
- **Log Files:** Check YDebug logs for error details
- **Configuration:** Verify YDebug configuration with `ydebug config --show`
- **Testing:** Use `ydebug connect` to test Xdebug connectivity

### Feature Requests

The MCP server foundation is complete and ready for expansion. Future debugging tools will be added based on:
- User feedback and requirements
- Claude Code integration needs
- PHP debugging best practices
- Community contributions

The MCP integration represents a significant step toward AI-assisted development workflows, providing a foundation for sophisticated debugging capabilities that leverage both traditional debugging tools and AI assistance.