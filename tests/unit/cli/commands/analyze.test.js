/**
 * Analyze Command Tests
 * Test suite for the analyze CLI command
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

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock dependencies
const mockAnalysisServiceInitialize = jest.fn();
const mockAnalysisServiceAnalyzeContext = jest.fn();

jest.mock('../../../../src/ai/AnalysisService', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: mockAnalysisServiceInitialize,
    analyzeContext: mockAnalysisServiceAnalyzeContext,
  }));
});

jest.mock('../../../../src/utils/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const AnalyzeCommand = require('../../../../src/cli/commands/analyze');

describe('AnalyzeCommand', () => {
  let analyzeCommand;
  let consoleSpy;
  let consoleErrorSpy;
  let processExitSpy;
  let tempDir;

  beforeEach(() => {
    analyzeCommand = new AnalyzeCommand();
    
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    jest.clearAllMocks();
    
    // Default mock responses
    mockAnalysisServiceInitialize.mockResolvedValue();
    mockAnalysisServiceAnalyzeContext.mockResolvedValue({
      type: 'variableAnalysis',
      context: {
        filename: 'test.php',
        line: 25,
        function: 'testFunction',
        variables: '- $test (string): "hello"',
        context: 'Status: break',
      },
      insights: 'Mock AI analysis insights',
      timestamp: '2024-01-01T00:00:00.000Z',
      model: 'claude-sonnet-4-5',
    });
    
    // Create temp directory for file tests
    tempDir = null;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    
    // Clean up temp directory
    if (tempDir) {
      try {
        require('fs').rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Silent cleanup
      }
    }
  });

  describe('Basic Execution', () => {
    test('should execute with default sample context', async () => {
      await analyzeCommand.execute({});

      expect(mockAnalysisServiceInitialize).toHaveBeenCalled();
      expect(mockAnalysisServiceAnalyzeContext).toHaveBeenCalled();
      
      const [context, options] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.filename).toBe('example-script.php');
      expect(options.type).toBe('variableAnalysis');
    });

    test('should handle file and line options', async () => {
      await analyzeCommand.execute({
        file: 'custom-script.php',
        line: 42,
      });

      const [context] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.filename).toBe('custom-script.php');
      expect(context.line).toBe(42);
    });

    test('should handle analysis type option', async () => {
      await analyzeCommand.execute({
        type: 'performanceAnalysis',
      });

      const [, options] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(options.type).toBe('performanceAnalysis');
    });

    test('should handle expected behavior option', async () => {
      await analyzeCommand.execute({
        expectedBehavior: 'Should return user data',
      });

      const [, options] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(options.expectedBehavior).toBe('Should return user data');
    });

    test('should handle max tokens option', async () => {
      await analyzeCommand.execute({
        maxTokens: 1500,
      });

      const [, options] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(options.maxTokens).toBe(1500);
    });
  });

  describe('Context Preparation', () => {
    test('should parse context from JSON string', async () => {
      const contextJson = JSON.stringify({
        filename: 'json-test.php',
        line: 15,
        variables: [{ name: '$var', type: 'string', value: 'test' }],
      });

      await analyzeCommand.execute({
        context: contextJson,
      });

      const [context] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.filename).toBe('json-test.php');
      expect(context.line).toBe(15);
      expect(context.variables).toEqual([{ name: '$var', type: 'string', value: 'test' }]);
    });

    test('should parse variables from JSON string', async () => {
      const variablesJson = JSON.stringify([
        { name: '$user', type: 'string', value: 'John' },
        { name: '$age', type: 'int', value: 30 },
      ]);

      await analyzeCommand.execute({
        variables: variablesJson,
      });

      const [context] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.variables).toEqual([
        { name: '$user', type: 'string', value: 'John' },
        { name: '$age', type: 'int', value: 30 },
      ]);
    });

    test('should read context from file', async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ydebug-analyze-test-'));
      const contextFile = path.join(tempDir, 'context.json');
      const contextData = {
        filename: 'file-test.php',
        line: 20,
        variables: [{ name: '$data', type: 'array', value: [] }],
      };
      
      await fs.writeFile(contextFile, JSON.stringify(contextData));

      await analyzeCommand.execute({
        context: contextFile,
      });

      const [context] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.filename).toBe('file-test.php');
      expect(context.line).toBe(20);
    });

    test('should read variables from file', async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ydebug-analyze-test-'));
      const variablesFile = path.join(tempDir, 'variables.json');
      const variablesData = [
        { name: '$config', type: 'array', value: { debug: true } },
      ];
      
      await fs.writeFile(variablesFile, JSON.stringify(variablesData));

      await analyzeCommand.execute({
        variables: variablesFile,
      });

      const [context] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.variables).toEqual(variablesData);
    });

    test('should handle invalid JSON gracefully', async () => {
      await analyzeCommand.execute({
        context: '{ invalid json',
      });

      // Should still proceed with sample context
      expect(mockAnalysisServiceAnalyzeContext).toHaveBeenCalled();
    });

    test('should handle file read errors gracefully', async () => {
      await analyzeCommand.execute({
        context: '/nonexistent/file.json',
      });

      // Should still proceed with sample context
      expect(mockAnalysisServiceAnalyzeContext).toHaveBeenCalled();
    });
  });

  describe('Analysis Type Determination', () => {
    test('should use explicit type when provided', () => {
      const type = analyzeCommand.determineAnalysisType(
        { type: 'logicAnalysis' },
        { filename: 'test.php' }
      );
      
      expect(type).toBe('logicAnalysis');
    });

    test('should auto-detect error analysis', () => {
      const type = analyzeCommand.determineAnalysisType(
        {},
        { filename: 'test.php', error: 'Fatal error occurred' }
      );
      
      expect(type).toBe('errorAnalysis');
    });

    test('should auto-detect logic analysis with expected behavior', () => {
      const type = analyzeCommand.determineAnalysisType(
        { expectedBehavior: 'Should work correctly' },
        { filename: 'test.php' }
      );
      
      expect(type).toBe('logicAnalysis');
    });

    test('should default to variable analysis', () => {
      const type = analyzeCommand.determineAnalysisType(
        {},
        { filename: 'test.php' }
      );
      
      expect(type).toBe('variableAnalysis');
    });
  });

  describe('Result Display', () => {
    test('should display results in terminal format', async () => {
      await analyzeCommand.execute({ verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith('');
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'AI Analysis Complete');
      expect(consoleSpy).toHaveBeenCalledWith('Analysis Type: variableAnalysis');
      expect(consoleSpy).toHaveBeenCalledWith('Model: claude-sonnet-4-5');
    });

    test('should display results in JSON format', async () => {
      await analyzeCommand.execute({ json: true });

      const jsonOutput = consoleSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].startsWith('{')
      );
      
      expect(jsonOutput).toBeDefined();
      const parsed = JSON.parse(jsonOutput[0]);
      expect(parsed.type).toBe('variableAnalysis');
      expect(parsed.insights).toBe('Mock AI analysis insights');
    });

    test('should format insights with icons', () => {
      const insights = 'Key finding: issue detected\nRecommendation: fix the code\nNote: this is informational';
      const formatted = analyzeCommand.formatInsights(insights);

      expect(formatted).toContain('[!] Key finding: issue detected');
      expect(formatted).toContain('[+] Recommendation: fix the code');
      expect(formatted).toContain('[-] Note: this is informational');
    });

    test('should show verbose context when requested', async () => {
      await analyzeCommand.execute({ verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith('Full Context:');
    });
  });

  describe('Error Handling', () => {
    test('should handle analysis service initialization errors', async () => {
      mockAnalysisServiceInitialize.mockRejectedValue(new Error('Init failed'));

      await analyzeCommand.execute({});

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Init failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should handle analysis errors', async () => {
      mockAnalysisServiceAnalyzeContext.mockRejectedValue(new Error('Analysis failed'));

      await analyzeCommand.execute({});

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Analysis failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should handle empty context gracefully', async () => {
      // Mock empty context extraction
      jest.spyOn(analyzeCommand, 'extractSessionContext').mockResolvedValue({});
      jest.spyOn(analyzeCommand, 'createSampleContext').mockReturnValue({});

      await analyzeCommand.execute({
        context: '',
        variables: '',
        file: '',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'No debugging context provided. Use --context, --file, or provide session data.'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Sample Context', () => {
    test('should create realistic sample context', () => {
      const sample = analyzeCommand.createSampleContext();

      expect(sample.filename).toBe('example-script.php');
      expect(sample.line).toBe(25);
      expect(sample.function).toBe('processUserData');
      expect(sample.variables).toHaveLength(4);
      expect(sample.execution.status).toBe('break');
    });
  });

  describe('Usage Display', () => {
    test('should show usage information', () => {
      analyzeCommand.showUsage();

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug AI Analysis Command');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Usage Examples:');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Available Analysis Types:');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex analysis workflow', async () => {
      const complexContext = {
        filename: 'complex-app.php',
        line: 150,
        function: 'authenticateUser',
        variables: [
          { name: '$username', type: 'string', value: 'admin' },
          { name: '$password_hash', type: 'string', value: '$2y$10$...' },
          { name: '$login_attempts', type: 'int', value: 3 },
          { name: '$is_locked', type: 'bool', value: true },
        ],
        execution: {
          status: 'break',
          reason: 'security_check',
        },
      };

      await analyzeCommand.execute({
        context: JSON.stringify(complexContext),
        type: 'variableAnalysis',
        expectedBehavior: 'Should authenticate user securely',
        verbose: true,
      });

      expect(mockAnalysisServiceAnalyzeContext).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'complex-app.php',
          line: 150,
          function: 'authenticateUser',
        }),
        expect.objectContaining({
          type: 'variableAnalysis',
          expectedBehavior: 'Should authenticate user securely',
        })
      );
    });

    test('should handle performance analysis scenario', async () => {
      await analyzeCommand.execute({
        file: 'slow-query.php',
        line: 85,
        type: 'performanceAnalysis',
        variables: JSON.stringify([
          { name: '$query_time', type: 'float', value: 2.5 },
          { name: '$result_count', type: 'int', value: 50000 },
          { name: '$memory_usage', type: 'int', value: 128000000 },
        ]),
      });

      const [context, options] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.filename).toBe('slow-query.php');
      expect(options.type).toBe('performanceAnalysis');
    });

    test('should handle error analysis scenario', async () => {
      const errorContext = {
        filename: 'broken-script.php',
        line: 42,
        error: 'Fatal error: Uncaught TypeError: Cannot access property of null',
        variables: [
          { name: '$data', type: 'null', value: null },
          { name: '$result', type: 'undefined', value: undefined },
        ],
      };

      await analyzeCommand.execute({
        context: JSON.stringify(errorContext),
      });

      const [context, options] = mockAnalysisServiceAnalyzeContext.mock.calls[0];
      expect(context.error).toContain('Fatal error');
      expect(options.type).toBe('errorAnalysis');
    });
  });
});