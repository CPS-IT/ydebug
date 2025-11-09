/**
 * DBGp Commands Tests
 * Tests for the DBGp command execution framework
 */

const { DBGpCommands } = require('../../src/debugger/DBGpCommands');

describe('DBGpCommands', () => {
    let mockClient;
    let commands;
    
    beforeEach(() => {
        // Mock DBGp client
        mockClient = {
            sendCommand: jest.fn()
        };
        
        commands = new DBGpCommands(mockClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with client and default values', () => {
            expect(commands.client).toBe(mockClient);
            expect(commands.transactionId).toBe(0);
            expect(commands.commandTimeout).toBe(5000);
        });
    });

    describe('Transaction ID Management', () => {
        test('should increment transaction ID', () => {
            expect(commands.getNextTransactionId()).toBe(1);
            expect(commands.getNextTransactionId()).toBe(2);
            expect(commands.getNextTransactionId()).toBe(3);
        });
    });

    describe('XML Response Parsing', () => {
        test('should parse valid XML response', async () => {
            const xmlString = '<?xml version="1.0" encoding="iso-8859-1"?><response status="break" reason="ok" transaction_id="1"></response>';
            
            const result = await commands.parseXMLResponse(xmlString);
            
            expect(result).toEqual({
                response: {
                    status: 'break',
                    reason: 'ok',
                    transaction_id: '1'
                }
            });
        });

        test('should handle XML parsing errors', async () => {
            const invalidXml = 'not valid xml';
            
            await expect(commands.parseXMLResponse(invalidXml))
                .rejects.toThrow('Failed to parse XML response');
        });

        test('should handle empty XML input', async () => {
            await expect(commands.parseXMLResponse(''))
                .rejects.toThrow('Invalid XML response: empty or non-string');
        });

        test('should handle non-string input', async () => {
            await expect(commands.parseXMLResponse(null))
                .rejects.toThrow('Invalid XML response: empty or non-string');
        });
    });

    describe('Transaction ID Validation', () => {
        test('should extract transaction ID from response.response', () => {
            const response = {
                response: { transaction_id: '5' }
            };
            
            expect(commands.extractTransactionId(response)).toBe(5);
        });

        test('should extract transaction ID from response.init', () => {
            const response = {
                init: { transaction_id: '3' }
            };
            
            expect(commands.extractTransactionId(response)).toBe(3);
        });

        test('should extract transaction ID from root level', () => {
            const response = {
                transaction_id: '7'
            };
            
            expect(commands.extractTransactionId(response)).toBe(7);
        });

        test('should return null for missing transaction ID', () => {
            const response = { someOtherField: 'value' };
            
            expect(commands.extractTransactionId(response)).toBe(null);
        });

        test('should validate matching transaction IDs', () => {
            const response = {
                response: { transaction_id: '5' }
            };
            
            expect(() => {
                commands.validateTransactionId(response, 5);
            }).not.toThrow();
        });

        test('should throw error for mismatched transaction IDs', () => {
            const response = {
                response: { transaction_id: '5' }
            };
            
            expect(() => {
                commands.validateTransactionId(response, 3);
            }).toThrow('Transaction ID mismatch: expected 3, got 5');
        });
    });

    describe('Error Checking', () => {
        test('should return null for response without error', () => {
            const response = {
                response: { status: 'break', reason: 'ok' }
            };
            
            expect(commands.checkResponseError(response)).toBe(null);
        });

        test('should return Error for response with error', () => {
            const response = {
                response: {
                    error: {
                        code: '5',
                        message: 'Parse error'
                    }
                }
            };
            
            const error = commands.checkResponseError(response);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('DBGp Error 5: Parse error');
        });

        test('should handle error without code', () => {
            const response = {
                response: {
                    error: {
                        message: 'Some error'
                    }
                }
            };
            
            const error = commands.checkResponseError(response);
            expect(error.message).toBe('DBGp Error unknown: Some error');
        });

        test('should handle error without message', () => {
            const response = {
                response: {
                    error: {
                        code: '10'
                    }
                }
            };
            
            const error = commands.checkResponseError(response);
            expect(error.message).toBe('DBGp Error 10: Unknown DBGp error');
        });
    });

    describe('Execute Command', () => {
        test('should execute command successfully', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="break" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.executeCommand('status');
            
            expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', { timeout: 5000 });
            expect(result).toEqual({
                response: {
                    status: 'break',
                    transaction_id: '1'
                }
            });
        });

        test('should use custom timeout', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="break" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            await commands.executeCommand('status', { timeout: 10000 });
            
            expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', { timeout: 10000 });
        });

        test('should handle command execution errors', async () => {
            mockClient.sendCommand.mockRejectedValue(new Error('Connection lost'));
            
            await expect(commands.executeCommand('status'))
                .rejects.toThrow('Connection lost');
        });

        test('should validate transaction ID in response', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="break" transaction_id="999"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            await expect(commands.executeCommand('status'))
                .rejects.toThrow('Transaction ID mismatch');
        });
    });

    describe('Status Command', () => {
        test('should execute status command successfully', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="break" reason="ok" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.status();
            
            expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', { timeout: 5000 });
            expect(result.status).toBe('break');
            expect(result.reason).toBe('ok');
        });

        test('should handle status command with error', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response transaction_id="1"><error code="5" message="Invalid state"/></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            await expect(commands.status())
                .rejects.toThrow('DBGp Error 5: Invalid state');
        });

        test('should handle status command without reason', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="running" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.status();
            
            expect(result.status).toBe('running');
            expect(result.reason).toBe('');
        });
    });

    describe('Feature Get Command', () => {
        test('should execute feature_get command successfully', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response feature_name="max_depth" supported="1" transaction_id="1">100</response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.featureGet('max_depth');
            
            expect(mockClient.sendCommand).toHaveBeenCalledWith('feature_get -n max_depth -i 1', { timeout: 5000 });
            expect(result.featureName).toBe('max_depth');
            expect(result.supported).toBe(true);
            expect(result.value).toBe('100');
        });

        test('should handle unsupported feature', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response feature_name="nonexistent" supported="0" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.featureGet('nonexistent');
            
            expect(result.supported).toBe(false);
            expect(result.value).toBe('');
        });
    });

    describe('Feature Set Command', () => {
        test('should execute feature_set command successfully', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response feature_name="max_depth" success="1" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.featureSet('max_depth', '50');
            
            expect(mockClient.sendCommand).toHaveBeenCalledWith('feature_set -n max_depth -v 50 -i 1', { timeout: 5000 });
            expect(result.featureName).toBe('max_depth');
            expect(result.value).toBe('50');
            expect(result.success).toBe(true);
        });

        test('should handle failed feature set', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response feature_name="readonly" success="0" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.featureSet('readonly', 'value');
            
            expect(result.success).toBe(false);
        });
    });

    describe('Step Over Command', () => {
        test('should execute step_over command successfully', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="break" reason="ok" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.stepOver();
            
            expect(mockClient.sendCommand).toHaveBeenCalledWith('step_over -i 1', { timeout: 5000 });
            expect(result.status).toBe('break');
            expect(result.reason).toBe('ok');
        });

        test('should handle step command ending execution', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="stopped" reason="ok" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            const result = await commands.stepOver();
            
            expect(result.status).toBe('stopped');
        });
    });

    describe('Timeout Configuration', () => {
        test('should set and get timeout', () => {
            commands.setTimeout(15000);
            
            expect(commands.getTimeout()).toBe(15000);
            expect(commands.commandTimeout).toBe(15000);
        });

        test('should use new timeout in commands', async () => {
            commands.setTimeout(20000);
            
            const mockXmlResponse = '<?xml version="1.0"?><response status="break" transaction_id="1"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            await commands.executeCommand('status');
            
            expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', { timeout: 20000 });
        });
    });

    describe('Complex XML Parsing', () => {
        test('should parse XML with nested elements', async () => {
            const xmlString = `<?xml version="1.0"?>
                <response status="break" transaction_id="1">
                    <property name="test" type="string">value</property>
                </response>`;
            
            const result = await commands.parseXMLResponse(xmlString);
            
            expect(result.response.status).toBe('break');
            expect(result.response.property).toBeDefined();
        });

        test('should handle XML with attributes and text content', async () => {
            const xmlString = `<?xml version="1.0"?>
                <response feature_name="max_depth" supported="1" transaction_id="1">100</response>`;
            
            const result = await commands.parseXMLResponse(xmlString);
            
            expect(result.response.feature_name).toBe('max_depth');
            expect(result.response.supported).toBe('1');
            expect(result.response._).toBe('100');
        });
    });

    describe('Error Edge Cases', () => {
        test('should handle XML response without transaction_id', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><response status="break"></response>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            await expect(commands.executeCommand('status'))
                .rejects.toThrow('Transaction ID mismatch: expected 1, got null');
        });

        test('should handle empty response object', async () => {
            const mockXmlResponse = '<?xml version="1.0"?><empty></empty>';
            mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
            
            await expect(commands.executeCommand('status'))
                .rejects.toThrow('Transaction ID mismatch');
        });
    });
});