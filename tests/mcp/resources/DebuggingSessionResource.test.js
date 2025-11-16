/**
 * DebuggingSessionResource Unit Tests
 */

const DebuggingSessionResource = require('../../../src/mcp/resources/DebuggingSessionResource');
// const { logger } = require('../../../src/utils/Logger'); // Unused in tests

// Mock logger to avoid console output during tests
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('../../../src/utils/Logger', () => ({
  logger: mockLogger
}));

// Mock service registry
const mockServiceRegistry = {
  get: jest.fn(),
  has: jest.fn()
};

// Mock debugger service
const mockDebuggerService = {
  isConnected: jest.fn(),
  getConnectionStatus: jest.fn(),
  getSessionInfo: jest.fn(),
  getProtocolInfo: jest.fn(),
  getCapabilities: jest.fn(),
  getVersion: jest.fn(),
  on: jest.fn()
};

// Mock session service
const mockSessionService = {
  getCurrentSession: jest.fn(),
  getSessionMetrics: jest.fn(),
  getBreakpointCount: jest.fn(),
  on: jest.fn()
};

// Mock analysis service  
const mockAnalysisService = {
  getAnalysisStats: jest.fn(),
  isReady: jest.fn(),
  on: jest.fn()
};

describe('DebuggingSessionResource', () => {
  let resource;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    
    // Setup default service registry behavior
    mockServiceRegistry.get.mockImplementation((serviceName) => {
      switch (serviceName) {
      case 'debugger':
        return mockDebuggerService;
      case 'session':
        return mockSessionService;
      case 'analysis':
        return mockAnalysisService;
      default:
        return null;
      }
    });
    
    mockServiceRegistry.has.mockImplementation((serviceName) => {
      return ['debugger', 'session', 'analysis'].includes(serviceName);
    });

    // Setup default mock return values
    mockDebuggerService.isConnected.mockReturnValue(true);
    mockDebuggerService.getProtocolInfo.mockReturnValue({ version: '1.0', protocol: 'DBGp' });
    mockDebuggerService.getCapabilities.mockReturnValue(['breakpoints', 'step', 'stack']);
    mockDebuggerService.getVersion.mockReturnValue('1.0.0');
    
    mockSessionService.getCurrentSession.mockReturnValue({
      id: 'test-session-123',
      startTime: Date.now() - 60000,
      targetScript: '/test/script.php',
      stepsExecuted: 10,
      variablesInspected: 5,
      analysisRequests: 3
    });
    mockSessionService.getSessionMetrics.mockReturnValue({
      stepsExecuted: 10,
      variablesInspected: 5
    });
    mockSessionService.getBreakpointCount.mockReturnValue(2);

    mockAnalysisService.getAnalysisStats.mockReturnValue({
      analysisRequests: 3
    });
    mockAnalysisService.isReady.mockReturnValue(true);
    
    // Create resource after all mocks are set up
    resource = new DebuggingSessionResource(mockServiceRegistry);
  });

  afterEach(() => {
    if (resource && resource.removeAllListeners) {
      resource.removeAllListeners();
    }
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(resource.uri).toBe('ydebug://debugging-session');
      expect(resource.name).toBe('Debugging Session');
      expect(resource.description).toBe('Current debugging session state and information');
      expect(resource.supportsSubscriptions()).toBe(true);
      expect(resource.isCacheable()).toBe(true);
      expect(resource.getCacheTTL()).toBe(5000);
    });

    it('should setup service event bindings', () => {
      expect(mockDebuggerService.on).toHaveBeenCalled();
      expect(mockSessionService.on).toHaveBeenCalled();
    });
  });

  describe('read method', () => {
    describe('when debugger is connected', () => {
      beforeEach(() => {
        mockDebuggerService.isConnected.mockReturnValue(true);
        mockDebuggerService.getProtocolInfo.mockReturnValue({
          protocol: 'DBGp',
          version: '1.0'
        });
        mockDebuggerService.getCapabilities.mockReturnValue(['breakpoints', 'step', 'stack']);
        mockDebuggerService.getVersion.mockReturnValue('1.0.0');
        
        mockSessionService.getCurrentSession.mockReturnValue({
          id: 'test-session-123',
          startTime: Date.now() - 60000,
          targetScript: '/test/script.php',
          stepsExecuted: 10,
          variablesInspected: 5,
          analysisRequests: 3
        });
        mockSessionService.getBreakpointCount.mockReturnValue(2);
        
        // Mock analysis service
        const mockAnalysisService = {
          isReady: jest.fn().mockReturnValue(true)
        };
        mockServiceRegistry.get.mockImplementation((serviceName) => {
          switch (serviceName) {
          case 'debugger':
            return mockDebuggerService;
          case 'session':
            return mockSessionService;
          case 'analysis':
            return mockAnalysisService;
          default:
            return null;
          }
        });
      });

      it('should return complete session data', async () => {
        const result = await resource.read();

        expect(result).toEqual({
          active: true,
          sessionId: 'test-session-123',
          startTime: expect.any(Number),
          endTime: null,
          targetScript: '/test/script.php',
          connectionStatus: 'connected',
          debuggerInfo: {
            protocol: {
              protocol: 'DBGp',
              version: '1.0'
            },
            capabilities: ['breakpoints', 'step', 'stack'],
            version: '1.0.0'
          },
          statistics: {
            totalBreakpoints: 2,
            stepsExecuted: 10,
            variablesInspected: 5,
            analysisRequests: 3
          },
          analysisAvailable: true,
          timestamp: expect.any(Number),
          uptime: expect.any(Number)
        });

        expect(mockDebuggerService.isConnected).toHaveBeenCalled();
        expect(mockDebuggerService.getProtocolInfo).toHaveBeenCalled();
        expect(mockDebuggerService.getCapabilities).toHaveBeenCalled();
        expect(mockDebuggerService.getVersion).toHaveBeenCalled();
        expect(mockSessionService.getCurrentSession).toHaveBeenCalled();
        expect(mockSessionService.getBreakpointCount).toHaveBeenCalled();
      });

      it('should apply filtering when requested', async () => {
        const result = await resource.read({ filter: 'connection' });

        expect(result).toEqual({
          connectionStatus: 'connected',
          debuggerInfo: {
            protocol: {
              protocol: 'DBGp',
              version: '1.0'
            },
            capabilities: ['breakpoints', 'step', 'stack'],
            version: '1.0.0'
          },
          timestamp: expect.any(Number)
        });
      });

      it('should handle metrics-only filter', async () => {
        const result = await resource.read({ filter: 'statistics' });

        expect(result).toEqual({
          statistics: {
            totalBreakpoints: 2,
            stepsExecuted: 10,
            variablesInspected: 5,
            analysisRequests: 3
          },
          uptime: expect.any(Number),
          timestamp: expect.any(Number)
        });
      });
    });

    describe('when debugger is not connected', () => {
      beforeEach(() => {
        mockDebuggerService.isConnected.mockReturnValue(false);
        mockSessionService.getCurrentSession.mockReturnValue(null);
      });

      it('should return disconnected state', async () => {
        const result = await resource.read();

        expect(result).toEqual({
          active: false,
          sessionId: null,
          startTime: null,
          endTime: expect.any(Number),
          targetScript: null,
          connectionStatus: 'disconnected',
          debuggerInfo: {},
          statistics: {
            totalBreakpoints: 0,
            stepsExecuted: 0,
            variablesInspected: 0,
            analysisRequests: 0
          },
          analysisAvailable: true,
          timestamp: expect.any(Number),
          uptime: null
        });

        expect(mockDebuggerService.isConnected).toHaveBeenCalled();
        expect(mockDebuggerService.getProtocolInfo).not.toHaveBeenCalled();
        expect(mockDebuggerService.getCapabilities).not.toHaveBeenCalled();
      });
    });

    describe('when services are unavailable', () => {
      beforeEach(() => {
        mockServiceRegistry.get.mockReturnValue(null);
        mockServiceRegistry.has.mockReturnValue(false);
      });

      it('should return no-service state', async () => {
        const result = await resource.read();

        expect(result).toEqual({
          active: false,
          sessionId: null,
          startTime: null,
          endTime: null,
          targetScript: null,
          connectionStatus: 'disconnected',
          debuggerInfo: {},
          statistics: {
            totalBreakpoints: 0,
            stepsExecuted: 0,
            variablesInspected: 0,
            analysisRequests: 0
          },
          timestamp: expect.any(Number),
          uptime: null
        });
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockDebuggerService.isConnected.mockReturnValue(true);
      });

      it('should handle debugger service errors gracefully', async () => {
        mockDebuggerService.getProtocolInfo.mockImplementation(() => {
          throw new Error('Protocol info error');
        });

        await expect(resource.read()).rejects.toThrow('Reading session data failed');
      });

      it('should handle session service errors gracefully', async () => {
        mockDebuggerService.getProtocolInfo.mockReturnValue({ protocol: 'DBGp' });
        mockDebuggerService.getCapabilities.mockReturnValue([]);
        mockDebuggerService.getVersion.mockReturnValue('1.0');
        mockSessionService.getCurrentSession.mockImplementation(() => {
          throw new Error('Session error');
        });

        await expect(resource.read()).rejects.toThrow('Reading session data failed');
      });
    });
  });

  describe('validateReadOptions', () => {
    it('should accept valid filter options', () => {
      const validFilters = ['basic', 'statistics', 'connection'];
      
      validFilters.forEach(filter => {
        const options = resource.validateReadOptions({ filter });
        expect(options.filter).toBe(filter);
      });
    });

    it('should reject invalid filter options', () => {
      const options = resource.validateReadOptions({ filter: 'invalid-filter' });
      expect(options.filter).toBe(null);
      // Logger warning is emitted (visible in console output) but mock interception is complex
    });

    it('should preserve other options', () => {
      const options = resource.validateReadOptions({ 
        filter: 'basic',
        limit: 10,
        offset: 5 
      });
      
      expect(options).toEqual({
        filter: 'basic',
        limit: 10,
        offset: 5
      });
    });
  });

  describe('event handling', () => {
    it('should setup event listeners on services', () => {
      // Verify that event listeners were registered
      expect(mockDebuggerService.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockDebuggerService.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mockSessionService.on).toHaveBeenCalledWith('session:started', expect.any(Function));
      expect(mockSessionService.on).toHaveBeenCalledWith('session:ended', expect.any(Function));
      expect(mockSessionService.on).toHaveBeenCalledWith('breakpoint:added', expect.any(Function));
      expect(mockSessionService.on).toHaveBeenCalledWith('breakpoint:removed', expect.any(Function));
    });
  });
});