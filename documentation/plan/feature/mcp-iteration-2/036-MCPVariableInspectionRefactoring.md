# Feature 036: MCP Variable Inspection Refactoring

**Status:** Not Started  
**Estimated Time:** 2-3 hours  
**Layer:** MCP Integration  
**Dependencies:** 029-MCPVariableInspectionTools

## Description

Refactor MCP variable inspection tools to properly implement the facade pattern by wrapping existing VariableFormatter infrastructure instead of duplicating formatting logic. This addresses the architectural deviation identified in Feature 029.

## Tasks

- [ ] Refactor MCP tools to use existing infrastructure (facade pattern)
  - [ ] Update `DebugInspectVariables.js` to use existing VariableFormatter from src/debugger/
  - [ ] Update `DebugInspectScope.js` to wrap existing context operations
  - [ ] Update `DebugInspectObject.js` to use existing object inspection services
  - [ ] Remove duplicate formatting logic from MCP tools
- [ ] Integrate existing data formatting services properly
  - [ ] Import and use existing VariableFormatter class
  - [ ] Wrap existing data truncation and reference handling
  - [ ] Create MCP response adapters for existing formatted data
  - [ ] Remove custom formatValue() implementations
- [ ] Update expression evaluation tool
  - [ ] Refactor `DebugEvaluateExpression.js` to use existing formatters
  - [ ] Remove duplicate type formatting logic
  - [ ] Integrate with existing expression safety checks
- [ ] Update stack trace tools
  - [ ] Refactor `DebugGetStackTrace.js` to use existing stack formatting
  - [ ] Update `DebugGetExecutionContext.js` to wrap existing context services
  - [ ] Remove duplicate argument formatting logic

## Success Criteria

- [ ] All MCP tools use facade pattern wrapping existing services
- [ ] No duplicate formatting logic remains in MCP tools
- [ ] VariableFormatter from src/debugger/ is properly integrated
- [ ] All existing tests continue to pass
- [ ] Performance characteristics remain the same or improve
- [ ] Code follows DRY principles with proper separation of concerns

## Architecture Requirements

- **CRITICAL**: Implement true facade pattern - MCP tools should be thin wrappers
- Use existing VariableFormatter.js for all data formatting
- Leverage existing DBGp command infrastructure
- **DO NOT CHANGE**: Core formatting logic or existing service behavior
- Focus on MCP protocol adaptation only, not reimplementation
- Maintain existing safety measures and error handling

## Notes

- This refactoring addresses architectural deviation from Feature 029 specification
- Existing functionality and test coverage must be preserved
- Performance optimizations from truncation and depth limiting must be maintained
- MCP response format compatibility must be preserved for Claude Code integration
