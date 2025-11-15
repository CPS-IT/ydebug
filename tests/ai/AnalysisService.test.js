/**
 * AnalysisService Tests
 * Test suite for the AI analysis service functionality
 *
 * Copyright (C) 2024 YDebug Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Mock dependencies
const mockConfigManagerLoad = jest.fn();
const mockClaudeClientSendMessage = jest.fn();
const mockClaudeClientInitialize = jest.fn();

jest.mock('../../src/config/ConfigManager', () => {
  return jest.fn().mockImplementation(() => ({
    load: mockConfigManagerLoad,
  }));
});

jest.mock('../../src/ai/ClaudeClient', () => ({
  ClaudeClient: jest.fn().mockImplementation(() => ({
    initialize: mockClaudeClientInitialize,
    sendMessage: mockClaudeClientSendMessage,
    config: { model: 'claude-sonnet-4-5' },
    initialized: true,
  }))
}));

jest.mock('../../src/utils/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const AnalysisService = require('../../src/ai/AnalysisService');

describe('AnalysisService', () => {
  let analysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock responses
    mockConfigManagerLoad.mockResolvedValue({
      ai: {
        apiKey: 'test-api-key',
        model: 'claude-sonnet-4-5',
        maxTokens: 4000,
        timeout: 30000,
        rateLimitRpm: 60,
      },
    });

    mockClaudeClientSendMessage.mockResolvedValue({
      content: [{ text: 'Mock AI analysis response' }],
    });

    analysisService = new AnalysisService();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid configuration', async () => {
      await analysisService.initialize();

      expect(mockConfigManagerLoad).toHaveBeenCalled();
      expect(mockClaudeClientInitialize).toHaveBeenCalled();
    });

    test('should handle initialization errors gracefully', async () => {
      mockConfigManagerLoad.mockRejectedValue(new Error('Config load failed'));

      await expect(analysisService.initialize()).rejects.toThrow('Config load failed');
    });

    test('should initialize with default configuration if config is missing', async () => {
      mockConfigManagerLoad.mockResolvedValue({});

      await analysisService.initialize();

      expect(mockClaudeClientInitialize).toHaveBeenCalled();
    });
  });

  describe('Prompt Templates', () => {
    test('should initialize prompt templates correctly', () => {
      const templates = analysisService.promptTemplates;

      expect(templates).toHaveProperty('variableAnalysis');
      expect(templates).toHaveProperty('errorAnalysis');
      expect(templates).toHaveProperty('performanceAnalysis');
      expect(templates).toHaveProperty('logicAnalysis');

      // Check template structure
      expect(templates.variableAnalysis).toHaveProperty('system');
      expect(templates.variableAnalysis).toHaveProperty('user');
    });

    test('should return available analysis types', () => {
      const types = analysisService.getAvailableAnalysisTypes();

      expect(types).toContain('variableAnalysis');
      expect(types).toContain('errorAnalysis');
      expect(types).toContain('performanceAnalysis');
      expect(types).toContain('logicAnalysis');
    });
  });

  describe('Context Preparation', () => {
    test('should prepare context with all fields', () => {
      const rawContext = {
        filename: 'test.php',
        line: 25,
        function: 'testFunction',
        variables: [
          { name: '$test', type: 'string', value: 'hello' },
          { name: '$count', type: 'int', value: 42 },
        ],
        execution: {
          status: 'break',
          reason: 'breakpoint',
        },
        error: 'Test error message',
      };

      const prepared = analysisService.prepareContext(rawContext, { expectedBehavior: 'Should work' });

      expect(prepared.filename).toBe('test.php');
      expect(prepared.line).toBe(25);
      expect(prepared.function).toBe('testFunction');
      expect(prepared.variables).toContain('- $test (string): "hello"');
      expect(prepared.variables).toContain('- $count (int): 42');
      expect(prepared.context).toContain('Status: break');
      expect(prepared.error).toBe('Test error message');
      expect(prepared.expectedBehavior).toBe('Should work');
    });

    test('should handle missing context fields gracefully', () => {
      const prepared = analysisService.prepareContext({});

      expect(prepared.filename).toBe('Unknown file');
      expect(prepared.line).toBe('Unknown line');
      expect(prepared.function).toBe('Global scope');
      expect(prepared.variables).toBe('No variables available');
      expect(prepared.context).toBe('No execution context available');
    });

    test('should format variables correctly', () => {
      const variables = [
        { name: '$string_var', type: 'string', value: 'test value' },
        { name: '$int_var', type: 'int', value: 123 },
        { name: '$bool_var', type: 'bool', value: true },
        { name: '$array_var', type: 'array', value: [1, 2, 3] },
        { name: '$null_var', type: 'null', value: null },
      ];

      const formatted = analysisService.formatVariables(variables);

      expect(formatted).toContain('- $string_var (string): "test value"');
      expect(formatted).toContain('- $int_var (int): 123');
      expect(formatted).toContain('- $bool_var (bool): true');
      expect(formatted).toContain('- $array_var (array)');
      expect(formatted).toContain('- $null_var (null): null');
    });

    test('should handle empty variables array', () => {
      const formatted = analysisService.formatVariables([]);

      expect(formatted).toBe('No variables available');
    });

    test('should handle null or undefined variables', () => {
      expect(analysisService.formatVariables(null)).toBe('No variables available');
      expect(analysisService.formatVariables(undefined)).toBe('No variables available');
    });
  });

  describe('Variable Formatting', () => {
    test('should format string values', () => {
      const formatted = analysisService.formatVariableValue('test string', 'string');
      expect(formatted).toBe('"test string"');
    });

    test('should format array values', () => {
      const formatted = analysisService.formatVariableValue([1, 2, 3], 'array');
      expect(formatted).toContain('[3 items]');
    });

    test('should format object values', () => {
      const formatted = analysisService.formatVariableValue({ key: 'value' }, 'object');
      expect(formatted).toContain('{object}');
    });

    test('should format boolean values', () => {
      expect(analysisService.formatVariableValue(true, 'bool')).toBe('true');
      expect(analysisService.formatVariableValue(false, 'boolean')).toBe('false');
    });

    test('should handle null and undefined values', () => {
      expect(analysisService.formatVariableValue(null, 'any')).toBe('null');
      expect(analysisService.formatVariableValue(undefined, 'any')).toBe('undefined');
    });

    test('should truncate long values', () => {
      const longString = 'x'.repeat(300);
      const formatted = analysisService.formatVariableValue(longString, 'string');
      expect(formatted.length).toBeLessThan(250);
    });
  });

  describe('Execution Context Formatting', () => {
    test('should format execution context with all fields', () => {
      const execution = {
        status: 'break',
        reason: 'breakpoint',
        stack: ['frame1', 'frame2'],
        breakpoint: 'line_25',
      };

      const formatted = analysisService.formatExecutionContext(execution);

      expect(formatted).toContain('Status: break');
      expect(formatted).toContain('Reason: breakpoint');
      expect(formatted).toContain('Stack depth: 2');
      expect(formatted).toContain('Breakpoint: line_25');
    });

    test('should handle empty execution context', () => {
      const formatted = analysisService.formatExecutionContext({});
      expect(formatted).toBe('No execution context available');
    });
  });

  describe('Template Filling', () => {
    test('should fill template placeholders correctly', () => {
      const template = 'File: {filename}, Line: {line}, Function: {function}';
      const data = {
        filename: 'test.php',
        line: 25,
        function: 'testFunction',
      };

      const filled = analysisService.fillPromptTemplate(template, data);

      expect(filled).toBe('File: test.php, Line: 25, Function: testFunction');
    });

    test('should handle missing placeholders', () => {
      const template = 'File: {filename}, Missing: {missing}';
      const data = { filename: 'test.php' };

      const filled = analysisService.fillPromptTemplate(template, data);

      expect(filled).toBe('File: test.php, Missing: Not available');
    });

    test('should handle multiple instances of same placeholder', () => {
      const template = '{filename} at {filename}';
      const data = { filename: 'test.php' };

      const filled = analysisService.fillPromptTemplate(template, data);

      expect(filled).toBe('test.php at test.php');
    });
  });

  describe('Analysis Execution', () => {
    beforeEach(async () => {
      await analysisService.initialize();
    });

    test('should perform variable analysis successfully', async () => {
      const context = {
        filename: 'test.php',
        line: 25,
        variables: [{ name: '$test', type: 'string', value: 'hello' }],
      };

      const result = await analysisService.analyzeContext(context);

      expect(result.type).toBe('variableAnalysis');
      expect(result.insights).toBe('Mock AI analysis response');
      expect(result.model).toBe('claude-sonnet-4-5');
      expect(result.timestamp).toBeDefined();
      expect(mockClaudeClientSendMessage).toHaveBeenCalled();
    });

    test('should support different analysis types', async () => {
      const context = { filename: 'test.php', variables: [] };

      await analysisService.analyzeContext(context, { type: 'performanceAnalysis' });

      // eslint-disable-next-line no-unused-vars
      const [messages, options] = mockClaudeClientSendMessage.mock.calls[0];
      expect(options.system).toContain('performance analyst');
    });

    test('should handle unknown analysis types', async () => {
      const context = { filename: 'test.php', variables: [] };

      await expect(
        analysisService.analyzeContext(context, { type: 'unknownAnalysis' })
      ).rejects.toThrow('Unknown analysis type: unknownAnalysis');
    });

    test('should pass custom options to Claude client', async () => {
      const context = { filename: 'test.php', variables: [] };
      const options = { maxTokens: 1000 };

      await analysisService.analyzeContext(context, options);

      expect(mockClaudeClientSendMessage).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ maxTokens: 1000 })
      );
    });

    test('should auto-initialize if not already initialized', async () => {
      const freshService = new AnalysisService();
      const context = { filename: 'test.php', variables: [] };

      await freshService.analyzeContext(context);

      expect(mockConfigManagerLoad).toHaveBeenCalled();
    });

    test('should handle API errors gracefully', async () => {
      mockClaudeClientSendMessage.mockRejectedValue(new Error('API Error'));

      const context = { filename: 'test.php', variables: [] };

      await expect(analysisService.analyzeContext(context)).rejects.toThrow('API Error');
    });
  });

  describe('Service State', () => {
    test('should report ready state correctly', async () => {
      expect(analysisService.isReady()).toBe(false);

      await analysisService.initialize();

      expect(analysisService.isReady()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle Claude client initialization failure', async () => {
      const freshService = new AnalysisService();
      mockClaudeClientInitialize.mockRejectedValue(new Error('Claude init failed'));

      await expect(freshService.initialize()).rejects.toThrow('Claude init failed');
      
      // Reset for other tests
      mockClaudeClientInitialize.mockResolvedValue();
    });

    test('should handle missing AI configuration', async () => {
      const freshService = new AnalysisService();
      mockConfigManagerLoad.mockResolvedValue({ ai: null });

      await freshService.initialize();

      // Should still initialize with undefined values
      expect(mockClaudeClientInitialize).toHaveBeenCalled();
      
      // Reset for other tests
      mockConfigManagerLoad.mockResolvedValue({
        ai: {
          apiKey: 'test-api-key',
          model: 'claude-sonnet-4-5',
        },
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete analysis workflow', async () => {
      const freshService = new AnalysisService();
      await freshService.initialize();

      const context = {
        filename: 'complex-script.php',
        line: 42,
        function: 'processData',
        variables: [
          { name: '$user_input', type: 'string', value: 'malicious<script>' },
          { name: '$validation_result', type: 'bool', value: false },
          { name: '$errors', type: 'array', value: ['Invalid input', 'XSS detected'] },
        ],
        execution: {
          status: 'break',
          reason: 'breakpoint',
          breakpoint: 'security_check',
        },
      };

      const analysis = await freshService.analyzeContext(context, {
        type: 'variableAnalysis',
        expectedBehavior: 'Should validate and sanitize user input',
      });

      expect(analysis.type).toBe('variableAnalysis');
      expect(analysis.context.variables).toContain('$user_input');
      expect(analysis.context.variables).toContain('XSS detected');
      expect(analysis.insights).toBe('Mock AI analysis response');
    });

    test('should handle error analysis workflow', async () => {
      const freshService = new AnalysisService();
      await freshService.initialize();

      const context = {
        filename: 'error-prone.php',
        line: 15,
        error: 'Fatal error: Call to undefined function nonExistentFunction()',
        variables: [
          { name: '$data', type: 'null', value: null },
          { name: '$config', type: 'array', value: [] },
        ],
      };

      const analysis = await freshService.analyzeContext(context, {
        type: 'errorAnalysis',
      });

      expect(analysis.type).toBe('errorAnalysis');
      expect(analysis.context.error).toBe('Fatal error: Call to undefined function nonExistentFunction()');
    });
  });
});