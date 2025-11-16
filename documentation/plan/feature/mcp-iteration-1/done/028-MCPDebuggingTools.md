# Feature 028: MCP Debugging Tools

**Status:** Completed  
**Estimated Time:** 6-8 hours  
**Layer:** MCP Integration  
**Dependencies:** 027-MCPServerFoundation (Completed)

## Description

Implement core MCP tools that expose YDebug's debugging capabilities to Claude Code: session management, breakpoint control, and execution flow.

## Tasks

- [x] Create MCP service integration infrastructure
  - [x] Create `src/mcp/ServiceRegistry.js` for dependency injection
  - [x] Create `src/mcp/tools/BaseMCPTool.js` base class
  - [x] Implement service discovery and registration pattern
  - [x] Add shared parameter validation and response formatting
- [x] Implement debug session MCP tools (facade pattern)
  - [x] Create `DebugStartSession.js` - wrap DBGpClient connection functionality
  - [x] Create `DebugStopSession.js` - wrap session cleanup and disconnection
  - [x] Add MCP parameter validation for session operations
  - [x] Format session status responses for MCP protocol
- [x] Implement breakpoint management MCP tools (facade pattern)
  - [x] Create `DebugSetBreakpoint.js` - wrap existing DBGpCommands.setBreakpoint()
  - [x] Create `DebugRemoveBreakpoint.js` - wrap breakpoint removal functionality
  - [x] Create `DebugListBreakpoints.js` - format existing DBGpCommands.listBreakpoints()
  - [x] Add MCP-specific parameter validation for breakpoint operations
- [x] Implement execution control MCP tools (facade pattern)
  - [x] Create `DebugStepExecution.js` - wrap existing DBGpCommands step commands
  - [x] Create `DebugContinueExecution.js` - wrap existing DBGpCommands.run()
  - [x] Create `DebugGetStatus.js` - wrap existing DBGpCommands.status()
  - [x] Format existing execution state responses for MCP protocol

## Success Criteria

- [x] Claude Code can start/stop debugging sessions via MCP tools
- [x] Breakpoint management works reliably through MCP interface
- [x] Execution control tools provide proper step-through debugging
- [x] Tool parameter validation prevents invalid operations
- [x] Error responses provide clear feedback for debugging issues

## Notes

- **CRITICAL**: Use facade pattern - do not reimplement existing functionality
- Leverage existing services: SessionManager, BreakpointManager, DBGpProtocol
- Implement dependency injection through ServiceRegistry for clean architecture
- Focus on MCP protocol adaptation, not debugging logic reimplementation
- Ensure tool schemas are well-documented for Claude Code integration
- Maintain compatibility with existing CLI debugging workflows