/**
 * MCPResourceRegistry Unit Tests
 */

// Mock logger to avoid console output during tests
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('../../../../src/utils/Logger', () => ({
  logger: mockLogger
}));

const MCPResourceRegistry = require('../../../../src/mcp/resources/index');
const BaseMCPResource = require('../../../../src/mcp/resources/BaseMCPResource');

// Test resource implementation
class TestResource extends BaseMCPResource {
  constructor(uri = 'test://resource', name = 'Test Resource') {
    super(uri, name, 'A test resource');
    this.enableSubscriptions();
    this.setCacheable(1000);
  }

  async read(options = {}) {
    return {
      data: 'test data',
      timestamp: Date.now(),
      ...options
    };
  }
}

describe('MCPResourceRegistry', () => {
  let registry;
  let testResource;

  beforeEach(() => {
    registry = new MCPResourceRegistry();
    testResource = new TestResource();
    jest.clearAllMocks();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    if (registry && registry.removeAllListeners) {
      registry.removeAllListeners();
    }
    if (testResource && testResource.removeAllListeners) {
      testResource.removeAllListeners();
    }
  });

  describe('Constructor', () => {
    it('should initialize with empty state', () => {
      expect(registry.resources).toBeInstanceOf(Map);
      expect(registry.resources.size).toBe(0);
      expect(registry.subscriptions).toBeInstanceOf(Map);
      expect(registry.subscriptions.size).toBe(0);
      expect(registry.resourcesCache).toBeInstanceOf(Map);
      expect(registry.resourcesCache.size).toBe(0);
    });

    it('should have EventEmitter functionality', () => {
      expect(registry.on).toBeDefined();
      expect(registry.emit).toBeDefined();
      expect(registry.removeAllListeners).toBeDefined();
    });
  });

  describe('register', () => {
    it('should register a new resource', () => {
      registry.register(testResource.uri, testResource);
      
      expect(registry.resources.has(testResource.uri)).toBe(true);
      expect(registry.resources.get(testResource.uri)).toBe(testResource);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Registered MCP resource: ${testResource.uri}`,
        { type: testResource.constructor.name }
      );
    });

    it('should setup resource event handling', async () => {
      const eventSpy = jest.fn();
      registry.on('resource:updated', eventSpy);
      
      registry.register(testResource.uri, testResource);
      
      // Create a subscription to enable event emission
      registry.subscribe(testResource.uri, 'test-client', {});
      
      // Trigger update on resource
      testResource.notifyUpdate({ test: 'data' });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(eventSpy).toHaveBeenCalledWith({
        uri: testResource.uri,
        data: expect.objectContaining({
          uri: testResource.uri,
          timestamp: expect.any(Number),
          updateCount: 1,
          test: 'data'
        }),
        subscriptions: expect.arrayContaining([
          expect.objectContaining({
            uri: testResource.uri,
            subscriptionId: 'test-client'
          })
        ])
      });
    });

    it('should throw error for duplicate URI', () => {
      registry.register(testResource.uri, testResource);
      
      expect(() => {
        registry.register(testResource.uri, new TestResource());
      }).toThrow(`Resource with URI '${testResource.uri}' already registered`);
    });

    it('should throw error for invalid resource', () => {
      expect(() => {
        registry.register('test://invalid', null);
      }).toThrow('Cannot read properties of null (reading \'read\'');

      expect(() => {
        registry.register('test://invalid', {});
      }).toThrow('Resource \'test://invalid\' must implement read() method');
    });
  });

  describe('unregister', () => {
    beforeEach(() => {
      registry.register(testResource.uri, testResource);
    });

    it('should unregister existing resource', () => {
      expect(registry.resources.has(testResource.uri)).toBe(true);
      
      registry.unregister(testResource.uri);
      
      expect(registry.resources.has(testResource.uri)).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Unregistered MCP resource: ${testResource.uri}`
      );
    });

    it('should remove resource subscriptions', () => {
      registry.subscribe(testResource.uri, 'client1');
      const subscriptionKey = 'client1:' + testResource.uri;
      expect(registry.subscriptions.has(subscriptionKey)).toBe(true);
      
      registry.unregister(testResource.uri);
      
      expect(registry.subscriptions.has(subscriptionKey)).toBe(false);
    });

    it('should clear resource cache', () => {
      // Add to cache
      registry.resourcesCache.set(testResource.uri, {
        data: 'cached',
        timestamp: Date.now()
      });
      expect(registry.resourcesCache.has(testResource.uri)).toBe(true);
      
      registry.unregister(testResource.uri);
      
      expect(registry.resourcesCache.has(testResource.uri)).toBe(false);
    });

    it('should handle unregistering non-existent resource', () => {
      expect(() => {
        registry.unregister('non://existent');
      }).not.toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Attempted to unregister unknown resource: non://existent'
      );
    });
  });

  describe('readResource', () => {
    beforeEach(() => {
      registry.register(testResource.uri, testResource);
    });

    it('should read resource data', async () => {
      const result = await registry.readResource(testResource.uri, { filter: 'test' });
      
      expect(result).toEqual({
        data: 'test data',
        timestamp: expect.any(Number),
        filter: 'test'
      });
    });

    it('should throw error for non-existent resource', async () => {
      await expect(
        registry.readResource('non://existent')
      ).rejects.toThrow('Resource not found: non://existent');
    });

    it('should use cache for cacheable resources', async () => {
      const readSpy = jest.spyOn(testResource, 'read');
      
      // First read - should call resource.read() and cache result
      const result1 = await registry.readResource(testResource.uri);
      expect(readSpy).toHaveBeenCalledTimes(1);
      
      // Second read within cache TTL - should use cache
      const result2 = await registry.readResource(testResource.uri, { useCache: true });
      expect(readSpy).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(result1).toEqual(result2);
      
      readSpy.mockRestore();
    });

    it('should bypass cache when expired', async () => {
      // Create resource with very short cache TTL
      const shortCacheResource = new TestResource('test://short-cache', 'Short Cache');
      shortCacheResource.setCacheable(1); // 1ms TTL
      registry.register(shortCacheResource.uri, shortCacheResource);
      
      const readSpy = jest.spyOn(shortCacheResource, 'read');
      
      // First read
      await registry.readResource(shortCacheResource.uri);
      expect(readSpy).toHaveBeenCalledTimes(1);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Second read - cache expired, should call read again
      await registry.readResource(shortCacheResource.uri);
      expect(readSpy).toHaveBeenCalledTimes(2);
      
      readSpy.mockRestore();
    });
  });

  describe('subscribe', () => {
    beforeEach(() => {
      registry.register(testResource.uri, testResource);
    });

    it('should subscribe client to resource updates', () => {
      registry.subscribe(testResource.uri, 'client1');
      
      const subscriptionKey = 'client1:' + testResource.uri;
      expect(registry.subscriptions.has(subscriptionKey)).toBe(true);
      
      const subscription = registry.subscriptions.get(subscriptionKey);
      expect(subscription.uri).toBe(testResource.uri);
      expect(subscription.subscriptionId).toBe('client1');
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Created resource subscription: ${subscriptionKey}`
      );
    });

    it('should throw error for non-existent resource', () => {
      expect(() => {
        registry.subscribe('non://existent', 'client1');
      }).toThrow('Resource not found for subscription: non://existent');
    });

    it('should throw error for resource without subscription support', () => {
      const noSubResource = new TestResource('test://no-sub', 'No Subscriptions');
      noSubResource.disableSubscriptions();
      registry.register(noSubResource.uri, noSubResource);
      
      expect(() => {
        registry.subscribe(noSubResource.uri, 'client1');
      }).toThrow(`Resource does not support subscriptions: ${noSubResource.uri}`);
    });

    it('should handle duplicate subscriptions gracefully', () => {
      registry.subscribe(testResource.uri, 'client1');
      registry.subscribe(testResource.uri, 'client1'); // Duplicate
      
      // Should log warning about existing subscription
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Subscription already exists: client1:' + testResource.uri
      );
    });
  });

  describe('unsubscribe', () => {
    beforeEach(() => {
      registry.register(testResource.uri, testResource);
      registry.subscribe(testResource.uri, 'client1');
      registry.subscribe(testResource.uri, 'client2');
    });

    it('should unsubscribe client from resource', () => {
      registry.unsubscribe('client1', testResource.uri);
      
      const subscriptionKey1 = 'client1:' + testResource.uri;
      const subscriptionKey2 = 'client2:' + testResource.uri;
      expect(registry.subscriptions.has(subscriptionKey1)).toBe(false);
      expect(registry.subscriptions.has(subscriptionKey2)).toBe(true);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Removed subscription: ${subscriptionKey1}`
      );
    });

    it('should handle unsubscribing non-existent client', () => {
      expect(() => {
        registry.unsubscribe('non-existent', testResource.uri);
      }).not.toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `No subscriptions found for: non-existent:${testResource.uri}`
      );
    });

    it('should handle unsubscribing from non-existent resource', () => {
      expect(() => {
        registry.unsubscribe('client1', 'non://existent');
      }).not.toThrow();
    });
  });

  describe('hasResource', () => {
    it('should return true for registered resource', () => {
      registry.register(testResource.uri, testResource);
      expect(registry.resources.has(testResource.uri)).toBe(true);
    });

    it('should return false for non-existent resource', () => {
      expect(registry.resources.has('non://existent')).toBe(false);
    });
  });

  describe('getResource', () => {
    it('should return registered resource', () => {
      registry.register(testResource.uri, testResource);
      expect(registry.getResource(testResource.uri)).toBe(testResource);
    });

    it('should return null for non-existent resource', () => {
      expect(registry.getResource('non://existent')).toBeNull();
    });
  });

  describe('listResources', () => {
    it('should return empty array when no resources', () => {
      const resources = registry.listResources();
      expect(resources).toEqual([]);
    });

    it('should return list of registered resource URIs', () => {
      const resource2 = new TestResource('test://resource2', 'Resource 2');
      
      registry.register(testResource.uri, testResource);
      registry.register(resource2.uri, resource2);
      
      const resources = registry.listResources();
      expect(resources).toHaveLength(2);
      expect(resources).toContain(testResource.uri);
      expect(resources).toContain(resource2.uri);
    });
  });

  describe('getStats', () => {
    it('should return registry statistics', () => {
      registry.register(testResource.uri, testResource);
      registry.subscribe(testResource.uri, 'client1');
      
      const stats = registry.getStats();
      
      expect(stats).toEqual({
        totalResources: 1,
        totalSubscriptions: 1,
        cachedResources: 0,
        updateQueueSize: 0,
        isProcessingUpdates: false
      });
    });

    it('should reflect cache status', async () => {
      registry.register(testResource.uri, testResource);
      
      // Read to populate cache
      await registry.readResource(testResource.uri);
      
      const stats = registry.getStats();
      expect(stats.cachedResources).toBe(1);
    });
  });
});