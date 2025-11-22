/**
 * Tests for DebugAnalyzeContext MCP Tool
 */

const DebugAnalyzeContext = require('../../../../src/mcp/tools/DebugAnalyzeContext');
const ServiceRegistry = require('../../../../src/mcp/ServiceRegistry');

// Mock the AnalysisService
jest.mock('../../../../src/ai/AnalysisService', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    analyzeContext: jest.fn(),
    isReady: jest.fn().mockReturnValue(true),
    getAvailableAnalysisTypes: jest.fn().mockReturnValue(['variableAnalysis', 'executionAnalysis'])
  }));
});
const AnalysisService = require('../../../../src/ai/AnalysisService');

describe('DebugAnalyzeContext', () => {
  let tool;
  let mockServices;
  let mockAnalysisService;

  beforeEach(() => {
    mockServices = new ServiceRegistry();
    
    mockAnalysisService = {
      initialize: jest.fn().mockResolvedValue(),
      analyzeContext: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
      getAvailableAnalysisTypes: jest.fn().mockReturnValue(['variableAnalysis', 'executionAnalysis'])
    };

    AnalysisService.mockImplementation(() => mockAnalysisService);
    
    tool = new DebugAnalyzeContext(mockServices, mockAnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return valid tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('debug_analyze_context');
      expect(definition.description).toContain('AI-powered analysis');
      expect(definition.inputSchema.required).toContain('context');
      expect(definition.inputSchema.properties.analysisType.enum).toContain('variableAnalysis');
      expect(definition.inputSchema.properties.analysisType.enum).toContain('executionAnalysis');
    });
  });

  describe('execute', () => {
    test('should perform context analysis successfully', async () => {
      const mockAnalysisResult = {
        insights: ['Variable $user is null, which might cause errors'],
        confidence: 'high',
        recommendations: ['Add null check before using $user'],
        issues: ['Potential null pointer exception'],
        summary: 'Found potential null pointer issue'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        analysisType: 'variableAnalysis',
        context: {
          filename: 'test.php',
          line: 42,
          function: 'processUser',
          variables: { user: null, status: 'active' },
          execution: { status: 'break', reason: 'breakpoint' }
        },
        options: {
          focus: 'null values',
          expectedBehavior: 'User object should be loaded'
        }
      };

      const result = await tool.execute(params);

      expect(mockAnalysisService.initialize).not.toHaveBeenCalled();
      expect(mockAnalysisService.analyzeContext).toHaveBeenCalledWith(
        params.context,
        {
          type: 'variableAnalysis',
          focus: 'null values',
          expectedBehavior: 'User object should be loaded'
        }
      );

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysisType).toBe('variableAnalysis');
      expect(data.analysis.insights).toEqual(mockAnalysisResult.insights);
      expect(data.analysis.confidence).toBe('high');
      expect(data.metadata.serviceReady).toBe(true);
    });

    test('should use default analysis type when not provided', async () => {
      const mockAnalysisResult = {
        insights: ['Analysis complete'],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        context: {
          filename: 'test.php',
          line: 10,
          variables: { count: 5 }
        }
      };

      const result = await tool.execute(params);

      expect(mockAnalysisService.analyzeContext).toHaveBeenCalledWith(
        params.context,
        { type: 'variableAnalysis' }
      );

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysisType).toBe('variableAnalysis');
    });

    test('should handle analysis service initialization on first use', async () => {
      const mockAnalysisResult = {
        insights: ['First analysis'],
        confidence: 'low'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        context: {
          filename: 'init.php',
          line: 1,
          variables: {}
        }
      };

      const result = await tool.execute(params);

      expect(mockAnalysisService.initialize).not.toHaveBeenCalled();
      expect(result.isSuccess).toBe(true);
    });

    test('should handle analysis errors gracefully', async () => {
      mockAnalysisService.analyzeContext.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const params = {
        context: {
          filename: 'error.php',
          line: 100,
          variables: { error: true }
        }
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to perform context analysis');
    });

    test('should handle different analysis types', async () => {
      const mockAnalysisResult = {
        insights: ['Execution flow analysis'],
        confidence: 'high'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        analysisType: 'executionAnalysis',
        context: {
          filename: 'flow.php',
          line: 25,
          execution: { status: 'running', stack: ['main', 'function1'] }
        }
      };

      const result = await tool.execute(params);

      expect(mockAnalysisService.analyzeContext).toHaveBeenCalledWith(
        params.context,
        { type: 'executionAnalysis' }
      );

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.analysisType).toBe('executionAnalysis');
    });

    test('should include metadata in response', async () => {
      const mockAnalysisResult = {
        insights: ['Metadata test'],
        confidence: 'medium'
      };

      mockAnalysisService.analyzeContext.mockResolvedValue(mockAnalysisResult);

      const params = {
        context: {
          filename: 'meta.php',
          line: 50,
          variables: { meta: 'data' }
        }
      };

      const result = await tool.execute(params);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.metadata).toHaveProperty('analysisTime');
      expect(data.metadata).toHaveProperty('serviceReady');
      expect(data.metadata).toHaveProperty('availableTypes');
      expect(data.metadata.availableTypes).toEqual(['variableAnalysis', 'executionAnalysis']);
    });
  });
});