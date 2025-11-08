# Feature 004: Xdebug Connection Test

**Status:** Not Started  
**Estimated Time:** 2-3 hours  
**Layer:** Foundation  
**Dependencies:** 002-BasicCLIFramework, 003-DBGpLibraryIntegration

## Description

Create a `ydebug connect` command to test TCP socket connection to Xdebug and implement basic handshake validation.

## Tasks

- [ ] Create connect command
  - [ ] Add `connect` command to CLI framework
  - [ ] Implement command options (host, port, timeout)
  - [ ] Add command help and usage information
- [ ] Implement connection testing
  - [ ] Create TCP socket connection to Xdebug port (default 9003)
  - [ ] Implement connection timeout handling
  - [ ] Add connection status reporting
- [ ] Add handshake validation
  - [ ] Implement DBGp init message handling
  - [ ] Validate protocol version compatibility
  - [ ] Extract and display session information
- [ ] Create connection diagnostics
  - [ ] Display connection status and timing
  - [ ] Show Xdebug version and capabilities
  - [ ] Add troubleshooting information for failures
- [ ] Add configuration integration
  - [ ] Read host/port from configuration file
  - [ ] Allow command-line override of config values
  - [ ] Save successful connection settings

## Success Criteria

- [ ] `ydebug connect` successfully connects to running Xdebug
- [ ] Connection failures are handled gracefully with helpful error messages
- [ ] Handshake information is displayed clearly
- [ ] Command integrates properly with configuration system
- [ ] Connection diagnostics provide useful troubleshooting info

## Notes

- Test with different Xdebug versions (3.0, 3.1, 3.2)
- Ensure clear error messages for common issues (port blocked, Xdebug not running)
- Document Xdebug configuration requirements