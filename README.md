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

**Current Phase:** Architectural Planning Complete  
**Next Phase:** Prototype Development

## Getting Started

Documentation for setup and usage will be available once the prototype is complete.

## Project Structure

```
ydebug/
├── documentation/
│   ├── plan/                 # Project planning documents
│   └── architecture/         # Architecture decisions and overview
├── src/                      # Source code (coming in prototype phase)
├── tests/                    # Test suite (coming in prototype phase)
└── README.md                 # This file
```