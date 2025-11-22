# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**YDebug** is an AI Agent PHP Debugging Solution that enables AI agents to step through PHP applications in real-time, providing insight into code execution and application behavior.

## Project Vision

This project creates a debugging solution that allows AI agents to:

- Understand the actual execution flow of PHP applications
- Observe data transformations throughout the application lifecycle
- Inspect variable states and values at any point during execution
- Gain contextual understanding of application behavior beyond static code analysis

## Development Phases

### Prototype (Proof of Concept)

- AI agent inspects variable values at one specific breakpoint in a simple PHP script
- Minimal implementation with a hardcoded breakpoint location
- Focus on demonstrating technical feasibility

### MVP (Minimal Viable Product)

- Step-by-step code execution control
- Variable value inspection at any execution point
- Basic breakpoint management
- Programmatic debugging interface for AI agents
- Developer oversight and control capabilities

## Current Development Phase: MCP Integration

The project is currently in the **Model Context Protocol (MCP) Integration Phase**, implementing core MCP tools that expose YDebug's debugging capabilities to Claude Code through a standardized protocol.

**Current Focus Areas:**
- MCP debugging tools for session management, breakpoint control, and execution flow
- JSON-RPC 2.0 protocol implementation for Claude Code communication
- Service registry architecture for clean dependency injection
- Facade pattern implementation wrapping existing DBGp functionality
- Comprehensive test coverage for MCP tool reliability

**Key Components Implemented:**
- MCP Server foundation with transport and protocol handling
- 8 core debugging tools: session management, breakpoint operations, execution control
- Parameter validation using JSON Schema
- Error handling with standardized MCP response formats

## Implementation Completion Standards

**CRITICAL:** Implementation of features and bug fixing is **NOT** finished before any failing tests and linting issues are fixed.

**Definition of Done:**
- all tasks in the current feature specification are completed
- all success criteria are met
- All unit tests must pass
- All integration tests must pass
- All linting checks must pass without errors
- Code coverage requirements must be met
- Documentation must be updated and accurate

**Quality Gate Requirements:**
- No failing test suites
- No ESLint or other linting errors
- No TypeScript/JSDoc violations
- Proper error handling and edge case coverage
- Performance benchmarks within acceptable limits

This ensures code quality, maintainability, and reliability before any feature is considered complete.

## Current Structure

- `documentation/plan/` - Project planning and specification documents
  - `goal.md` - Overall vision and core concepts
  - `prototype.md` - Initial proof of concept scope
  - `mvp.md` - Full MVP requirements and user stories
  - `feature/mcp/` - MCP integration feature specifications
- `.idea/` - PhpStorm/IntelliJ IDEA project configuration
- `src/mcp/` - Model Context Protocol implementation
  - `tools/` - MCP debugging tools for Claude Code integration
  - `protocol/` - JSON-RPC and capability management
  - `transport/` - Communication layer implementation

## Development Setup

This is a PHP-focused project that will likely require:

- PHP development environment with debugging capabilities (Xdebug)
- Debugging protocol integration
- AI agent communication interface
- Package management via Composer

## Communication Guidelines

**Tone and Language:**

- Maintain modest, factual tone without boasting or business hyperbole
- Use precise technical language without exaggeration
- Avoid superlatives and marketing-style claims
- Focus on concrete capabilities rather than promotional language

**Timeline References:**

- Avoid specific "Week X" statements in planning documents
- Use relative terms like "initial phase", "later phase", "after prototype validation"
- Focus on dependencies and logical sequencing rather than calendar commitments

## CRITICAL FORMATTING REQUIREMENTS

**NO UNICODE CHARACTERS EVER:**

- **NEVER** use Unicode icons, symbols, or special characters in any files
- **NEVER** use checkmarks (✓, ✅), crosses (✗, ❌), arrows (→), or any emoji
- **NEVER** use special Unicode bullets (•, ◦, ▪) or decorative characters
- Use only standard ASCII characters: letters, numbers, basic punctuation
- Use text alternatives: "Completed", "Done", "Failed", "Todo", "[x]", "[ ]"
- This applies to ALL files: code, documentation, comments, commit messages

**Acceptable Alternatives:**
- Instead of ✅: "Completed", "Done", "[x]"
- Instead of ❌: "Failed", "Error", "[ ]" 
- Instead of →: "->" or "to"
- Instead of •: "-" or "*"
- Instead of any emoji: descriptive text

## Architecture Notes

- Primary focus on PHP debugging integration
- AI-to-debugger communication bridge required
- Real-time execution context access needed
- Developer oversight and control mechanisms are essential
- Architecture planning complete with 9 documented ADRs
- Implementation planning ready for development phase
