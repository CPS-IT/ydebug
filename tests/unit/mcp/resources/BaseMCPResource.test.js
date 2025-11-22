/**
 * BaseMCPResource Unit Tests
 */

const BaseMCPResource = require('../../../../src/mcp/resources/BaseMCPResource');
const { logger } = require('../../../../src/utils/Logger');

// Mock logger to avoid console output during tests
jest.mock('../../../../src/utils/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Concrete implementation for testing abstract base class
class TestResource extends BaseMCPResource {
  constructor() {
    super('test://resource', 'Test Resource', 'A test resource for unit testing');
  }

  async read(options = {}) {
    return {
      testData: 'example data',
      timestamp: Date.now(),
      options: options
    };
  }
}

describe('BaseMCPResource', () => {
  let resource;

  beforeEach(() => {
    resource = new TestResource();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (resource && resource.removeAllListeners) {
      resource.removeAllListeners();
    }
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(resource.uri).toBe('test://resource');
      expect(resource.name).toBe('Test Resource');
      expect(resource.description).toBe('A test resource for unit testing');
      expect(resource.cacheable).toBe(false);
      expect(resource.subscriptionsSupported).toBe(false);
      expect(resource.logger).toBe(logger);
    });

    it('should have EventEmitter functionality', () => {
      expect(resource.on).toBeDefined();
      expect(resource.emit).toBeDefined();
      expect(resource.removeAllListeners).toBeDefined();
    });
  });

  describe('getMetadata', () => {
    it('should return correct metadata object', () => {
      const metadata = resource.getMetadata();
      
      expect(metadata).toEqual({
        uri: 'test://resource',
        name: 'Test Resource',
        description: 'A test resource for unit testing',
        mimeType: 'application/json',
        lastUpdated: expect.any(Number),
        updateCount: 0,
        cacheable: false,
        cacheTTL: 0,
        supportsSubscriptions: false
      });
    });

    it('should reflect changes after enabling features', () => {
      resource.enableSubscriptions();
      resource.setCacheable(1000);

      const metadata = resource.getMetadata();
      
      expect(metadata.cacheable).toBe(true);
      expect(metadata.supportsSubscriptions).toBe(true);
      expect(metadata.cacheTTL).toBe(1000);
    });
  });

  describe('enableSubscriptions', () => {
    it('should enable subscriptions', () => {
      expect(resource.subscriptionsSupported).toBe(false);
      
      resource.enableSubscriptions();
      
      expect(resource.subscriptionsSupported).toBe(true);
    });
  });

  describe('supportsSubscriptions', () => {
    it('should return false by default', () => {
      expect(resource.supportsSubscriptions()).toBe(false);
    });

    it('should return true after enabling subscriptions', () => {
      resource.enableSubscriptions();
      expect(resource.supportsSubscriptions()).toBe(true);
    });
  });

  describe('setCacheable', () => {
    it('should set cacheable with TTL', () => {
      expect(resource.cacheable).toBe(false);
      
      resource.setCacheable(5000);
      
      expect(resource.cacheable).toBe(true);
      expect(resource.cacheTTL).toBe(5000);
    });

    it('should handle zero TTL', () => {
      resource.setCacheable(0);
      
      expect(resource.cacheable).toBe(true);
      expect(resource.cacheTTL).toBe(0);
    });
  });

  describe('isCacheable', () => {
    it('should return false by default', () => {
      expect(resource.isCacheable()).toBe(false);
    });

    it('should return true after setting cacheable', () => {
      resource.setCacheable(1000);
      expect(resource.isCacheable()).toBe(true);
    });
  });

  describe('getCacheTTL', () => {
    it('should return 0 by default', () => {
      expect(resource.getCacheTTL()).toBe(0);
    });

    it('should return set TTL value', () => {
      resource.setCacheable(3000);
      expect(resource.getCacheTTL()).toBe(3000);
    });
  });

  describe('notifyUpdate', () => {
    it('should emit update event with data', () => {
      const updateData = { test: 'update' };
      const eventSpy = jest.fn();
      
      resource.on('update', eventSpy);
      resource.notifyUpdate(updateData);
      
      expect(eventSpy).toHaveBeenCalledWith({
        uri: 'test://resource',
        timestamp: expect.any(Number),
        updateCount: 1,
        test: 'update'
      });
    });

    it('should emit update event without data', () => {
      const eventSpy = jest.fn();
      
      resource.on('update', eventSpy);
      resource.notifyUpdate();
      
      expect(eventSpy).toHaveBeenCalledWith({
        uri: 'test://resource',
        timestamp: expect.any(Number),
        updateCount: 1
      });
    });
  });

  describe('validateReadOptions', () => {
    it('should validate and return default options', () => {
      const options = resource.validateReadOptions({});
      
      expect(options).toEqual({
        limit: null,
        offset: 0,
        filter: null
      });
    });

    it('should validate and return provided options', () => {
      const inputOptions = {
        filter: 'test-filter',
        limit: 10,
        offset: 5
      };
      
      const options = resource.validateReadOptions(inputOptions);
      
      expect(options).toEqual(inputOptions);
    });

    it('should merge with defaults', () => {
      const options = resource.validateReadOptions({ limit: 20 });
      
      expect(options).toEqual({
        limit: 20,
        offset: 0,
        filter: null
      });
    });
  });

  describe('applyPagination', () => {
    const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should apply limit only', () => {
      const result = resource.applyPagination(testArray, { limit: 5 });
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should apply offset only', () => {
      const result = resource.applyPagination(testArray, { offset: 3 });
      expect(result).toEqual([4, 5, 6, 7, 8, 9, 10]);
    });

    it('should apply both limit and offset', () => {
      const result = resource.applyPagination(testArray, { limit: 3, offset: 2 });
      expect(result).toEqual([3, 4, 5]);
    });

    it('should handle offset beyond array length', () => {
      const result = resource.applyPagination(testArray, { offset: 15 });
      expect(result).toEqual([]);
    });

    it('should handle limit exceeding remaining items', () => {
      const result = resource.applyPagination(testArray, { limit: 20, offset: 8 });
      expect(result).toEqual([9, 10]);
    });

    it('should return original array when no pagination options', () => {
      const result = resource.applyPagination(testArray, {});
      expect(result).toEqual(testArray);
    });
  });

  describe('formatError', () => {
    it('should format error with operation', () => {
      const originalError = new Error('Test error');
      const formattedError = resource.formatError(originalError, 'Test operation');
      
      expect(formattedError).toBeInstanceOf(Error);
      expect(formattedError.message).toBe('Test operation failed for resource test://resource: Test error');
      expect(formattedError.originalError).toBe(originalError);
      expect(formattedError.resourceUri).toBe('test://resource');
      expect(formattedError.operation).toBe('Test operation');
    });

    it('should handle missing operation parameter', () => {
      const originalError = new Error('Test error');
      const formattedError = resource.formatError(originalError);
      
      expect(formattedError.message).toBe('undefined failed for resource test://resource: Test error');
    });
  });

  describe('Abstract method implementation', () => {
    it('should be able to call read method', async () => {
      const result = await resource.read({ filter: 'test' });
      
      expect(result).toEqual({
        testData: 'example data',
        timestamp: expect.any(Number),
        options: { filter: 'test' }
      });
    });
  });
});