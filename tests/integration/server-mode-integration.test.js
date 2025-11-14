const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe.skip('Server Mode Integration', () => {
    let serverProcess = null;
    const testPort = 9006;
    
    // Create a simple test PHP script
    const testScript = `<?php
$message = "Server mode test";
$number = 42;
$array = ["test", "data"];

echo "Test script running\\n";
if (function_exists('xdebug_break')) {
    xdebug_break();
}
echo "Test complete\\n";
?>`;

    const testScriptPath = path.join(__dirname, 'test-server-mode.php');

    beforeAll(() => {
        // Create test PHP script
        fs.writeFileSync(testScriptPath, testScript);
    });

    afterAll(() => {
        // Clean up test script
        if (fs.existsSync(testScriptPath)) {
            fs.unlinkSync(testScriptPath);
        }
    });

    afterEach(() => {
        // Kill server process if running
        if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGTERM');
            serverProcess = null;
        }
    });

    it('should start server and accept --help flag', (done) => {
        const serverCmd = spawn('node', [
            path.join(__dirname, '../../src/cli/index.js'),
            'server',
            '--help'
        ]);

        let output = '';
        serverCmd.stdout.on('data', (data) => {
            output += data.toString();
        });

        serverCmd.on('close', (code) => {
            expect(code).toBe(0);
            expect(output).toContain('Run YDebug in server mode');
            expect(output).toContain('--port');
            expect(output).toContain('--max-connections');
            done();
        });
    }, 10000);

    it('should start server with custom port', (done) => {
        serverProcess = spawn('node', [
            path.join(__dirname, '../../src/cli/index.js'),
            'server',
            '--port', testPort.toString()
        ]);

        let output = '';
        let errorOutput = '';

        serverProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        serverProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
            if (serverProcess && !serverProcess.killed) {
                serverProcess.kill('SIGTERM');
            }
            
            expect(output).toContain(`Starting YDebug Server on localhost:${testPort}`);
            expect(output).toContain('Ready for Xdebug connections');
            
            // Verify no errors
            expect(errorOutput).not.toContain('Error:');
            expect(errorOutput).not.toContain('❌');
            
            done();
        }, 3000);

        // Handle early exit
        serverProcess.on('exit', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                done(new Error(`Server exited with code ${code}: ${errorOutput}`));
            }
        });
    }, 10000);

    it('should handle port conflicts gracefully', (done) => {
        // Start first server
        const firstServer = spawn('node', [
            path.join(__dirname, '../../src/cli/index.js'),
            'server',
            '--port', testPort.toString()
        ]);

        setTimeout(() => {
            // Start second server on same port
            const secondServer = spawn('node', [
                path.join(__dirname, '../../src/cli/index.js'),
                'server',
                '--port', testPort.toString()
            ]);

            let errorOutput = '';
            secondServer.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            secondServer.on('close', (code) => {
                expect(code).toBe(1); // Should exit with error
                expect(errorOutput).toContain('already in use');
                
                // Clean up first server
                firstServer.kill('SIGTERM');
                done();
            });
        }, 1000);
    }, 15000);
});

describe('Server Command Validation', () => {
    it('should validate CLI command registration', (done) => {
        const helpCmd = spawn('node', [
            path.join(__dirname, '../../src/cli/index.js'),
            '--help'
        ]);

        let output = '';
        helpCmd.stdout.on('data', (data) => {
            output += data.toString();
        });

        helpCmd.on('close', (code) => {
            expect(code).toBe(0);
            expect(output).toContain('server');
            expect(output).toContain('inspect');
            expect(output).toContain('connect');
            expect(output).toContain('config');
            done();
        });
    }, 5000);

    it('should show server command options', (done) => {
        const serverHelpCmd = spawn('node', [
            path.join(__dirname, '../../src/cli/index.js'),
            'server',
            '--help'
        ]);

        let output = '';
        serverHelpCmd.stdout.on('data', (data) => {
            output += data.toString();
        });

        serverHelpCmd.on('close', (code) => {
            expect(code).toBe(0);
            expect(output).toContain('--host');
            expect(output).toContain('--port');
            expect(output).toContain('--max-connections');
            expect(output).toContain('--session-timeout');
            expect(output).toContain('--breakpoint-file');
            expect(output).toContain('--breakpoint-line');
            expect(output).toContain('--json');
            expect(output).toContain('--no-colors');
            expect(output).toContain('--no-auto-inspect');
            done();
        });
    }, 5000);
});