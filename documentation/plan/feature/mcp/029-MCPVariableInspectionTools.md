# Feature 029: MCP Variable Inspection Tools

**Status:** Not Started  
**Estimated Time:** 4-5 hours  
**Layer:** MCP Integration  
**Dependencies:** 028-MCPDebuggingTools

## Description

Implement MCP tools for variable inspection, expression evaluation, and stack trace retrieval, enabling Claude Code to examine PHP application runtime state.

## Tasks

- [ ] Create variable inspection MCP tools (facade pattern)
  - [ ] Create `DebugInspectVariables.js` - wrap existing variable inspection from Feature 009
  - [ ] Create `DebugInspectScope.js` - wrap existing scope inspection functionality
  - [ ] Create `DebugInspectObject.js` - format existing object inspection for MCP
  - [ ] Add MCP-specific parameter validation for variable operations
- [ ] Implement expression evaluation MCP tools (facade pattern)
  - [ ] Create `DebugEvaluateExpression.js` - wrap existing DBGpProtocol.eval()
  - [ ] Add MCP parameter validation for expression evaluation
  - [ ] Format existing expression evaluation responses for MCP protocol
  - [ ] Integrate existing expression safety checks and error handling
- [ ] Create stack trace MCP tools (facade pattern)
  - [ ] Create `DebugGetStackTrace.js` - wrap existing DBGpProtocol.stackGet()
  - [ ] Create `DebugGetExecutionContext.js` - format existing execution context
  - [ ] Add MCP formatting for existing stack frame navigation
  - [ ] Format existing stack trace data for MCP protocol
- [ ] Integrate existing data formatting services
  - [ ] **DO NOT REIMPLEMENT**: Use existing VariableFormatter from src/utils/
  - [ ] Add MCP-specific output format adapters
  - [ ] Leverage existing data truncation and reference handling
  - [ ] Create MCP response wrappers for existing formatted data

## Success Criteria

- [ ] Claude Code can inspect variables at any execution point
- [ ] Expression evaluation works safely in debugging context
- [ ] Stack trace tools provide complete call hierarchy information
- [ ] Data formatting is consistent and handles edge cases
- [ ] Large data structures are handled efficiently without timeouts

## Notes

- **CRITICAL**: Facade pattern only - wrap existing Feature 009 variable inspection infrastructure
- Use existing services: DBGpProtocol, VariableFormatter, expression evaluation
- **DO NOT REIMPLEMENT**: Variable inspection, object traversal, or data formatting
- Focus on MCP protocol adaptation and response formatting only
- Leverage existing safety measures for expression evaluation
- Ensure efficient data serialization by reusing existing formatters