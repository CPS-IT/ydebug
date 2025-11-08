# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**YDebug** is an AI Agent PHP Debugging Solution that enables AI agents to step through PHP applications in real-time, providing insight into code execution and application behavior.

## Project Vision

This project creates a debugging solution that allows AI agents to:

- Understand actual execution flow of PHP applications
- Observe data transformations throughout the application lifecycle
- Inspect variable states and values at any point during execution
- Gain contextual understanding of application behavior beyond static code analysis

## Development Phases

### Prototype (Proof of Concept)

- AI agent inspects variable values at one specific breakpoint in a simple PHP script
- Minimal implementation with hardcoded breakpoint location
- Focus on demonstrating technical feasibility

### MVP (Minimal Viable Product)

- Step-by-step code execution control
- Variable value inspection at any execution point
- Basic breakpoint management
- Programmatic debugging interface for AI agents
- Developer oversight and control capabilities

## Current Structure

- `documentation/plan/` - Project planning and specification documents
  - `goal.md` - Overall vision and core concepts
  - `prototype.md` - Initial proof of concept scope
  - `mvp.md` - Full MVP requirements and user stories
- `.idea/` - PhpStorm/IntelliJ IDEA project configuration

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
- Use text alternatives: "COMPLETED", "DONE", "FAILED", "TODO", "[x]", "[ ]"
- This applies to ALL files: code, documentation, comments, commit messages

**Acceptable Alternatives:**
- Instead of ✅: "COMPLETED", "DONE", "[x]"
- Instead of ❌: "FAILED", "ERROR", "[ ]" 
- Instead of →: "->" or "to"
- Instead of •: "-" or "*"
- Instead of any emoji: descriptive text

## Architecture Notes

- Primary focus on PHP debugging integration
- AI-to-debugger communication bridge required
- Real-time execution context access needed
- Developer oversight and control mechanisms essential
- Architecture planning complete with 7 documented ADRs
- Implementation planning ready for development phase
