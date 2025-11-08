# Feature 014: Basic AI Analysis

**Status:** Not Started  
**Estimated Time:** 4-5 hours  
**Layer:** AI Integration  
**Dependencies:** 013-ClaudeCodeAPISetup, 012-VariableDisplayFormatting

## Description

Create basic AI analysis functionality with prompt templates and implement the `ydebug analyze` command to send variable context to Claude Code.

## Tasks

- [ ] Design analysis prompt templates
  - [ ] Create basic variable analysis prompt
  - [ ] Design context information structure
  - [ ] Add debugging scenario templates
  - [ ] Create prompt for common debugging tasks
- [ ] Implement AI analysis service
  - [ ] Create `src/ai/AnalysisService.js`
  - [ ] Add prompt template management
  - [ ] Implement context preparation for AI
  - [ ] Create AI response processing
- [ ] Create analyze CLI command
  - [ ] Add `ydebug analyze` command
  - [ ] Support analysis of current debugging context
  - [ ] Add options for analysis type/focus
  - [ ] Include variable filtering options
- [ ] Add context data preparation
  - [ ] Extract relevant debugging information
  - [ ] Format variable data for AI consumption
  - [ ] Include code location and execution state
  - [ ] Add breakpoint and session context
- [ ] Implement response handling
  - [ ] Process AI analysis responses
  - [ ] Format insights for terminal display
  - [ ] Handle API errors gracefully
  - [ ] Add response caching for similar contexts

## Success Criteria

- [ ] `ydebug analyze` command sends context to Claude Code successfully
- [ ] AI responses are relevant to debugging context
- [ ] Analysis results are displayed clearly in terminal
- [ ] API errors are handled without crashing
- [ ] Analysis provides useful insights about variable states

## Notes

- Start with simple analysis prompts and refine based on results
- Focus on variable state analysis for prototype
- Keep prompts concise to minimize API costs