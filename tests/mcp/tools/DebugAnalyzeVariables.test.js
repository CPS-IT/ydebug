/**
 * Tests for DebugAnalyzeVariables MCP Tool
 */

const DebugAnalyzeVariables = require('../../../src/mcp/tools/DebugAnalyzeVariables');
const ServiceRegistry = require('../../../src/mcp/ServiceRegistry');

// Mock the AnalysisService
jest.mock('../../../src/ai/AnalysisService', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    analyzeContext: jest.fn(),
    isReady: jest.fn().mockReturnValue(true)
  }));
});
const AnalysisService = require('../../../src/ai/AnalysisService');

describe('DebugAnalyzeVariables', () => {
  let tool;
  let mockServices;
  let mockAnalysisService;

  beforeEach(() => {
    mockServices = new ServiceRegistry();
    
    mockAnalysisService = {
      initialize: jest.fn().mockResolvedValue(),
      analyzeContext: jest.fn(),
      isReady: jest.fn().mockReturnValue(true)
    };

    AnalysisService.mockImplementation(() => mockAnalysisService);
    
    tool = new DebugAnalyzeVariables(mockServices, mockAnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return valid tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('debug_analyze_variables');
      expect(definition.description).toContain('variable states');
      expect(definition.inputSchema.required).toContain('variables');
      expect(definition.inputSchema.properties.focus.enum).toContain('nulls');
      expect(definition.inputSchema.properties.focus.enum).toContain('types');
      expect(definition.inputSchema.properties.focus.enum).toContain('values');
    });
  });

  describe('execute', () => {
    test('should perform variable analysis successfully', async () => {
      const mockAnalysisResult = {
        insights: ['User variable appears to be null'],
        confidence: 'high',
        recommendations: ['Check for null before use'],
        summary: 'Variable analysis complete'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: {
          user: null,
          status: 'active',
          count: 42
        },
        context: {
          filename: 'test.php',
          line: 25,
          function: 'processUser',
          scope: 'local'
        },
        focus: 'general',
        expectedValues: {
          user: { id: 1, name: 'John' }
        }
      };

      const result = await tool.execute(params);

      expect(mockAnalysisService.analyzeContext).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test.php',
          line: 25,
          function: 'processUser',
          variables: params.variables
        }),
        expect.objectContaining({
          type: 'variableAnalysis',
          focus: 'general',
          expectedValues: params.expectedValues
        })
      );

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysis.insights).toBeDefined();
      expect(data.analysis.confidence).toBe('high');
      expect(data.metadata.variableCount).toBe(3);
    });

    test('should analyze null values when focus is nulls', async () => {
      const mockAnalysisResult = {
        insights: ['General insights'],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: {
          user: null,
          data: undefined,
          status: 'active'
        },
        focus: 'nulls'
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysis.insights).toContain('Found 2 null/undefined variables: user, data');
    });

    test('should analyze types when focus is types', async () => {
      const mockAnalysisResult = {
        insights: [],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: {
          name: 'John',
          age: 25,
          active: true
        },
        focus: 'types',
        expectedValues: {
          age: '25' // Expected string but got number
        }
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysis.insights).toContain('Type mismatch for age: expected string, got number');
      expect(data.analysis.insights).toContain('Variable types: string(1), number(1), boolean(1)');
    });

    test('should analyze values when focus is values', async () => {
      const mockAnalysisResult = {
        insights: [],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: {
          status: 'inactive',
          count: 10
        },
        focus: 'values',
        expectedValues: {
          status: 'active',
          count: 5,
          missing: 'should be here'
        }
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysis.insights).toContain('Value mismatch for status: expected "active", got "inactive"');
      expect(data.analysis.insights).toContain('Value mismatch for count: expected 5, got 10');
      expect(data.analysis.insights).toContain('Expected variable missing is missing');
    });

    test('should analyze performance when focus is performance', async () => {
      const mockAnalysisResult = {
        insights: [],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const largeArray = new Array(2000).fill('item');
      const largeString = 'x'.repeat(15000);

      const params = {
        variables: {
          bigArray: largeArray,
          bigString: largeString,
          normal: 'ok'
        },
        focus: 'performance'
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysis.insights).toContain('Large array bigArray (2000 items) may impact performance');
      expect(data.analysis.insights).toContain('Large string bigString (15000 chars) may impact memory usage');
    });

    test('should analyze security when focus is security', async () => {
      const mockAnalysisResult = {
        insights: [],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: {
          password: 'secret123',
          apiToken: 'abc123def',
          username: 'john',
          emptyKey: ''
        },
        focus: 'security'
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysis.insights).toContain('Potentially sensitive data in password - ensure proper handling');
      expect(data.analysis.insights).toContain('Potentially sensitive data in apiToken - ensure proper handling');
      // emptyKey should not trigger warning as it's empty
    });

    test('should identify common variable issues', async () => {
      const mockAnalysisResult = {
        insights: [],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: {
          nullVar: null,
          undefinedVar: undefined,
          infiniteVar: Infinity,
          emptyArray: [],
          validVar: 'ok'
        },
        focus: 'general'
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysis.issues).toContain('Null/undefined value: nullVar');
      expect(data.analysis.issues).toContain('Null/undefined value: undefinedVar');
      expect(data.analysis.issues).toContain('Invalid number: infiniteVar = Infinity');
      expect(data.analysis.issues).toContain('Empty array: emptyArray');
    });

    test('should format variables for response', async () => {
      const mockAnalysisResult = {
        insights: [],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: {
          str: 'hello',
          num: 42,
          arr: [1, 2, 3],
          obj: { a: 1, b: 2 },
          nullVar: null
        }
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      
      expect(data.variables.str).toEqual({
        value: 'hello',
        type: 'string',
        isNull: false,
        isEmpty: false,
        size: 5
      });

      expect(data.variables.arr).toEqual({
        value: [1, 2, 3],
        type: 'object',
        isNull: false,
        isEmpty: false,
        size: 3
      });

      expect(data.variables.nullVar).toEqual({
        value: null,
        type: 'object',
        isNull: true,
        isEmpty: true,
        size: 0
      });
    });

    test('should handle analysis errors gracefully', async () => {
      mockAnalysisService.analyzeContext.mockRejectedValue(
        new Error('Analysis service error')
      );

      const params = {
        variables: { test: 'value' }
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to perform variable analysis');
    });

    test('should use default values when context is minimal', async () => {
      const mockAnalysisResult = {
        insights: ['Basic analysis'],
        confidence: 'low'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        variables: { simple: 'test' }
      };

      const result = await tool.execute(params);

      expect(mockAnalysisService.analyzeContext).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'Unknown file',
          line: 0,
          function: 'Unknown function'
        }),
        expect.objectContaining({
          type: 'variableAnalysis',
          focus: 'general',
          expectedValues: {}
        })
      );

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.metadata.focusArea).toBe('general');
      expect(data.analysis.focus).toBe('general');
    });
  });
});