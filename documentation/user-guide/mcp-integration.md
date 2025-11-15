# MCP Integration Guide

**Model Context Protocol (MCP) Server for Claude Code Integration**

This guide covers YDebug's MCP server functionality, which enables seamless integration with Claude Code for AI-assisted PHP debugging.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Getting Started](#getting-started)
- [MCP Server Commands](#mcp-server-commands)
- [Claude Code Connection](#claude-code-connection)
- [Current Capabilities](#current-capabilities)
- [Configuration Options](#configuration-options)
- [Troubleshooting](#troubleshooting)
- [Architecture Details](#architecture-details)
- [Future Features](#future-features)

## Overview

YDebug includes a complete Model Context Protocol (MCP) server implementation that allows Claude Code to connect directly to YDebug and use its debugging capabilities as if they were built-in tools.

**Key Benefits:**
- Seamless Claude Code integration without manual setup
- AI-assisted debugging with real execution context
- Access to professional PHP debugging tools through Claude Code
- Real-time variable inspection and code analysis

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI tools like Claude Code to securely connect to external data sources and tools. YDebug's MCP server exposes debugging functionality through this protocol.

**MCP provides:**
- Standardized communication between AI tools and external services
- Secure, local connections without exposing sensitive data
- Tool and resource discovery for AI assistants
- Capability negotiation between clients and servers

## Getting Started

### Prerequisites

- YDebug installed and configured
- PHP application with Xdebug enabled
- Claude Code (no additional configuration needed)

### Basic Usage

1. **Start the MCP Server:**
   ```bash
   ydebug mcp-server
   ```

2. **Server Output:**
   ```
   YDebug MCP Server for Claude Code Integration
   Transport: stdio
   
   MCP Server started successfully
   
   Server is ready to accept MCP connections from Claude Code
   
   Using STDIO transport - communicate via stdin/stdout
   Send JSON-RPC 2.0 messages to interact with the server
   
   Press Ctrl+C to stop server
   ```

3. **Connect from Claude Code:**
   - Claude Code will automatically detect and connect to the MCP server
   - No additional configuration required

### Verification

The server will display connection status:
```
Claude Code client connected
```

When Claude Code disconnects:
```
Claude Code client disconnected
```

## MCP Server Commands

### Basic Command

Start the MCP server with default settings:
```bash
ydebug mcp-server
```

### Command Options

| Option | Description | Default | Notes |
|--------|-------------|---------|-------|
| `--transport <type>` | Transport protocol | `stdio` | Only `stdio` currently supported |
| `--port <port>` | HTTP port number | - | HTTP transport not yet implemented |
| `--debug` | Enable debug logging | `false` | Shows detailed MCP protocol messages |

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

Currently available through the MCP server:
- Server status and health checks
- Basic capability information
- Foundation for future debugging tools

**Planned capabilities (roadmap):**
- Variable inspection tools
- Breakpoint management
- Session control
- Real-time debugging assistance

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

### Common Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| `Transport not initialized` | Server startup issue | Restart server |
| `Method not found` | Client sent unknown request | Update Claude Code |
| `STDIO transport error` | Communication issue | Check system permissions |
| `Service registration failed` | Configuration problem | Check YDebug configuration |

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