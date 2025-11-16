/**
 * ServiceRegistry Enhanced Unit Tests
 * Additional edge cases and error scenarios for comprehensive coverage
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const ServiceRegistry = require('../../src/mcp/ServiceRegistry');

// Mock Logger module
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../src/utils/Logger', () => ({ logger: mockLogger }));

describe('ServiceRegistry Enhanced Tests', () => {
  let registry;

  beforeEach(() => {
    registry = new ServiceRegistry();
    registry.logger = mockLogger;
    jest.clearAllMocks();
  });

  describe('Advanced Registration Scenarios', () => {
    test('should handle overwriting services with warning', () => {
      const service1 = { name: 'first' };
      const service2 = { name: 'second' };

      registry.register('duplicate', service1);
      registry.register('duplicate', service2);

      expect(mockLogger.warn).toHaveBeenCalledWith("Service 'duplicate' is already registered, overwriting");
      expect(registry.get('duplicate')).toBe(service2);
    });

    test('should log successful service registrations', () => {
      const service = { name: 'test' };

      registry.register('testService', service);

      expect(mockLogger.debug).toHaveBeenCalledWith("Service 'testService' registered");
    });

    test('should handle registering complex service objects', () => {
      const complexService = {
        name: 'complexService',
        config: {
          host: 'localhost',
          port: 9000,
          options: {
            timeout: 5000,
            retries: 3
          }
        },
        methods: {
          connect: jest.fn(),
          disconnect: jest.fn(),
          send: jest.fn()
        },
        events: new Map(),
        metadata: {
          version: '1.0.0',
          created: new Date(),
          tags: ['debug', 'mcp']
        }
      };

      registry.register('complex', complexService);

      const retrieved = registry.get('complex');
      expect(retrieved).toBe(complexService);
      expect(retrieved.config.options.timeout).toBe(5000);
      expect(typeof retrieved.methods.connect).toBe('function');
    });

    test('should handle registering function services', () => {
      const serviceFunction = jest.fn(() => 'service result');
      serviceFunction.config = { type: 'function' };

      registry.register('functionService', serviceFunction);

      const retrieved = registry.get('functionService');
      expect(retrieved).toBe(serviceFunction);
      expect(retrieved.config.type).toBe('function');
      expect(retrieved()).toBe('service result');
    });

    test('should handle registering class instances', () => {
      class TestService {
        constructor(name) {
          this.name = name;
          this.started = false;
        }

        start() {
          this.started = true;
          return Promise.resolve();
        }

        stop() {
          this.started = false;
          return Promise.resolve();
        }
      }

      const serviceInstance = new TestService('testInstance');
      registry.register('classService', serviceInstance);

      const retrieved = registry.get('classService');
      expect(retrieved).toBeInstanceOf(TestService);
      expect(retrieved.name).toBe('testInstance');
      expect(retrieved.started).toBe(false);
    });

    test('should handle registering primitive services', () => {
      registry.register('stringService', 'test string');
      registry.register('numberService', 42);
      registry.register('booleanService', true);
      registry.register('arrayService', [1, 2, 3]);

      expect(registry.get('stringService')).toBe('test string');
      expect(registry.get('numberService')).toBe(42);
      expect(registry.get('booleanService')).toBe(true);
      expect(registry.get('arrayService')).toEqual([1, 2, 3]);
    });

    test('should handle registering services with Symbol names', () => {
      const symbolName = Symbol('testService');
      const service = { name: 'symbolService' };

      registry.register(symbolName, service);

      expect(registry.has(symbolName)).toBe(true);
      expect(registry.get(symbolName)).toBe(service);
    });

    test('should handle registering services with numeric names', () => {
      const service1 = { name: 'service1' };
      const service2 = { name: 'service2' };

      registry.register(1, service1);
      registry.register(42, service2);

      expect(registry.get(1)).toBe(service1);
      expect(registry.get(42)).toBe(service2);
      expect(registry.has(1)).toBe(true);
      expect(registry.has(42)).toBe(true);
    });
  });

  describe('Advanced Retrieval Scenarios', () => {
    test('should log error when service not found', () => {
      registry.get('nonExistent');

      expect(mockLogger.error).toHaveBeenCalledWith("Service 'nonExistent' not found in registry");
    });

    test('should handle getting undefined services correctly', () => {
      registry.register('undefinedService', undefined);

      // Service exists but value is undefined
      expect(registry.has('undefinedService')).toBe(true);

      // get() returns null for undefined services (implementation behavior)
      const result = registry.get('undefinedService');
      expect(result).toBeNull();

      // But the error should still be logged because service is falsy
      expect(mockLogger.error).toHaveBeenCalledWith("Service 'undefinedService' not found in registry");
    });

    test('should handle getting null services correctly', () => {
      registry.register('nullService', null);

      expect(registry.has('nullService')).toBe(true);

      const result = registry.get('nullService');
      expect(result).toBeNull();

      // Should log error because service is falsy
      expect(mockLogger.error).toHaveBeenCalledWith("Service 'nullService' not found in registry");
    });

    test('should handle getting falsy but valid services', () => {
      registry.register('zeroService', 0);
      registry.register('emptyStringService', '');
      registry.register('falseService', false);

      expect(registry.get('zeroService')).toBeNull();
      expect(registry.get('emptyStringService')).toBeNull();
      expect(registry.get('falseService')).toBeNull();

      // All should log errors because they are falsy
      expect(mockLogger.error).toHaveBeenCalledWith("Service 'zeroService' not found in registry");
      expect(mockLogger.error).toHaveBeenCalledWith("Service 'emptyStringService' not found in registry");
      expect(mockLogger.error).toHaveBeenCalledWith("Service 'falseService' not found in registry");
    });

    test('should handle case-sensitive service names', () => {
      const lowerService = { name: 'lower' };
      const upperService = { name: 'upper' };

      registry.register('testservice', lowerService);
      registry.register('TestService', upperService);
      registry.register('TESTSERVICE', { name: 'caps' });

      expect(registry.get('testservice')).toBe(lowerService);
      expect(registry.get('TestService')).toBe(upperService);
      expect(registry.get('TESTSERVICE').name).toBe('caps');
      expect(registry.getStatus().serviceCount).toBe(3);
    });

    test('should handle special character service names', () => {
      const services = {
        'service-with-dashes': { type: 'dash' },
        'service_with_underscores': { type: 'underscore' },
        'service.with.dots': { type: 'dot' },
        'service/with/slashes': { type: 'slash' },
        'service with spaces': { type: 'space' },
        'service@with#symbols$': { type: 'symbol' }
      };

      Object.entries(services).forEach(([name, service]) => {
        registry.register(name, service);
        expect(registry.get(name)).toBe(service);
      });

      expect(registry.getStatus().serviceCount).toBe(6);
    });
  });

  describe('Advanced Unregistration Scenarios', () => {
    test('should log successful unregistration', () => {
      const service = { name: 'test' };
      registry.register('test', service);

      const result = registry.unregister('test');

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith("Service 'test' unregistered");
    });

    test('should not log when unregistering non-existent service', () => {
      const result = registry.unregister('nonExistent');

      expect(result).toBe(false);
      expect(mockLogger.debug).not.toHaveBeenCalledWith("Service 'nonExistent' unregistered");
    });

    test('should handle unregistering all service types', () => {
      registry.register('object', { name: 'object' });
      registry.register('string', 'string service');
      registry.register('number', 123);
      registry.register('function', () => {});
      registry.register('null', null);
      registry.register('undefined', undefined);

      expect(registry.unregister('object')).toBe(true);
      expect(registry.unregister('string')).toBe(true);
      expect(registry.unregister('number')).toBe(true);
      expect(registry.unregister('function')).toBe(true);
      expect(registry.unregister('null')).toBe(true);
      expect(registry.unregister('undefined')).toBe(true);

      expect(registry.getStatus().serviceCount).toBe(0);
    });

    test('should handle multiple unregistrations of same service', () => {
      registry.register('test', { name: 'test' });

      expect(registry.unregister('test')).toBe(true);
      expect(registry.unregister('test')).toBe(false);
      expect(registry.unregister('test')).toBe(false);
    });
  });

  describe('Clear Registry Functionality', () => {
    test('should clear all services', () => {
      registry.register('service1', { name: 'service1' });
      registry.register('service2', { name: 'service2' });
      registry.register('service3', { name: 'service3' });

      expect(registry.getStatus().serviceCount).toBe(3);

      registry.clear();

      expect(registry.getStatus().serviceCount).toBe(0);
      expect(registry.getServiceNames()).toEqual([]);
      expect(registry.has('service1')).toBe(false);
      expect(registry.has('service2')).toBe(false);
      expect(registry.has('service3')).toBe(false);
    });

    test('should log clear operation', () => {
      registry.register('service1', { name: 'service1' });
      registry.register('service2', { name: 'service2' });

      registry.clear();

      expect(mockLogger.debug).toHaveBeenCalledWith('Cleared 2 services from registry');
    });

    test('should handle clearing empty registry', () => {
      registry.clear();

      expect(mockLogger.debug).toHaveBeenCalledWith('Cleared 0 services from registry');
      expect(registry.getStatus().serviceCount).toBe(0);
    });

    test('should be able to register services after clearing', () => {
      registry.register('service1', { name: 'service1' });
      registry.clear();

      registry.register('service2', { name: 'service2' });

      expect(registry.has('service1')).toBe(false);
      expect(registry.has('service2')).toBe(true);
      expect(registry.getStatus().serviceCount).toBe(1);
    });
  });

  describe('Service Name Listing Edge Cases', () => {
    test('should maintain insertion order', () => {
      const names = ['zebra', 'alpha', 'beta', 'gamma'];

      names.forEach(name => {
        registry.register(name, { name });
      });

      expect(registry.getServiceNames()).toEqual(names);
    });

    test('should handle service names with different types', () => {
      registry.register('string', {});
      registry.register(42, {});
      registry.register(true, {});
      registry.register(Symbol('test'), {});

      const names = registry.getServiceNames();
      expect(names).toContain('string');
      expect(names).toContain(42);
      expect(names).toContain(true);
      expect(names.some(name => typeof name === 'symbol')).toBe(true);
    });

    test('should return independent arrays', () => {
      registry.register('test1', {});
      registry.register('test2', {});

      const names1 = registry.getServiceNames();
      const names2 = registry.getServiceNames();

      expect(names1).toEqual(names2);
      expect(names1).not.toBe(names2); // Different array instances

      // Modifying one shouldn't affect the other
      names1.push('modified');
      expect(names2).not.toContain('modified');
    });
  });

  describe('Status Reporting Edge Cases', () => {
    test('should return independent status objects', () => {
      registry.register('test', {});

      const status1 = registry.getStatus();
      const status2 = registry.getStatus();

      expect(status1).toEqual(status2);
      expect(status1).not.toBe(status2);

      // Modifying one shouldn't affect the other
      status1.customField = 'modified';
      expect(status2.customField).toBeUndefined();
    });

    test('should reflect real-time changes', () => {
      let status = registry.getStatus();
      expect(status.serviceCount).toBe(0);

      registry.register('service1', {});
      status = registry.getStatus();
      expect(status.serviceCount).toBe(1);

      registry.register('service2', {});
      status = registry.getStatus();
      expect(status.serviceCount).toBe(2);

      registry.unregister('service1');
      status = registry.getStatus();
      expect(status.serviceCount).toBe(1);
      expect(status.services).toEqual(['service2']);
    });

    test('should handle status with complex service names', () => {
      registry.register('', {}); // Empty string
      registry.register(' ', {}); // Space
      registry.register('\n', {}); // Newline
      registry.register('\t', {}); // Tab

      const status = registry.getStatus();
      expect(status.serviceCount).toBe(4);
      expect(status.services).toContain('');
      expect(status.services).toContain(' ');
      expect(status.services).toContain('\n');
      expect(status.services).toContain('\t');
    });
  });

  describe('Memory and Performance Considerations', () => {
    test('should handle large number of services efficiently', () => {
      const start = Date.now();

      // Register 1000 services
      for (let i = 0; i < 1000; i++) {
        registry.register(`service_${i}`, { id: i });
      }

      const registrationTime = Date.now() - start;

      // Retrieve all services
      const retrievalStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        expect(registry.get(`service_${i}`)).toEqual({ id: i });
      }
      const retrievalTime = Date.now() - retrievalStart;

      // Operations should be reasonably fast (less than 100ms each)
      expect(registrationTime).toBeLessThan(100);
      expect(retrievalTime).toBeLessThan(100);

      expect(registry.getStatus().serviceCount).toBe(1000);
    });

    test('should handle service replacement without memory leaks', () => {
      const originalService = { data: 'x'.repeat(10000) }; // Large object

      registry.register('test', originalService);
      expect(registry.get('test')).toBe(originalService);

      // Replace with new service
      const newService = { data: 'y'.repeat(10000) };
      registry.register('test', newService);
      expect(registry.get('test')).toBe(newService);
      expect(registry.get('test')).not.toBe(originalService);
    });

    test('should maintain consistent performance with mixed operations', () => {
      const operations = [];
      const start = Date.now();

      // Mix of operations
      for (let i = 0; i < 100; i++) {
        registry.register(`service_${i}`, { id: i });
        operations.push('register');

        if (i % 3 === 0) {
          registry.get(`service_${Math.floor(i / 2)}`);
          operations.push('get');
        }

        if (i % 5 === 0 && i > 0) {
          registry.unregister(`service_${i - 1}`);
          operations.push('unregister');
        }

        if (i % 10 === 0) {
          registry.getServiceNames();
          registry.getStatus();
          operations.push('status');
        }
      }

      const totalTime = Date.now() - start;
      expect(totalTime).toBeLessThan(50); // Should be very fast
      expect(operations.length).toBeGreaterThan(100);
    });
  });

  describe('Concurrent Access Scenarios', () => {
    test('should handle rapid concurrent registrations', () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        const promise = Promise.resolve().then(() => {
          registry.register(`concurrent_${i}`, { id: i });
          return registry.get(`concurrent_${i}`);
        });
        promises.push(promise);
      }

      return Promise.all(promises).then(results => {
        results.forEach((result, index) => {
          expect(result).toEqual({ id: index });
        });

        expect(registry.getStatus().serviceCount).toBe(50);
      });
    });

    test('should handle mixed concurrent operations', () => {
      // Pre-register some services
      for (let i = 0; i < 20; i++) {
        registry.register(`initial_${i}`, { id: i });
      }

      const operations = [];

      // Concurrent operations
      for (let i = 0; i < 30; i++) {
        operations.push(
          Promise.resolve().then(() => {
            registry.register(`new_${i}`, { id: i + 1000 });
            return 'registered';
          })
        );

        operations.push(
          Promise.resolve().then(() => {
            const result = registry.get(`initial_${i % 20}`);
            return result ? 'found' : 'not_found';
          })
        );

        if (i % 5 === 0) {
          operations.push(
            Promise.resolve().then(() => {
              registry.unregister(`initial_${i}`);
              return 'unregistered';
            })
          );
        }
      }

      return Promise.all(operations).then(results => {
        expect(results.filter(r => r === 'registered')).toHaveLength(30);
        expect(results.filter(r => r === 'found').length).toBeGreaterThan(0);
        expect(results.filter(r => r === 'unregistered')).toHaveLength(6);
      });
    });
  });
});
