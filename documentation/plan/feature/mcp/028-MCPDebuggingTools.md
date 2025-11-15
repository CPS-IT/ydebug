# Feature 028: MCP Debugging Tools

**Status:** Not Started  
**Estimated Time:** 6-8 hours  
**Layer:** MCP Integration  
**Dependencies:** 027-MCPServerFoundation

## Description

Implement core MCP tools that expose YDebug's debugging capabilities to Claude Code: session management, breakpoint control, and execution flow.

## Tasks

- [ ] Create MCP service integration infrastructure
  - [ ] Create `src/mcp/ServiceRegistry.js` for dependency injection
  - [ ] Create `src/mcp/tools/BaseMCPTool.js` base class
  - [ ] Implement service discovery and registration pattern
  - [ ] Add shared parameter validation and response formatting
- [ ] Implement debug session MCP tools (facade pattern)
  - [ ] Create `DebugStartSession.js` - wrap existing SessionManager.startSession()
  - [ ] Create `DebugStopSession.js` - wrap existing SessionManager.stopSession()
  - [ ] Add MCP parameter validation for existing session operations
  - [ ] Format existing session status responses for MCP protocol
- [ ] Implement breakpoint management MCP tools (facade pattern)
  - [ ] Create `DebugSetBreakpoint.js` - wrap existing BreakpointManager.setBreakpoint()
  - [ ] Create `DebugRemoveBreakpoint.js` - wrap existing BreakpointManager.removeBreakpoint()
  - [ ] Create `DebugListBreakpoints.js` - format existing BreakpointManager.listBreakpoints()
  - [ ] Add MCP-specific parameter validation for breakpoint operations
- [ ] Implement execution control MCP tools (facade pattern)
  - [ ] Create `DebugStepExecution.js` - wrap existing DBGpProtocol step commands
  - [ ] Create `DebugContinueExecution.js` - wrap existing DBGpProtocol.run()
  - [ ] Create `DebugPauseExecution.js` - wrap existing execution pause functionality
  - [ ] Format existing execution state responses for MCP protocol

## Success Criteria

- [ ] Claude Code can start/stop debugging sessions via MCP tools
- [ ] Breakpoint management works reliably through MCP interface
- [ ] Execution control tools provide proper step-through debugging
- [ ] Tool parameter validation prevents invalid operations
- [ ] Error responses provide clear feedback for debugging issues

## Notes

- **CRITICAL**: Use facade pattern - do not reimplement existing functionality
- Leverage existing services: SessionManager, BreakpointManager, DBGpProtocol
- Implement dependency injection through ServiceRegistry for clean architecture
- Focus on MCP protocol adaptation, not debugging logic reimplementation
- Ensure tool schemas are well-documented for Claude Code integration
- Maintain compatibility with existing CLI debugging workflows