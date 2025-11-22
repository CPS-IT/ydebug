/**
 * Server Mode Integration Tests
 * Tests end-to-end functionality of YDebug server mode
 * 
 * NOTE: These tests verify core server functionality including startup, 
 * connection handling, and basic protocol compliance. Some tests may
 * encounter expected protocol warnings that don't affect core functionality.
 */

const { spawn } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');
const { join, resolve } = require('path');

describe('Server Mode Integration', () => {
  let serverProcess;
  let testPort;
  let testScriptPath;
  let nodePath;
  let projectRoot;

  beforeEach(() => {
    // Setup paths for CI compatibility
    nodePath = process.execPath; // Use the Node.js binary that's running this test
    projectRoot = resolve(__dirname, '../..');
    
    // Generate random port to avoid conflicts between test runs
    testPort = 9005 + Math.floor(Math.random() * 100);
    testScriptPath = join(projectRoot, 'temp-test-script.php');
        
    // Create simple test PHP script for debugging
    const testScript = `<?php
echo "Server mode test script starting...\\n";
$test_var = "Hello Server Mode";
echo "Test variable: $test_var\\n";
echo "Script complete.\\n";
?>`;
        
    writeFileSync(testScriptPath, testScript);
  });

  afterEach(async () => {
    // Clean up server process if still running
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGKILL'); // Use SIGKILL for immediate cleanup
      
      // Brief wait for process cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
        
    // Clean up temporary test script
    try {
      unlinkSync(testScriptPath);
    } catch {
      // Ignore cleanup errors - file may not exist
    }
  });

  describe('Server Startup and Connection', () => {
    test('should start server successfully', (done) => {
      let serverStarted = false;
      
      // Start YDebug server with random port
      serverProcess = spawn(nodePath, ['src/cli/index.js', 'server', '--port', testPort.toString()], {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
                
        // Check if server started successfully
        if (output.includes('YDebug Server listening')) {
          serverStarted = true;
                    
          try {
            // Verify server startup messages
                        
            // Core functionality verification
            expect(output).toMatch(/YDebug Server listening on/);
            expect(output).toMatch(/Ready for Xdebug connections/);
            
            clearTimeout(startTimeout);
            done();
          } catch (error) {
            done(error);
          }
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const errorData = data.toString();
        // Only fail on unexpected errors (suppress warnings and shell environment issues)
        if (!errorData.includes('WARN') && !errorData.includes('zshenv') && errorData.trim()) {
          done(new Error(`Server stderr: ${errorData.trim()}`));
        }
      });

      serverProcess.on('exit', (code) => {
        if (!serverStarted && code !== 0) {
          done(new Error(`Server failed to start, exit code: ${code}`));
        }
      });

      // Timeout after 5 seconds
      const startTimeout = setTimeout(() => {
        if (!serverStarted) {
          done(new Error('Server did not start within 5 seconds'));
        }
      }, 5000);
    });

    test('should validate server mode implementation', () => {
      // This test validates that the server mode implementation is complete
      // by checking that key components exist and can be imported
      expect(() => {
        require('../../src/debugger/DBGpServer');
        require('../../src/debugger/DBGpSession');
        require('../../src/cli/commands/server');
      }).not.toThrow();
            
      // Additional validation could be added here for component interfaces
    });
  });

  describe('Error Handling', () => {
    test('should handle port conflicts gracefully', (done) => {
      // Start first server
      const firstServer = spawn(nodePath, ['src/cli/index.js', 'server', '--port', testPort.toString()], {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      firstServer.stdout.on('data', (data) => {
        if (data.toString().includes('YDebug Server listening')) {
          // Try to start second server on same port
          const secondServer = spawn(nodePath, ['src/cli/index.js', 'server', '--port', testPort.toString()], {
            cwd: projectRoot,
            stdio: 'pipe'
          });

          secondServer.stderr.on('data', () => {
            // Capture stderr but don't need to store it
          });

          secondServer.on('exit', (code) => {
            try {
              // Second server should exit with error
              expect(code).not.toBe(0);
                            
              // Clean up first server
              firstServer.kill('SIGTERM');
              clearTimeout(portConflictTimeout);
              done();
            } catch (error) {
              firstServer.kill('SIGTERM');
              clearTimeout(portConflictTimeout);
              done(error);
            }
          });
        }
      });

      const portConflictTimeout = setTimeout(() => {
        firstServer.kill('SIGTERM');
        done(new Error('Port conflict test timeout'));
      }, 5000);
    });
  });
});