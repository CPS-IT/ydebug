# YDebug - AI Agent PHP Debugging Solution

YDebug enables AI agents to step through PHP applications in real-time, providing insight into code execution and application behavior.

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

## Documentation

### User Guide

- [Configuration Management](documentation/user-guide/configuration.md) – Complete configuration guide
- [Connect Command](documentation/user-guide/connect-command.md) – Xdebug connection testing and troubleshooting

### Project Planning

- [Project Goal](documentation/plan/goal.md) – Original vision and concept
- [Prototype Scope](documentation/plan/prototype.md) – Initial proof of concept requirements
- [MVP Requirements](documentation/plan/mvp.md) – Complete feature set and user stories
- [Implementation Plan](documentation/plan/Implementation.md) – Development phases and milestones
- [Prototype Features](documentation/plan/feature/prototype/) – Granular feature breakdown (001-020)

### Architecture

- [Architectural Overview](documentation/architecture/ArchitecturalOverview.md) – Complete system architecture
- [Initial Questions](documentation/architecture/InitialQuestions.md) – Key technical planning questions

#### Architecture Decision Records (ADRs)

- [ADR-001: Choose Xdebug with DBGp Protocol](documentation/architecture/001-choose-xdebug-dbgp-protocol.md)
- [ADR-002: Choose Node.js for Prototype](documentation/architecture/002-choose-nodejs-for-prototype.md)
- [ADR-003: Choose API Gateway Architecture](documentation/architecture/003-choose-api-gateway-architecture.md)
- [ADR-004: Choose CLI Interface for Prototype](documentation/architecture/004-choose-cli-interface-for-prototype.md)
- [ADR-005: Choose Claude Code Integration](documentation/architecture/005-choose-claude-code-integration.md)
- [ADR-006: Choose Local Deployment Model](documentation/architecture/006-choose-local-deployment-model.md)
- [ADR-007: Choose IDE-Agnostic Plugin Architecture](documentation/architecture/007-choose-ide-agnostic-plugin-architecture.md)
- [ADR-008: Choose Direct DBGp Protocol Implementation](documentation/architecture/008-choose-direct-dbgp-implementation.md)

## Architecture Summary

YDebug follows a local-first, CLI-driven architecture:

```
Developer → CLI → YDebug Service (Node.js) → DBGp → Xdebug → PHP
                       ↓
                 Claude Code API
```

**Key Features:**

- Local deployment for source code security
- CLI-first interface with future plugin extensibility
- Claude Code integration for AI analysis
- DBGp protocol for PHP debugging integration
- Plugin architecture for future IDE integrations

## Development Status

**Current Phase:** Prototype Development (In Progress)  
**Completed Features:**
- ✅ Project architecture and planning
- ✅ Basic CLI framework with Commander.js
- ✅ Xdebug connection testing and validation
- ✅ Comprehensive configuration management
- ✅ Environment variable and multi-source configuration support
- 🔄 Variable inspection and debugging core (next)

## Installation

### Requirements

- Node.js 18+ 
- PHP 7.4+ with Xdebug 3.0+
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Verify Installation

Test the CLI and configuration:

```bash
# Show help
node src/cli/index.js --help

# Initialize configuration
node src/cli/index.js config --init

# Test Xdebug connection (requires Xdebug running)
node src/cli/index.js connect
```

## Getting Started

### 1. Configure YDebug

Initialize your configuration:

```bash
node src/cli/index.js config --init
```

### 2. Configure Xdebug

Ensure Xdebug is configured in your PHP environment:

```ini
; php.ini or xdebug.ini
zend_extension=xdebug
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_host=localhost
xdebug.client_port=9003
```

### 3. Test Connection

Verify YDebug can connect to Xdebug:

```bash
node src/cli/index.js connect
```

### 4. Customize Configuration

Set configuration values as needed:

```bash
# Set custom Xdebug port
node src/cli/index.js config-set xdebug.port 9004

# Enable debug logging
node src/cli/index.js config-set logging.level debug

# View current configuration
node src/cli/index.js config --show
```

## Available Commands

### Configuration Management
- `config --init` - Create sample configuration file
- `config --show` - Display current configuration
- `config-set <key> <value>` - Set configuration value
- `config-get <key>` - Get configuration value  
- `config --reset --confirm` - Reset to defaults

See the [Configuration Guide](documentation/user-guide/configuration.md) for complete details.

### Connection Testing
- `connect` - Test connection to Xdebug
- `connect --host <host> --port <port>` - Test with custom settings

See the [Connect Command Guide](documentation/user-guide/connect-command.md) for complete details.

## Project Structure

```
ydebug/
├── documentation/
│   ├── plan/                 # Project planning documents
│   ├── architecture/         # Architecture decisions and overview
│   └── user-guide/          # User documentation
├── src/
│   ├── cli/                 # Command-line interface
│   │   └── commands/        # CLI command implementations
│   ├── config/              # Configuration management
│   ├── debugger/            # DBGp client and debugging core
│   └── index.js             # Main entry point
├── tests/                   # Comprehensive test suite (313 tests)
│   ├── config/              # Configuration management tests
│   ├── integration/         # Integration tests
│   └── *.test.js            # Unit tests
├── package.json             # Node.js project configuration
└── README.md                # This file
```

## Testing

Run the comprehensive test suite:

```bash
npm test
```

The project maintains high test coverage with 313 tests covering:
- Configuration management (143 tests)
- CLI functionality and integration 
- Xdebug connection testing
- Error handling and edge cases

## Contributing

This project is in active prototype development. See the [Implementation Plan](documentation/plan/Implementation.md) for development phases and [Feature Documentation](documentation/plan/feature/prototype/) for detailed feature requirements.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
