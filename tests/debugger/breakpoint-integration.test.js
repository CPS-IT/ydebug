/**
 * Breakpoint Integration Tests
 * Tests basic breakpoint functionality with hardcoded locations for prototype
 */

const { DBGpCommands } = require('../../src/debugger/DBGpCommands');
const { commandRegistry } = require('../../src/debugger/CommandRegistry');

describe('Breakpoint Integration Tests', () => {
  let client;
  let commands;

  beforeEach(() => {
    // Create mock client
    client = {
      isConnectedToDebugger: jest.fn(() => true),
      sendCommand: jest.fn(),
      transactionManager: {
        getNext: jest.fn(() => Math.floor(Math.random() * 1000))
      },
      xmlParser: {
        parseResponse: jest.fn()
      }
    };

    commands = new DBGpCommands(client);
  });

  describe('Basic Breakpoint Operations', () => {
    it('should set a hardcoded line breakpoint successfully', async () => {
      // Mock successful breakpoint_set response
      client.sendCommand.mockResolvedValue('<response xmlns="urn:debugger_protocol_v1" transaction_id="123" id="bp1" state="enabled"></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        $: { id: 'bp1', state: 'enabled' }
      });

      // Set breakpoint at hardcoded location for prototype
      const result = await commands.setBreakpoint('/test/prototype.php', 10);

      expect(result).toEqual({
        breakpointId: 'bp1',
        state: 'enabled',
        success: true
      });

      // Verify command was built and sent correctly
      expect(client.sendCommand).toHaveBeenCalledWith(
        expect.stringContaining('breakpoint_set -i'),
        expect.any(Number)
      );

      const sentCommand = client.sendCommand.mock.calls[0][0];
      expect(sentCommand).toContain('-t line');
      expect(sentCommand).toContain('-f file:///test/prototype.php');
      expect(sentCommand).toContain('-n 10');
      expect(sentCommand).toContain('-r 0'); // not temporary
    });

    it('should set a temporary breakpoint', async () => {
      client.sendCommand.mockResolvedValue('<response xmlns="urn:debugger_protocol_v1" transaction_id="124" id="bp2" state="enabled"></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        $: { id: 'bp2', state: 'enabled' }
      });

      const result = await commands.setBreakpoint('/test/temp.php', 15, {
        temporary: true
      });

      expect(result.breakpointId).toBe('bp2');

      const sentCommand = client.sendCommand.mock.calls[0][0];
      expect(sentCommand).toContain('-r 1'); // temporary
    });

    it('should set a conditional breakpoint', async () => {
      client.sendCommand.mockResolvedValue('<response xmlns="urn:debugger_protocol_v1" transaction_id="125" id="bp3" state="enabled"></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        $: { id: 'bp3', state: 'enabled' }
      });

      const result = await commands.setBreakpoint('/test/conditional.php', 20, {
        type: 'conditional',
        expression: '$debug === true'
      });

      expect(result.breakpointId).toBe('bp3');

      const sentCommand = client.sendCommand.mock.calls[0][0];
      expect(sentCommand).toContain('-t conditional');
      expect(sentCommand).toContain('--'); // expression separator
    });

    it('should list breakpoints successfully', async () => {
      client.sendCommand.mockResolvedValue(`
        <response xmlns="urn:debugger_protocol_v1" transaction_id="126">
          <breakpoint id="bp1" type="line" state="enabled" filename="/test/prototype.php" lineno="10" hit_count="0"/>
          <breakpoint id="bp2" type="line" state="enabled" filename="/test/temp.php" lineno="15" temporary="1" hit_count="2"/>
        </response>
      `);
      
      client.xmlParser.parseResponse.mockReturnValue({
        breakpoint: [
          {
            $: {
              id: 'bp1',
              type: 'line',
              state: 'enabled',
              filename: '/test/prototype.php',
              lineno: '10',
              hit_count: '0'
            }
          },
          {
            $: {
              id: 'bp2',
              type: 'line',
              state: 'enabled',
              filename: '/test/temp.php',
              lineno: '15',
              temporary: '1',
              hit_count: '2'
            }
          }
        ]
      });

      const result = await commands.listBreakpoints();

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.breakpoints).toHaveLength(2);
      
      // Verify first breakpoint
      expect(result.breakpoints[0]).toMatchObject({
        id: 'bp1',
        type: 'line',
        state: 'enabled',
        filename: '/test/prototype.php',
        lineno: 10,
        hitCount: 0,
        temporary: false
      });
      
      // Verify second breakpoint
      expect(result.breakpoints[1]).toMatchObject({
        id: 'bp2',
        type: 'line',
        state: 'enabled', 
        filename: '/test/temp.php',
        lineno: 15,
        hitCount: 2,
        temporary: true
      });
    });

    it('should handle empty breakpoint list', async () => {
      client.sendCommand.mockResolvedValue('<response xmlns="urn:debugger_protocol_v1" transaction_id="127"></response>');
      client.xmlParser.parseResponse.mockReturnValue({});

      const result = await commands.listBreakpoints();

      expect(result).toEqual({
        breakpoints: [],
        count: 0,
        success: true
      });
    });
  });

  describe('Prototype Test Scenarios', () => {
    it('should set breakpoint for prototype test script', async () => {
      client.sendCommand.mockResolvedValue('<response xmlns="urn:debugger_protocol_v1" transaction_id="200" id="prototype_bp" state="enabled"></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        $: { id: 'prototype_bp', state: 'enabled' }
      });

      // Hardcoded breakpoint location for prototype testing
      const PROTOTYPE_FILE = '/app/test/prototype_script.php';
      const PROTOTYPE_LINE = 25; // Hardcoded line for prototype

      const result = await commands.setBreakpoint(PROTOTYPE_FILE, PROTOTYPE_LINE);

      expect(result.success).toBe(true);
      expect(result.breakpointId).toBe('prototype_bp');

      // Verify the breakpoint was set at the correct hardcoded location
      const sentCommand = client.sendCommand.mock.calls[0][0];
      expect(sentCommand).toContain(`-f file://${PROTOTYPE_FILE}`);
      expect(sentCommand).toContain(`-n ${PROTOTYPE_LINE}`);
    });

    it('should verify breakpoint is listed after setting', async () => {
      // First, set a breakpoint
      client.sendCommand
        .mockResolvedValueOnce('<response xmlns="urn:debugger_protocol_v1" transaction_id="201" id="verify_bp" state="enabled"></response>')
        .mockResolvedValueOnce(`
          <response xmlns="urn:debugger_protocol_v1" transaction_id="202">
            <breakpoint id="verify_bp" type="line" state="enabled" filename="/app/verify.php" lineno="30" hit_count="0"/>
          </response>
        `);

      client.xmlParser.parseResponse
        .mockReturnValueOnce({ $: { id: 'verify_bp', state: 'enabled' } })
        .mockReturnValueOnce({
          breakpoint: {
            $: {
              id: 'verify_bp',
              type: 'line',
              state: 'enabled',
              filename: '/app/verify.php',
              lineno: '30',
              hit_count: '0'
            }
          }
        });

      // Set breakpoint
      const setResult = await commands.setBreakpoint('/app/verify.php', 30);
      expect(setResult.breakpointId).toBe('verify_bp');

      // List breakpoints to verify it was set
      const listResult = await commands.listBreakpoints();
      expect(listResult.count).toBe(1);
      expect(listResult.breakpoints[0].id).toBe('verify_bp');
      expect(listResult.breakpoints[0].filename).toBe('/app/verify.php');
      expect(listResult.breakpoints[0].lineno).toBe(30);
    });
  });

  describe('Error Handling', () => {
    it('should handle breakpoint set errors', async () => {
      client.sendCommand.mockRejectedValue(new Error('Connection lost'));

      await expect(commands.setBreakpoint('/test/error.php', 10))
        .rejects.toThrow('Connection lost');
    });

    it('should handle invalid breakpoint response', async () => {
      client.sendCommand.mockResolvedValue('<response xmlns="urn:debugger_protocol_v1" transaction_id="300"></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        $: {} // Missing breakpoint ID
      });

      await expect(commands.setBreakpoint('/test/invalid.php', 10))
        .rejects.toThrow('Invalid breakpoint response: missing breakpoint ID');
    });

    it('should handle breakpoint list errors', async () => {
      client.sendCommand.mockRejectedValue(new Error('Network timeout'));

      await expect(commands.listBreakpoints())
        .rejects.toThrow('Command breakpoint_list timed out after');
    });

    it('should handle disconnected client', async () => {
      client.isConnectedToDebugger.mockReturnValue(false);

      await expect(commands.setBreakpoint('/test/disconnected.php', 10))
        .rejects.toThrow('Cannot execute command breakpoint_set: not connected to debugger');
    });
  });

  describe('Command Registry Integration', () => {
    it('should have breakpoint commands registered', () => {
      expect(commandRegistry.has('breakpoint_set')).toBe(true);
      expect(commandRegistry.has('breakpoint_list')).toBe(true);
    });

    it('should execute breakpoint commands through registry', async () => {
      client.sendCommand.mockResolvedValue('<response xmlns="urn:debugger_protocol_v1" transaction_id="400" id="registry_bp" state="enabled"></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        $: { id: 'registry_bp', state: 'enabled' }
      });

      const result = await commandRegistry.execute('breakpoint_set', client, {
        filename: '/test/registry.php',
        lineno: 40
      });

      expect(result.success).toBe(true);
      expect(result.breakpointId).toBe('registry_bp');
    });
  });
});