# YDebug - AI Agent PHP Debugging Solution

[![CI](https://github.com/CPS-IT/ydebug/actions/workflows/ci.yml/badge.svg)](https://github.com/CPS-IT/ydebug/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/CPS-IT/ydebug/branch/develop/graph/badge.svg)](https://codecov.io/gh/CPS-IT/ydebug)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![npm version](https://badge.fury.io/js/ydebug.svg)](https://badge.fury.io/js/ydebug)

YDebug enables AI agents to step through PHP applications in real-time, providing insight into code execution and application behavior through the DBGp protocol and Xdebug integration.

## Core Concept

Traditional debugging requires human developers to manually set breakpoints, step through code, and inspect variables. YDebug extends this capability to AI agents, allowing them to:

- Understand the actual execution flow of PHP applications
- Observe how data transforms throughout the application lifecycle
- Inspect variable states and values at any point during execution
- Gain contextual understanding of application behavior beyond static code analysis

## Benefits

**For AI Assistance:**

- Enables AI to provide debugging help based on actual execution context
- Allows AI to understand complex application flows that are difficult to trace through static analysis
- Provides real-time insight into variable states and data transformations

**For Developers:**

- Creates a collaborative debugging environment where AI can actively participate in problem-solving
- Enables AI to suggest fixes based on observed runtime behavior
- Offers a new paradigm for AI-assisted development and debugging

## Requirements

YDebug supports the current LTS and maintenance LTS versions of Node.js:

- **Node.js 22.x** (Current LTS)
- **Node.js 24.x** (Current LTS)

We follow Node.js LTS release schedule and support only the current LTS and the previous LTS version to ensure security and performance.

## Project Status

**Current Phase:** Prototype Development (Feature Complete)  
**Completed Features:**
- [x] Project architecture and planning (7 ADRs completed)
- [x] CLI framework with Commander.js and comprehensive command set
- [x] DBGp protocol implementation with direct socket communication
- [x] Xdebug connection testing and validation
- [x] Comprehensive configuration management with environment variables
- [x] Variable inspection and debugging core functionality
- [x] Server mode for listening to Xdebug connections
- [x] Breakpoint management and session handling
- [x] Basic logging system with configurable levels
- [x] **MCP Server Integration** - Full Model Context Protocol server for Claude Code
- [x] AI-powered analysis integration with Claude API (DEMO)
- [x] Comprehensive test suite (1800+ tests across 51 files)

## Claude Code Integration via MCP

YDebug includes a complete **Model Context Protocol (MCP) server** that enables seamless integration with Claude Code. This allows Claude Code to access YDebug's debugging capabilities as if they were built-in tools.

### What is MCP Integration?

The Model Context Protocol (MCP) is a standardized way for AI tools like Claude Code to connect to external services and use them as tools. YDebug's MCP server exposes debugging functionality through this protocol, enabling Claude Code to:

- Connect to PHP applications through Xdebug
- Inspect variables and execution state
- Set and manage breakpoints
- Analyze debugging data with AI capabilities
- Provide real-time debugging assistance

### Key Benefits

**For Claude Code Users:**
- Access professional PHP debugging tools without manual setup
- AI-assisted debugging with real execution context
- Seamless integration with existing Claude Code workflows
- No need to learn YDebug CLI commands

**For Developers:**
- Enhanced debugging capabilities with AI assistance
- Real-time code analysis during debugging sessions
- Collaborative debugging environment with AI participation
- Bridge between traditional debugging and AI-powered development

### Getting Started with MCP

1. **Start the MCP Server:**
   ```bash
   ydebug mcp-server
   ```

2. **Connect from Claude Code:**
   The MCP server will be available for Claude Code to connect to via STDIO transport

3. **Use Debugging Tools:**
   Claude Code will have access to debugging tools and can help you debug PHP applications

### Current MCP Capabilities

- **JSON-RPC 2.0 Protocol:** Complete implementation with proper message handling
- **STDIO Transport:** Local connection support for Claude Code
- **Service Registry:** Foundation for debugging tool registration
- **Capability Negotiation:** Automatic feature negotiation with MCP clients
- **Error Handling:** Comprehensive error reporting and recovery

### Future MCP Tools (Roadmap)

The MCP server foundation is complete and ready for debugging tool integration:
- **Variable Inspection Tools:** Direct variable access from Claude Code
- **Breakpoint Management:** Set and manage breakpoints through MCP
- **Session Control:** Start, stop, and manage debugging sessions
- **Code Analysis:** AI-powered analysis of debugging data

## Requirements

### System Requirements
- **Node.js:** 18.0 or higher
- **PHP:** 7.4 or higher with **Xdebug 3.0+**
- **Package Manager:** npm or yarn
- **Operating System:** macOS, Linux, or Windows

### Optional Requirements
- **Claude API Key:** For AI analysis features (set ANTHROPIC_API_KEY environment variable)

## Installation

### Quick Install

```bash
# Clone repository
git clone <repository-url>
cd ydebug

# Install dependencies
npm install

# Verify installation
npm test
```

### Global CLI Installation

```bash
# Link for global usage (optional)
npm link

# Then use globally
ydebug --help
```

## Configuration

### 1. Initialize YDebug Configuration

```bash
# Create default configuration file
node src/cli/index.js config --init

# View current configuration
node src/cli/index.js config --show
```

### 2. Configure Xdebug in PHP

Add to your `php.ini` or create separate `xdebug.ini`:

```ini
zend_extension=xdebug
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_host=localhost
xdebug.client_port=9003
xdebug.log=/tmp/xdebug.log
```

### 3. Test Connection

```bash
# Test Xdebug connection
node src/cli/index.js connect

# Test with custom settings
node src/cli/index.js connect --host 127.0.0.1 --port 9004
```

### 4. Configure Claude API (Optional)

For AI analysis features:

```bash
# Set API key via environment variable
export ANTHROPIC_API_KEY="your-api-key-here"

# Test API connection
node src/cli/index.js ai-test
```

## Available Commands

### Configuration Management
```bash
config --init                    # Create sample configuration file
config --show                    # Display current configuration  
config --reset --confirm         # Reset to defaults
config-set <key> <value>         # Set configuration value
config-get <key>                 # Get configuration value
```

### Connection and Testing
```bash
connect                          # Test Xdebug connection
connect --host <host>            # Test with custom host
connect --port <port>            # Test with custom port  
connect --timeout <ms>           # Test with custom timeout
ai-test                          # Test Claude API connection
ai-test --message                # Send test message to Claude
```

### Variable Inspection and Debugging
```bash
inspect                          # Inspect variables in debugging session
inspect --context <id>           # Inspect specific context (0=local, 1=global, 2=class)
inspect --depth <level>          # Set stack frame depth level
inspect --filter <pattern>       # Filter variables by name pattern
inspect --json                   # Output in JSON format
inspect --list-contexts          # List available contexts only
inspect --server                 # Run in server mode
```

### Server Mode Operations
```bash
server                           # Run YDebug in server mode
server --host <host>             # Custom server host (default: localhost)
server --port <port>             # Custom server port (default: 9003)
server --max-connections <num>   # Maximum concurrent connections
server --session-timeout <ms>    # Session timeout in milliseconds
server --breakpoint-file <file>  # PHP file for automatic breakpoint
server --breakpoint-line <line>  # Line number for automatic breakpoint
server --json                    # Output variables in JSON format
server --no-colors               # Disable colored output
server --no-auto-inspect         # Disable automatic variable inspection
```

### MCP Server Integration
```bash
mcp-server                       # Start MCP server for Claude Code integration
mcp-server --transport <type>    # Transport type (stdio, http) - default: stdio
mcp-server --port <port>         # Port for HTTP transport (not yet implemented)
mcp-server --debug               # Enable debug logging
```

The MCP server enables Claude Code to connect directly to YDebug and use debugging tools through the Model Context Protocol. This provides a seamless integration where Claude Code can access debugging capabilities as if they were built-in tools.

### AI Analysis (DEMO Features)
```bash
analyze                          # AI analysis with sample context (DEMO)
analyze --type <type>            # Analysis type: variableAnalysis, errorAnalysis, performanceAnalysis, logicAnalysis
analyze --file <file>            # PHP file to analyze  
analyze --line <line>            # Line number for analysis context
analyze --context <data>         # Context data (JSON string or file path)
analyze --variables <data>       # Variables data (JSON string or file path)
analyze --expected-behavior <desc> # Expected behavior description
analyze --max-tokens <tokens>    # Maximum tokens for AI response (default: 2000)
analyze --json                   # Output in JSON format
analyze --verbose                # Show detailed output
```

**IMPORTANT:** The `analyze` command is currently a **DEMO feature** that works with sample context data to demonstrate AI analysis capabilities. It requires the ANTHROPIC_API_KEY environment variable.

## Documentation

### User Guides

| Guide | Description |
|-------|-------------|
| [MCP Integration](documentation/user-guide/mcp-integration.md) | **Model Context Protocol server for Claude Code integration** |
| [Configuration Management](documentation/user-guide/configuration.md) | Complete configuration setup and management |
| [Connect Command](documentation/user-guide/connect-command.md) | Xdebug connection testing and troubleshooting |
| [Analyze Command](documentation/user-guide/analyze-command.md) | AI-powered debugging analysis (DEMO) |
| [Server Mode](documentation/user-guide/server-mode.md) | Running YDebug in server mode |
| [Claude API Setup](documentation/user-guide/claude-api-setup.md) | Claude API configuration and setup |
| [Claude API Usage](documentation/user-guide/claude-api-usage.md) | Using AI analysis features |

### Project Planning and Architecture

| Document | Description |
|----------|-------------|
| [Project Goal](documentation/plan/goal.md) | Original vision and concept |
| [Prototype Scope](documentation/plan/prototype.md) | Initial proof of concept requirements |
| [MVP Requirements](documentation/plan/mvp.md) | Complete feature set and user stories |
| [Implementation Plan](documentation/plan/Implementation.md) | Development phases and milestones |
| [Architectural Overview](documentation/architecture/ArchitecturalOverview.md) | Complete system architecture |
| [MCP Tool Description Validation](documentation/plan/MCPToolDescriptionValidation.md) | Validation framework for enhanced MCP tool descriptions |

### Architecture Decision Records (ADRs)

All major technical decisions are documented:

| ADR | Decision |
|-----|----------|
| [ADR-001](documentation/architecture/001-choose-xdebug-dbgp-protocol.md) | Choose Xdebug with DBGp Protocol |
| [ADR-002](documentation/architecture/002-choose-nodejs-for-prototype.md) | Choose Node.js for Prototype |
| [ADR-003](documentation/architecture/003-choose-api-gateway-architecture.md) | Choose API Gateway Architecture |
| [ADR-004](documentation/architecture/004-choose-cli-interface-for-prototype.md) | Choose CLI Interface for Prototype |
| [ADR-005](documentation/architecture/005-choose-claude-code-integration.md) | Choose Claude Code Integration |
| [ADR-006](documentation/architecture/006-choose-local-deployment-model.md) | Choose Local Deployment Model |
| [ADR-007](documentation/architecture/007-choose-ide-agnostic-plugin-architecture.md) | Choose IDE-Agnostic Plugin Architecture |
| [ADR-008](documentation/architecture/008-choose-direct-dbgp-implementation.md) | Choose Direct DBGp Protocol Implementation |
| [ADR-009](documentation/architecture/009-choose-dbgp-server-mode.md) | Choose DBGp Server Mode |

## Architecture Summary

YDebug follows a local-first, CLI-driven architecture with comprehensive DBGp protocol support and MCP integration:

```
Claude Code -> MCP Server -> YDebug Core -> DBGp Client/Server -> Xdebug -> PHP Application
                   |                |
                   v                v
Developer -> YDebug CLI -----> Configuration -> Claude API (AI Analysis)
                   |                |
                   v                v
               Logging System   Service Registry
```

**Key Features:**

- **Local deployment** for source code security and performance
- **CLI-first interface** with comprehensive command set
- **MCP Server integration** for seamless Claude Code connectivity
- **Bidirectional DBGp communication** (client and server modes)
- **Claude API integration** for AI-powered analysis
- **Comprehensive configuration management** with environment variable support
- **Plugin-ready architecture** for future IDE integrations
- **Extensive test coverage** with 1800+ automated tests

## Project Structure

```
ydebug/
├── src/
│   ├── cli/
│   │   ├── index.js             # Main CLI entry point
│   │   └── commands/            # Command implementations
│   │       ├── analyze.js       # AI analysis command (DEMO)
│   │       ├── ai.js           # Claude API test command  
│   │       ├── config.js       # Configuration management
│   │       ├── connect.js      # Xdebug connection testing
│   │       ├── inspect.js      # Variable inspection
│   │       ├── mcp-server.js   # MCP server command
│   │       └── server.js       # Server mode operations
│   ├── debugger/
│   │   ├── index.js            # Main debugger module
│   │   ├── DBGpClient.js       # DBGp protocol client
│   │   ├── DBGpServer.js       # DBGp protocol server
│   │   ├── DBGpSession.js      # Session management
│   │   ├── DBGpCommands.js     # High-level command interface
│   │   ├── CommandRegistry.js  # Command registration system
│   │   ├── VariableFormatter.js # Variable display formatting
│   │   ├── commands/           # DBGp command implementations
│   │   ├── protocol/           # DBGp protocol handling
│   │   └── errors/             # Custom error classes
│   ├── config/
│   │   ├── index.js            # Configuration module
│   │   └── ConfigManager.js    # Configuration management
│   ├── mcp/                    # Model Context Protocol integration
│   │   ├── MCPServer.js        # Main MCP server implementation
│   │   ├── ServiceRegistry.js  # Service dependency injection
│   │   ├── protocol/           # JSON-RPC 2.0 and MCP protocol handling
│   │   └── transport/          # STDIO and HTTP transport layers
│   ├── ai/
│   │   ├── AnalysisService.js  # AI analysis service
│   │   └── ClaudeClient.js     # Claude API client
│   └── utils/
│       └── Logger.js           # Logging system
├── tests/                      # Comprehensive test suite (1800+ tests)
│   ├── ai/                     # AI service tests
│   ├── cli/                    # CLI command tests  
│   ├── config/                 # Configuration tests
│   ├── debugger/               # DBGp protocol and debugging tests
│   ├── integration/            # Integration tests
│   ├── mcp/                    # MCP server and protocol tests
│   └── utils/                  # Utility tests
├── documentation/
│   ├── architecture/           # Architecture decisions and overview
│   ├── plan/                   # Project planning documents
│   └── user-guide/            # User documentation and guides
├── package.json               # Node.js project configuration
├── jest.config.js            # Jest testing configuration (all tests)
├── jest.config.unit.js       # Unit test configuration (fast)
├── jest.config.integration.js # Integration test configuration (extended timeouts)
└── README.md                 # This file
```

## Development and Testing

### Test Structure

The project uses a **separated test architecture** for optimal performance and clarity:

- **Unit Tests**: Fast, isolated tests for individual components (run in ~3-5 seconds)
- **Integration Tests**: End-to-end tests with external dependencies (run with extended timeouts)

### Running Tests

```bash
# Fast unit tests only (recommended for development)
npm run test:unit

# Integration tests with increased timeouts
npm run test:integration

# Run both unit and integration tests
npm run test:all

# Legacy command (runs all tests)
npm test

# Watch mode for development
npm run test:unit:watch        # Watch unit tests
npm run test:integration:watch # Watch integration tests

# Coverage report (unit tests only)
npm run test:coverage

# Linting and validation
npm run lint
npm run validate               # lint + unit tests
```

### Test Coverage

The project maintains comprehensive test coverage with **1800+ tests** across **51 test files** covering:

**Unit Tests (Fast):**
- **Configuration management** - Environment variables, file-based config, validation  
- **DBGp protocol implementation** - Client/server communication, command parsing
- **CLI functionality** - All commands with various options and error scenarios
- **Variable inspection** - Context retrieval, formatting, filtering
- **AI integration** - Claude API communication, analysis services
- **Error handling** - Custom exceptions, graceful failures

**Integration Tests (Comprehensive):**
- **End-to-end workflows** - Complete debugging sessions
- **Real Xdebug testing** - Actual PHP/Xdebug integration
- **MCP server integration** - Full protocol implementation
- **Session management** - Connection handling, timeouts, cleanup

### Development Scripts

```bash
npm run dev          # Development mode with auto-restart
npm run start        # Production mode
npm run lint:fix     # Auto-fix linting issues
npm run docker:dev   # Run in Docker development environment
```

## Use Cases

### 1. Claude Code Debugging Integration (MCP)

```bash
# Start MCP server for Claude Code integration
ydebug mcp-server

# Claude Code can now connect and use debugging tools
# No additional configuration needed - works automatically
```

This enables Claude Code to:
- Access PHP debugging capabilities as built-in tools
- Inspect variables during debugging sessions
- Analyze code execution with AI assistance
- Provide debugging suggestions based on real execution context

### 2. Interactive Debugging Session

```bash
# Start server mode and set a breakpoint
ydebug server --breakpoint-file /path/to/script.php --breakpoint-line 42

# In another terminal, trigger your PHP script
# YDebug will automatically inspect variables when breakpoint hits
```

### 3. Variable Inspection

```bash
# Connect to existing debugging session and inspect variables
ydebug inspect --context 0 --filter "user" --json
```

### 4. AI-Powered Analysis (DEMO)

```bash
# Analyze sample context with AI
export ANTHROPIC_API_KEY="your-key"
ydebug analyze --type errorAnalysis --verbose
```

### 5. Connection Testing and Troubleshooting

```bash
# Test Xdebug connection with detailed output
ydebug connect --timeout 5000 --verbose
```

## Contributing

This project is in active development. Key areas for contribution:

1. **Enhanced AI Analysis** - Expand beyond DEMO mode with real debugging context
2. **IDE Plugins** - Implement plugins for PhpStorm, VS Code, etc.
3. **Advanced Debugging Features** - Stack trace analysis, performance profiling
4. **Documentation** - User guides, tutorials, and examples
5. **Testing** - Additional integration tests and edge cases

See the [Implementation Plan](documentation/plan/Implementation.md) for development roadmap and [Architecture Documentation](documentation/architecture/ArchitecturalOverview.md) for technical details.

## License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.

## Support and Community

- **Issues:** Report bugs and request features via GitHub Issues
- **Documentation:** Comprehensive guides available in `/documentation`
- **Testing:** Run `npm test` to verify your installation
- **Configuration Help:** See [Configuration Guide](documentation/user-guide/configuration.md)
