# Feature 009: Variable Inspection Core

**Status:** Not Started  
**Estimated Time:** 4-6 hours  
**Layer:** Core Debugging  
**Dependencies:** 008-BreakpointManagement

## Description

Implement core variable inspection using DBGp context_get command to extract and parse variable data from Xdebug responses.

## Tasks

- [ ] Implement context DBGp commands
  - [ ] Add `context_get` command for local variables
  - [ ] Implement `context_names` to get available contexts
  - [ ] Add support for different contexts (local, global, class)
  - [ ] Create context switching functionality
- [ ] Create variable data parsing
  - [ ] Parse variable XML data from Xdebug
  - [ ] Extract variable names, types, and values
  - [ ] Handle different PHP data types (string, int, array, object)
  - [ ] Add support for nested data structures
- [ ] Implement variable value extraction
  - [ ] Handle base64-encoded variable values
  - [ ] Process different variable encodings
  - [ ] Extract object properties and methods
  - [ ] Handle array elements and keys
- [ ] Add CLI inspect command
  - [ ] Create `ydebug inspect` command
  - [ ] Add options for context selection
  - [ ] Support variable name filtering
  - [ ] Add depth limiting for nested structures
- [ ] Create variable formatting
  - [ ] Format variables for terminal display
  - [ ] Add type information to output
  - [ ] Handle large variable values (truncation)
  - [ ] Create JSON output option

## Success Criteria

- [ ] Variables can be inspected at breakpoints
- [ ] Different PHP data types display correctly
- [ ] Nested structures (arrays, objects) are handled properly
- [ ] CLI command provides useful variable information
- [ ] Variable formatting is readable and informative

## Notes

- Focus on common PHP data types for prototype
- Handle variable encoding issues carefully
- Document any limitations in complex object inspection