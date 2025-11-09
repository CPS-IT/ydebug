# Feature 009-add-1: Variable Inspection Server Mode

**Status:** Planning  
**Estimated Time:** 6–8 hours  
**Layer:** Core Debugging Infrastructure  
**Dependencies:** 009-VariableInspectionCore

## Context

During implementation of Feature 009, we discovered a fundamental architectural incompatibility:
- YDebug was designed as a secondary DBGp client to connect to existing debugging sessions
- PhpStorm and many IDEs do not support multiple simultaneous DBGp connections
- The original client-mode approach failed because IDEs close connections from secondary clients

## Solution Discovery

Testing revealed that YDebug needs to operate as a **DBGp server** (like an IDE) rather than a DBGp client. A proof-of-concept implementation successfully:
- Listened for Xdebug connections on port 9003
- Handled proper DBGp handshake protocol
- Set breakpoints and controlled execution flow
- Retrieved and parsed variable data from paused scripts

## Proposed Implementation

### Core Server Mode Architecture

- [ ] **DBGp Server Implementation**
  - [ ] Create `DBGpServer` class to listen for Xdebug connections
  - [ ] Handle multiple connection types (init handshake vs. secondary connections)
  - [ ] Implement proper socket lifecycle management
  - [ ] Add connection timeout and error handling

- [ ] **Execution Flow Control**
  - [ ] Implement breakpoint setting via `breakpoint_set` command
  - [ ] Add execution control (`run`, `step_over`, `step_into`, `step_out`)
  - [ ] Handle script pause/resume states
  - [ ] Support automatic breakpoint management

- [ ] **Enhanced Variable Inspection**
  - [ ] Integrate with existing VariableFormatter for consistent output
  - [ ] Add support for inspection at specific line numbers
  - [ ] Implement context switching (local, global, class)
  - [ ] Handle nested object and array expansion

### CLI Integration

- [ ] **Server Mode Command**
  - [ ] Add `--server` flag to `ydebug inspect` command
  - [ ] Create `ydebug server` standalone command
  - [ ] Add configuration options for server behavior
  - [ ] Support automatic breakpoint placement

- [ ] **Configuration Management**
  - [ ] Add server mode settings to configuration system
  - [ ] Support custom port configuration
  - [ ] Add breakpoint location configuration
  - [ ] Implement session timeout settings

### Backwards Compatibility

- [ ] **Dual Mode Support**
  - [ ] Maintain the existing client mode for IDE compatibility
  - [ ] Auto-detect connection scenarios
  - [ ] Graceful fallback between modes
  - [ ] Clear error messages for unsupported scenarios

## Technical Specifications

### DBGp Server Protocol Flow
1. Server listens on configured port (default 9003)
2. Xdebug connects and sends an init packet
3. Server responds with feature negotiation
4. Server sets breakpoints at target locations
5. Server issues `run` command to continue execution
6. Script pauses at breakpoint
7. Server requests variable contexts via `context_get`
8. Server formats and displays variable data
9. Server continues or terminates the session

### Key Components
- `DBGpServer`: Core server listening and connection management
- `SessionManager`: Handle active debugging sessions
- `BreakpointController`: Automatic breakpoint placement
- `ExecutionController`: Script flow management
- `ServerInspectCommand`: CLI command with server mode

## Success Criteria

- [ ] Server mode successfully receives Xdebug connections
- [ ] Variables are inspected at proper execution points
- [ ] Integration with the existing VariableFormatter works correctly
- [ ] CLI provides clear feedback about the server state
- [ ] Error handling covers common failure scenarios
- [ ] Documentation explains usage differences between modes

## Implementation Notes

- Server mode addresses the architectural limitation discovered in Feature 009
- Existing variable parsing and formatting code can be reused
- Configuration system needs extension for server-specific settings
- Testing requires coordination between the server process and PHP script execution
- Consider the security implications of a listening server vs a connecting client

## Testing Strategy

- [ ] Unit tests for DBGp server protocol handling
- [ ] Integration tests with real PHP scripts
- [ ] Error scenario testing (connection failures, malformed XML)
- [ ] Performance testing with large variable sets
- [ ] Compatibility testing with different Xdebug versions

## Migration Path

This addendum addresses the core limitation that prevented Feature 009 from working with standard IDE setups. The server mode implementation will provide a reliable foundation for variable inspection that works independently of IDE DBGp limitations.
