/**
 * DebugAnalyzeContext MCP Tool
 * Provides AI-powered contextual analysis of debugging sessions
 * 
 * FACADE PATTERN: Wraps existing AnalysisService from Feature 014
 */

const BaseMCPTool = require('./BaseMCPTool');
const AnalysisService = require('../../ai/AnalysisService');

class DebugAnalyzeContext extends BaseMCPTool {
  constructor(services, analysisService = null) {
    super(services);
    this.analysisService = analysisService;
  }

  getDefinition() {
    return {
      name: 'debug_analyze_context',
      description: 'AI-powered analysis of debugging context and runtime state',
      inputSchema: {
        type: 'object',
        properties: {
          analysisType: {
            type: 'string',
            description: 'Type of analysis to perform',
            enum: ['variableAnalysis', 'executionAnalysis'],
            default: 'variableAnalysis'
          },
          context: {
            type: 'object',
            description: 'Debugging context data',
            properties: {
              filename: {
                type: 'string',
                description: 'Current file being debugged'
              },
              line: {
                type: 'integer',
                description: 'Current line number'
              },
              function: {
                type: 'string',
                description: 'Current function/method name'
              },
              variables: {
                type: 'object',
                description: 'Current variable states'
              },
              execution: {
                type: 'object',
                description: 'Execution state information'
              }
            }
          },
          options: {
            type: 'object',
            description: 'Analysis options',
            properties: {
              focus: {
                type: 'string',
                description: 'Specific area to focus analysis on'
              },
              expectedBehavior: {
                type: 'string',
                description: 'Expected behavior description for comparison'
              }
            },
            default: {}
          }
        },
        required: ['context']
      }
    };
  }

  async execute(params) {
    const { 
      analysisType = 'variableAnalysis', 
      context, 
      options = {} 
    } = params;

    try {
      // Initialize AnalysisService if not already done
      if (!this.analysisService) {
        this.analysisService = new AnalysisService();
        await this.analysisService.initialize();
      }

      this.logger.info('Performing AI context analysis', { 
        analysisType, 
        filename: context.filename,
        line: context.line 
      });

      // Use existing AnalysisService - FACADE PATTERN
      const analysisResult = await this.analysisService.analyzeContext(
        context,
        {
          type: analysisType,
          ...options
        }
      );

      this.logger.info('Context analysis completed successfully', { 
        analysisType,
        hasInsights: !!analysisResult.insights,
        confidence: analysisResult.confidence 
      });

      return this.formatResponse({
        analysisType,
        context: {
          filename: context.filename,
          line: context.line,
          function: context.function
        },
        analysis: {
          insights: analysisResult.insights || [],
          confidence: analysisResult.confidence || 'unknown',
          recommendations: analysisResult.recommendations || [],
          issues: analysisResult.issues || [],
          summary: analysisResult.summary || 'No analysis summary available'
        },
        metadata: {
          analysisTime: new Date().toISOString(),
          serviceReady: this.analysisService.isReady(),
          availableTypes: this.analysisService.getAvailableAnalysisTypes()
        }
      });

    } catch (error) {
      this.logger.error('Failed to analyze context', error);
      return this.formatErrorResponse(error, 'Failed to perform context analysis');
    }
  }
}

module.exports = DebugAnalyzeContext;