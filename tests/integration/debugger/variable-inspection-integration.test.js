/**
 * Variable Inspection Integration Tests
 * Tests the complete variable inspection workflow with realistic scenarios
 */

const { DBGpCommands } = require('../../../src/debugger/DBGpCommands');
const { commandRegistry } = require('../../../src/debugger/CommandRegistry');
const VariableFormatter = require('../../../src/debugger/VariableFormatter');

describe('Variable Inspection Integration Tests', () => {
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

  describe('Context Operations', () => {
    it('should get available contexts successfully', async () => {
      // Mock successful context_names response
      const mockResponse = `
        <response xmlns="urn:debugger_protocol_v1" transaction_id="123">
          <context id="0" name="Locals"/>
          <context id="1" name="Superglobals"/>
          <context id="2" name="User defined constants"/>
        </response>
      `;

      client.sendCommand.mockResolvedValue(mockResponse);
      client.xmlParser.parseResponse.mockReturnValue({
        context: [
          { $: { id: '0', name: 'Locals' } },
          { $: { id: '1', name: 'Superglobals' } },
          { $: { id: '2', name: 'User defined constants' } }
        ]
      });

      const result = await commands.getContextNames();

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(result.contexts).toHaveLength(3);
      expect(result.contexts[0]).toMatchObject({
        id: 0,
        name: 'Locals',
        description: 'Local variables in current function scope'
      });
    });

    it('should get local variables successfully', async () => {
      // Mock successful context_get response with various PHP data types
      const mockResponse = `
        <response xmlns="urn:debugger_protocol_v1" transaction_id="124">
          <property name="userName" type="string" size="4" encoding="base64">${Buffer.from('John').toString('base64')}</property>
          <property name="age" type="int" encoding="base64">${Buffer.from('25').toString('base64')}</property>
          <property name="isActive" type="bool" encoding="base64">${Buffer.from('1').toString('base64')}</property>
          <property name="score" type="float" encoding="base64">${Buffer.from('98.5').toString('base64')}</property>
        </response>
      `;

      client.sendCommand.mockResolvedValue(mockResponse);
      client.xmlParser.parseResponse.mockReturnValue({
        property: [
          {
            $: { name: 'userName', type: 'string', size: '4', encoding: 'base64' },
            _: Buffer.from('John').toString('base64')
          },
          {
            $: { name: 'age', type: 'int', encoding: 'base64' },
            _: Buffer.from('25').toString('base64')
          },
          {
            $: { name: 'isActive', type: 'bool', encoding: 'base64' },
            _: Buffer.from('1').toString('base64')
          },
          {
            $: { name: 'score', type: 'float', encoding: 'base64' },
            _: Buffer.from('98.5').toString('base64')
          }
        ]
      });

      const result = await commands.getLocalVariables();

      expect(result.success).toBe(true);
      expect(result.count).toBe(4);
      expect(result.variables).toHaveLength(4);

      // Check string variable
      expect(result.variables[0]).toMatchObject({
        name: 'userName',
        type: 'string',
        value: 'John',
        size: 4
      });

      // Check integer variable
      expect(result.variables[1]).toMatchObject({
        name: 'age',
        type: 'int',
        value: '25'
      });

      // Check boolean variable
      expect(result.variables[2]).toMatchObject({
        name: 'isActive',
        type: 'bool',
        value: '1'
      });

      // Check float variable
      expect(result.variables[3]).toMatchObject({
        name: 'score',
        type: 'float',
        value: '98.5'
      });
    });

    it('should get array variables with child properties', async () => {
      // Mock array variable with nested properties
      client.sendCommand.mockResolvedValue('<response></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        property: {
          $: {
            name: 'userList',
            type: 'array',
            numchildren: '2',
            children: '1',
            size: '2'
          },
          property: [
            {
              $: {
                name: '0',
                type: 'string',
                encoding: 'base64'
              },
              _: Buffer.from('Alice').toString('base64')
            },
            {
              $: {
                name: '1',
                type: 'string',
                encoding: 'base64'
              },
              _: Buffer.from('Bob').toString('base64')
            }
          ]
        }
      });

      const result = await commands.getLocalVariables();

      expect(result.variables[0]).toMatchObject({
        name: 'userList',
        type: 'array',
        hasChildren: true,
        numchildren: 2,
        size: 2
      });

      expect(result.variables[0].properties).toHaveLength(2);
      expect(result.variables[0].properties[0]).toMatchObject({
        name: '0',
        type: 'string',
        value: 'Alice'
      });
      expect(result.variables[0].properties[1]).toMatchObject({
        name: '1',
        type: 'string',
        value: 'Bob'
      });
    });

    it('should get object variables with class information', async () => {
      // Mock object variable
      client.sendCommand.mockResolvedValue('<response></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        property: {
          $: {
            name: 'user',
            type: 'object',
            classname: 'User',
            numchildren: '2',
            constant: '0'
          },
          property: [
            {
              $: {
                name: 'name',
                type: 'string',
                encoding: 'base64'
              },
              _: Buffer.from('John Doe').toString('base64')
            },
            {
              $: {
                name: 'email',
                type: 'string',
                encoding: 'base64'
              },
              _: Buffer.from('john@example.com').toString('base64')
            }
          ]
        }
      });

      const result = await commands.getLocalVariables();

      expect(result.variables[0]).toMatchObject({
        name: 'user',
        type: 'object',
        classname: 'User',
        hasChildren: true,
        numchildren: 2,
        constant: false
      });

      expect(result.variables[0].properties[0]).toMatchObject({
        name: 'name',
        value: 'John Doe'
      });
      expect(result.variables[0].properties[1]).toMatchObject({
        name: 'email',
        value: 'john@example.com'
      });
    });

    it('should handle global variables context', async () => {
      // Mock global variables response
      client.sendCommand.mockResolvedValue('<response></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        $: { contextId: '1' },
        property: [
          {
            $: {
              name: '_GET',
              type: 'array',
              numchildren: '1'
            },
            property: {
              $: {
                name: 'id',
                type: 'string',
                encoding: 'base64'
              },
              _: Buffer.from('123').toString('base64')
            }
          },
          {
            $: {
              name: '_POST',
              type: 'array',
              numchildren: '0'
            }
          }
        ]
      });

      const result = await commands.getGlobalVariables();

      expect(result.contextId).toBe(1);
      expect(result.variables).toHaveLength(2);
      expect(result.variables[0].name).toBe('_GET');
      expect(result.variables[1].name).toBe('_POST');
    });

    it('should handle empty context gracefully', async () => {
      client.sendCommand.mockResolvedValue('<response></response>');
      client.xmlParser.parseResponse.mockReturnValue({});

      const result = await commands.getLocalVariables();

      expect(result).toEqual({
        contextId: 0,
        variables: [],
        count: 0,
        success: true
      });
    });
  });

  describe('Variable Formatting', () => {
    let formatter;

    beforeEach(() => {
      formatter = new VariableFormatter({
        colors: false, // Disable colors for testing
        maxDepth: 2,
        maxStringLength: 20
      });
    });

    it('should format simple variables correctly', () => {
      const variables = [
        {
          name: 'userName',
          type: 'string',
          value: 'John Doe',
          size: 8,
          hasChildren: false,
          properties: []
        },
        {
          name: 'age',
          type: 'int',
          value: '25',
          hasChildren: false,
          properties: []
        }
      ];

      const result = formatter.formatVariables(variables);

      expect(result).toContain('userName (string): "John Doe"');
      expect(result).toContain('age (int): 25');
      expect(result).toContain('[8]'); // Size indicator
    });

    it('should format nested structures', () => {
      const variables = [
        {
          name: 'userArray',
          type: 'array',
          value: null,
          numchildren: 2,
          hasChildren: true,
          properties: [
            {
              name: '0',
              type: 'string',
              value: 'Alice',
              hasChildren: false,
              properties: []
            },
            {
              name: '1',
              type: 'string', 
              value: 'Bob',
              hasChildren: false,
              properties: []
            }
          ]
        }
      ];

      const result = formatter.formatVariables(variables);

      expect(result).toContain('userArray (array): Array[2]');
      expect(result).toContain('  0 (string): "Alice"');
      expect(result).toContain('  1 (string): "Bob"');
    });

    it('should format as JSON correctly', () => {
      const variables = [
        {
          name: 'test',
          type: 'string',
          value: 'hello',
          size: 5,
          constant: false,
          hasChildren: false,
          numchildren: 0
        }
      ];

      const result = formatter.formatAsJSON(variables);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        name: 'test',
        type: 'string',
        value: 'hello',
        size: 5,
        constant: false,
        hasChildren: false,
        numChildren: 0
      });
    });

    it('should handle long strings with truncation', () => {
      const variables = [
        {
          name: 'longText',
          type: 'string',
          value: 'This is a very long string that should be truncated',
          hasChildren: false,
          properties: []
        }
      ];

      const result = formatter.formatVariables(variables);

      expect(result).toContain('longText (string)');
      expect(result).toContain('...'); // Truncation indicator
      expect(result.length).toBeLessThan(200); // Should be reasonably short
    });
  });

  describe('Error Handling', () => {
    it('should handle context_names command errors', async () => {
      client.sendCommand.mockRejectedValue(new Error('Connection lost'));

      await expect(commands.getContextNames())
        .rejects.toThrow('Connection lost');
    });

    it('should handle context_get command errors', async () => {
      client.sendCommand.mockRejectedValue(new Error('Invalid context'));

      await expect(commands.getLocalVariables())
        .rejects.toThrow('Invalid context');
    });

    it('should handle disconnected client', async () => {
      client.isConnectedToDebugger.mockReturnValue(false);

      await expect(commands.getLocalVariables())
        .rejects.toThrow('Cannot execute command context_get: not connected to debugger');
    });

    it('should handle malformed XML responses', async () => {
      client.sendCommand.mockResolvedValue('<response></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        error: { message: 'Invalid XML structure' }
      });

      await expect(commands.getLocalVariables())
        .rejects.toThrow('Context get failed: Invalid XML structure');
    });
  });

  describe('Command Registry Integration', () => {
    it('should have context commands registered', () => {
      expect(commandRegistry.has('context_get')).toBe(true);
      expect(commandRegistry.has('context_names')).toBe(true);
    });

    it('should execute context commands through registry', async () => {
      client.sendCommand.mockResolvedValue('<response></response>');
      client.xmlParser.parseResponse.mockReturnValue({
        contexts: [
          { $: { id: '0', name: 'Locals' } }
        ]
      });

      const result = await commandRegistry.execute('context_names', client, {});

      expect(result.success).toBe(true);
      expect(result.contexts).toBeDefined();
    });
  });
});