/**
 * ServiceRegistry Unit Tests
 * Tests dependency injection system for MCP services
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const ServiceRegistry = require('../../src/mcp/ServiceRegistry');

// Mock Logger module
jest.mock('../../src/utils/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ServiceRegistry', () => {
  let registry;
  let mockLogger;

  beforeEach(() => {
    // Get reference to mocked logger
    mockLogger = require('../../src/utils/Logger').logger;
    registry = new ServiceRegistry();
    jest.clearAllMocks();
  });

  describe('Service Registration', () => {
    test('should register a new service', () => {
      const service = { name: 'testService' };
      
      registry.register('test', service);
      
      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')).toBe(service);
    });

    test('should overwrite existing service', () => {
      const service1 = { name: 'service1' };
      const service2 = { name: 'service2' };
      
      registry.register('test', service1);
      registry.register('test', service2);
      
      expect(registry.get('test')).toBe(service2);
    });

    test('should handle null service gracefully', () => {
      registry.register('nullService', null);
      
      expect(registry.has('nullService')).toBe(true);
      expect(registry.get('nullService')).toBe(null);
    });

    test('should handle undefined service gracefully', () => {
      registry.register('undefinedService', undefined);
      
      expect(registry.has('undefinedService')).toBe(true);
      expect(registry.get('undefinedService')).toBe(null); // Returns null when service is undefined
    });
  });

  describe('Service Retrieval', () => {
    test('should retrieve registered service', () => {
      const service = { name: 'testService' };
      registry.register('test', service);
      
      expect(registry.get('test')).toBe(service);
    });

    test('should return null for non-existent service', () => {
      expect(registry.get('nonExistent')).toBe(null);
    });

    test('should check service existence correctly', () => {
      registry.register('existing', {});
      
      expect(registry.has('existing')).toBe(true);
      expect(registry.has('nonExisting')).toBe(false);
    });
  });

  describe('Service Unregistration', () => {
    test('should unregister existing service', () => {
      const service = { name: 'testService' };
      registry.register('test', service);
      
      const result = registry.unregister('test');
      
      expect(result).toBe(true);
      expect(registry.has('test')).toBe(false);
    });

    test('should return false when unregistering non-existent service', () => {
      const result = registry.unregister('nonExistent');
      
      expect(result).toBe(false);
    });
  });

  describe('Service Listing', () => {
    test('should list all registered services', () => {
      registry.register('service1', { name: 'service1' });
      registry.register('service2', { name: 'service2' });
      registry.register('service3', { name: 'service3' });
      
      const services = registry.getServiceNames();
      
      expect(services).toEqual(['service1', 'service2', 'service3']);
    });

    test('should return empty array when no services registered', () => {
      const services = registry.getServiceNames();
      
      expect(services).toEqual([]);
    });
  });

  describe('Service Status', () => {
    test('should return correct status information', () => {
      registry.register('service1', { name: 'service1' });
      registry.register('service2', { name: 'service2' });
      
      const status = registry.getStatus();
      
      expect(status).toEqual({
        serviceCount: 2,
        services: ['service1', 'service2']
      });
    });

    test('should return zero count for empty registry', () => {
      const status = registry.getStatus();
      
      expect(status).toEqual({
        serviceCount: 0,
        services: []
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid service names gracefully', () => {
      registry.register('', { name: 'empty' });
      registry.register(null, { name: 'null' });
      registry.register(undefined, { name: 'undefined' });
      
      expect(registry.has('')).toBe(true);
      expect(registry.has(null)).toBe(true);
      expect(registry.has(undefined)).toBe(true);
    });

    test('should maintain registry integrity after errors', () => {
      const service = { name: 'testService' };
      registry.register('test', service);
      
      // Try operations that shouldn't affect existing services
      registry.get('nonExistent');
      registry.unregister('nonExistent');
      
      expect(registry.get('test')).toBe(service);
      expect(registry.has('test')).toBe(true);
    });
  });

  describe('Multiple Service Operations', () => {
    test('should handle concurrent registrations correctly', () => {
      const services = {};
      for (let i = 0; i < 100; i++) {
        services[`service${i}`] = { id: i };
        registry.register(`service${i}`, services[`service${i}`]);
      }
      
      for (let i = 0; i < 100; i++) {
        expect(registry.get(`service${i}`)).toBe(services[`service${i}`]);
      }
      
      expect(registry.getStatus().serviceCount).toBe(100);
    });

    test('should handle mixed operations correctly', () => {
      // Register services
      registry.register('service1', { name: 'service1' });
      registry.register('service2', { name: 'service2' });
      registry.register('service3', { name: 'service3' });
      
      // Check initial state
      expect(registry.getStatus().serviceCount).toBe(3);
      
      // Unregister one
      registry.unregister('service2');
      expect(registry.getStatus().serviceCount).toBe(2);
      expect(registry.has('service2')).toBe(false);
      
      // Re-register
      registry.register('service4', { name: 'service4' });
      expect(registry.getStatus().serviceCount).toBe(3);
      
      // Verify final state
      expect(registry.getServiceNames().sort()).toEqual(['service1', 'service3', 'service4']);
    });
  });
});