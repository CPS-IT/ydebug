# ADR-008: Choose Direct DBGp Protocol Implementation

**Status:** Accepted  
**Date:** 2024-11-08  
**Deciders:** YDebug Development Team

## Context

During Feature 003 implementation, we needed to integrate a DBGp client library for communicating with Xdebug. We evaluated several options:

1. **lib-phpdebug (jasny/lib-phpdebug-js)**: Initially chosen but found to have 10 security vulnerabilities including prototype pollution in xml2js and outdated socket.io dependencies
2. **dbgp package**: Discovered to be a test server/simulator, not a client library
3. **@php-wasm/xdebug-bridge**: Recent and maintained but specialized for PHP.wasm use cases
4. **Direct implementation**: Using Node.js built-in modules

The security scan revealed critical issues:
- xml2js: ^0.1.14 (extremely outdated, prototype pollution vulnerability)
- socket.io: ^2.2.0 (multiple vulnerabilities)
- Various outdated dependencies with ReDoS vulnerabilities
- No available fixes for several vulnerabilities

## Decision

We will implement the DBGp protocol directly using Node.js built-in modules (`net`, `events`) instead of relying on external packages.

## Rationale

### Security Benefits
- **Zero vulnerable dependencies**: Eliminates all identified security vulnerabilities
- **Reduced attack surface**: No third-party packages with potential security issues
- **Better security posture**: Full control over all code execution paths

### Technical Benefits
- **Lightweight**: No unnecessary dependencies or features
- **Performance**: Direct TCP socket communication without abstraction overhead
- **Customization**: Can implement exactly the DBGp features we need
- **Maintainability**: Complete understanding and control of the protocol implementation

### Development Benefits
- **Learning**: Better understanding of the DBGp protocol
- **Flexibility**: Easy to extend or modify for YDebug-specific needs
- **Debugging**: Easier to debug issues when we control the implementation

### Trade-offs Considered
- **Development time**: More initial implementation work vs. using existing library
- **Protocol complexity**: Need to implement XML parsing and DBGp command structure
- **Testing requirements**: More comprehensive testing needed for protocol implementation

## Implementation Details

The direct implementation includes:

1. **TCP Socket Management**: Using Node.js `net` module for socket connections
2. **Simple XML Parser**: Custom regex-based parser for DBGp XML messages (avoiding xml2js)
3. **Command Queue**: Promise-based command/response matching with transaction IDs
4. **Protocol Features**:
   - Connection management (connect/disconnect)
   - Command execution (run, step_into, step_over, step_out, stop)
   - Breakpoint management (set/remove)
   - Variable inspection (property_get)
   - Context retrieval (stack_get, context_get)

## Consequences

### Positive
- **Security**: Zero external vulnerabilities (confirmed by npm audit)
- **Performance**: Direct socket communication
- **Control**: Full customization capabilities
- **Reliability**: No dependency on unmaintained packages

### Negative
- **Initial Effort**: More upfront development work
- **Protocol Expertise**: Team needs to understand DBGp protocol details
- **Testing**: Comprehensive protocol testing required

### Neutral
- **Code Size**: Similar to wrapper around external library
- **Maintenance**: Ongoing maintenance of protocol implementation vs. dependency updates

## Alternatives Considered

1. **Fork lib-phpdebug**: Would require updating all vulnerable dependencies and maintaining a fork
2. **Find newer alternatives**: No suitable maintained DBGp client libraries found
3. **Use @php-wasm/xdebug-bridge**: Too specialized for our general PHP debugging needs

## Related ADRs

- [ADR-001: Choose Xdebug with DBGp Protocol](001-choose-xdebug-dbgp-protocol.md) - Established DBGp as our debugging protocol
- [ADR-002: Choose Node.js for Prototype](002-choose-nodejs-for-prototype.md) - Node.js platform decision