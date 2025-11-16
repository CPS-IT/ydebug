# Feature 030: MCP AI Analysis Tools

**Status:** Not Started  
**Estimated Time:** 3-4 hours  
**Layer:** MCP Integration  
**Dependencies:** 029-MCPVariableInspectionTools

## Description

Implement MCP tools that integrate YDebug's AI analysis capabilities with Claude Code, enabling contextual analysis of debugging sessions and runtime behavior.

## Tasks

- [ ] Create AI analysis MCP tools (facade pattern)
  - [ ] Create `DebugAnalyzeContext.js` - **WRAP EXISTING** AnalysisService from Feature 014
  - [ ] Create `DebugAnalyzeVariables.js` - format existing variable analysis for MCP
  - [ ] Create `DebugAnalyzeExecution.js` - wrap existing execution analysis
  - [ ] **DO NOT REIMPLEMENT**: Use existing analysis type selection and configuration
- [ ] Integrate existing AnalysisService (NO DUPLICATION)
  - [ ] **CRITICAL**: Use dependency injection to access existing AnalysisService
  - [ ] Format existing context preparation for MCP protocol  
  - [ ] Adapt existing analysis result formatting for MCP transport
  - [ ] **DO NOT REIMPLEMENT**: Use existing analysis caching and optimization
- [ ] Create contextual analysis MCP wrappers (facade pattern)
  - [ ] Create `DebugSuggestBreakpoints.js` - wrap existing AI suggestion functionality
  - [ ] Create `DebugIdentifyIssues.js` - format existing issue detection for MCP
  - [ ] Create `DebugExplainBehavior.js` - wrap existing behavior explanation
  - [ ] **DO NOT REIMPLEMENT**: Use existing analysis confidence scoring
- [ ] Format existing analysis results for MCP
  - [ ] Create MCP response adapters for existing AnalysisService output
  - [ ] **DO NOT REIMPLEMENT**: Analysis logic, caching, or validation
  - [ ] Add MCP-specific response formatting only
  - [ ] Leverage existing analysis history and correlation

## Success Criteria

- [ ] Claude Code can request AI analysis of debugging contexts
- [ ] Analysis results provide actionable insights for debugging
- [ ] AI suggestions for breakpoints and investigation paths work effectively
- [ ] Analysis integration doesn't impact debugging performance
- [ ] Results are formatted appropriately for Claude Code consumption

## Notes

- **CRITICAL**: Facade pattern only - use existing AnalysisService from Feature 014
- **DO NOT REIMPLEMENT**: AI analysis logic, context preparation, or caching
- Use dependency injection to access existing AnalysisService
- Focus exclusively on MCP protocol adaptation and response formatting
- Leverage existing ClaudeClient integration and analysis types
- Ensure MCP tools complement existing CLI analyze command without duplication