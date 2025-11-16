/**
 * MCPResourceRegistry Simple Functional Tests
 */

const MCPResourceRegistry = require('../../../src/mcp/resources/index');
const BaseMCPResource = require('../../../src/mcp/resources/BaseMCPResource');

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

describe('MCPResourceRegistry Core Functionality', () => {
  let registry;
  let testResource;

  beforeEach(() => {
    registry = new MCPResourceRegistry();
    testResource = new TestResource();
  });

  afterEach(() => {
    if (registry && registry.removeAllListeners) {
      registry.removeAllListeners();
    }
    if (testResource && testResource.removeAllListeners) {
      testResource.removeAllListeners();
    }
  });

  describe('Basic Operations', () => {
    it('should register and retrieve resources', () => {
      expect(registry.resources.size).toBe(0);
      
      registry.register(testResource.uri, testResource);
      
      expect(registry.resources.size).toBe(1);
      expect(registry.resources.has(testResource.uri)).toBe(true);
      expect(registry.getResource(testResource.uri)).toBe(testResource);
    });

    it('should unregister resources', () => {
      registry.register(testResource.uri, testResource);
      expect(registry.resources.has(testResource.uri)).toBe(true);
      
      registry.unregister(testResource.uri);
      
      expect(registry.resources.has(testResource.uri)).toBe(false);
      expect(registry.getResource(testResource.uri)).toBeNull();
    });

    it('should list resource URIs', () => {
      expect(registry.listResources()).toEqual([]);
      
      registry.register(testResource.uri, testResource);
      const resource2 = new TestResource('test://resource2', 'Resource 2');
      registry.register(resource2.uri, resource2);
      
      const uris = registry.listResources();
      expect(uris).toHaveLength(2);
      expect(uris).toContain(testResource.uri);
      expect(uris).toContain(resource2.uri);
    });
  });

  describe('Resource Reading', () => {
    beforeEach(() => {
      registry.register(testResource.uri, testResource);
    });

    it('should read resource data', async () => {
      const result = await registry.readResource(testResource.uri, { test: 'param' });
      
      expect(result).toEqual({
        data: 'test data',
        timestamp: expect.any(Number),
        test: 'param'
      });
    });

    it('should throw error for non-existent resource', async () => {
      await expect(
        registry.readResource('non://existent')
      ).rejects.toThrow('Resource not found: non://existent');
    });

    it('should cache results when requested', async () => {
      const readSpy = jest.spyOn(testResource, 'read');
      
      // First read
      const result1 = await registry.readResource(testResource.uri);
      expect(readSpy).toHaveBeenCalledTimes(1);
      
      // Second read with cache - should use cache
      const result2 = await registry.readResource(testResource.uri, { useCache: true });
      expect(readSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(result1).toEqual(result2);
      
      readSpy.mockRestore();
    });
  });

  describe('Subscriptions', () => {
    beforeEach(() => {
      registry.register(testResource.uri, testResource);
    });

    it('should manage subscriptions', () => {
      expect(registry.subscriptions.size).toBe(0);
      
      registry.subscribe(testResource.uri, 'client1');
      
      expect(registry.subscriptions.size).toBe(1);
      expect(registry.subscriptions.has('client1:' + testResource.uri)).toBe(true);
      
      const subscriptions = registry.getResourceSubscriptions(testResource.uri);
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].subscriptionId).toBe('client1');
    });

    it('should remove subscriptions', () => {
      registry.subscribe(testResource.uri, 'client1');
      expect(registry.subscriptions.size).toBe(1);
      
      registry.unsubscribe('client1', testResource.uri);
      
      expect(registry.subscriptions.size).toBe(0);
    });

    it('should handle resource updates', (done) => {
      const eventSpy = jest.fn((data) => {
        expect(data.uri).toBe(testResource.uri);
        expect(data.data).toEqual(expect.objectContaining({
          uri: testResource.uri,
          timestamp: expect.any(Number),
          updateCount: 1,
          test: 'update'
        }));
        done();
      });
      
      registry.on('resource:updated', eventSpy);
      registry.subscribe(testResource.uri, 'client1'); // Need subscription for update notification
      
      // Trigger update
      testResource.notifyUpdate({ test: 'update' });
    });
  });

  describe('Validation', () => {
    it('should reject duplicate registrations', () => {
      registry.register(testResource.uri, testResource);
      
      expect(() => {
        registry.register(testResource.uri, new TestResource());
      }).toThrow(`Resource with URI '${testResource.uri}' already registered`);
    });

    it('should reject invalid resources', () => {
      expect(() => {
        registry.register('test://invalid', null);
      }).toThrow();

      expect(() => {
        registry.register('test://invalid', {});
      }).toThrow();
    });

    it('should reject subscriptions to non-existent resources', () => {
      expect(() => {
        registry.subscribe('non://existent', 'client1');
      }).toThrow('Resource not found for subscription: non://existent');
    });

    it('should reject subscriptions to resources without subscription support', () => {
      const noSubResource = new TestResource('test://no-sub', 'No Subscriptions');
      noSubResource.disableSubscriptions();
      registry.register(noSubResource.uri, noSubResource);
      
      expect(() => {
        registry.subscribe(noSubResource.uri, 'client1');
      }).toThrow(`Resource does not support subscriptions: ${noSubResource.uri}`);
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', async () => {
      const stats1 = registry.getStats();
      expect(stats1).toEqual({
        totalResources: 0,
        totalSubscriptions: 0,
        cachedResources: 0,
        updateQueueSize: 0,
        isProcessingUpdates: false
      });

      registry.register(testResource.uri, testResource);
      registry.subscribe(testResource.uri, 'client1');
      await registry.readResource(testResource.uri); // This should cache

      const stats2 = registry.getStats();
      expect(stats2.totalResources).toBe(1);
      expect(stats2.totalSubscriptions).toBe(1);
      expect(stats2.cachedResources).toBe(1);
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      registry.register(testResource.uri, testResource);
    });

    it('should clear cache', async () => {
      // Populate cache
      await registry.readResource(testResource.uri);
      expect(registry.getStats().cachedResources).toBe(1);
      
      registry.clearCache();
      
      expect(registry.getStats().cachedResources).toBe(0);
    });

    it('should remove cache when resource is unregistered', async () => {
      await registry.readResource(testResource.uri);
      expect(registry.getStats().cachedResources).toBe(1);
      
      registry.unregister(testResource.uri);
      
      expect(registry.getStats().cachedResources).toBe(0);
    });
  });
});