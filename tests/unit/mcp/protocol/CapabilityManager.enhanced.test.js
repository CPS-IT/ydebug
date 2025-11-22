/**
 * CapabilityManager Enhanced Unit Tests
 * Comprehensive tests covering all edge cases and error scenarios
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const CapabilityManager = require('../../../../src/mcp/protocol/CapabilityManager');

// Mock Logger module
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../../../src/utils/Logger', () => ({ logger: mockLogger }));

describe('CapabilityManager Enhanced Tests', () => {
  let manager;

  beforeEach(() => {
    manager = new CapabilityManager();
    // Override the logger with our mock
    manager.logger = mockLogger;
    jest.clearAllMocks();
  });

  describe('Initialization and Default State', () => {
    test('should initialize with correct default values', () => {
      expect(manager.isNegotiated).toBe(false);
      expect(manager.clientCapabilities).toBeNull();
      expect(manager.logger).toBe(mockLogger);
    });

    test('should have expected server capabilities structure', () => {
      const serverCaps = manager.getServerCapabilities();

      expect(serverCaps).toHaveProperty('protocolVersion', '2025-06-18');
      expect(serverCaps).toHaveProperty('serverInfo');
      expect(serverCaps.serverInfo).toHaveProperty('name', 'ydebug-mcp-server');
      expect(serverCaps.serverInfo).toHaveProperty('version', '1.0.0');
      expect(serverCaps).toHaveProperty('capabilities');
    });

    test('should have expected capabilities in server capabilities', () => {
      const serverCaps = manager.getServerCapabilities();

      expect(serverCaps.capabilities).toHaveProperty('tools');
      expect(serverCaps.capabilities).toHaveProperty('resources');
      expect(serverCaps.capabilities).toHaveProperty('logging');

      // Check resource capabilities structure
      expect(serverCaps.capabilities.resources).toHaveProperty('subscribe', true);
      expect(serverCaps.capabilities.resources).toHaveProperty('listChanged', true);
    });

    test('should return deep copy of server capabilities', () => {
      const caps1 = manager.getServerCapabilities();
      const caps2 = manager.getServerCapabilities();

      expect(caps1).toEqual(caps2);
      expect(caps1).not.toBe(caps2); // Different object references

      // Modify one copy
      caps1.serverInfo.name = 'modified';
      expect(caps2.serverInfo.name).toBe('ydebug-mcp-server');
    });
  });

  describe('Capability Negotiation - Success Cases', () => {
    test('should negotiate successfully with minimal valid client capabilities', () => {
      const clientCaps = {
        protocolVersion: '2025-06-18'
      };

      const result = manager.negotiateCapabilities(clientCaps);

      expect(result).toBe(true);
      expect(manager.isNegotiated).toBe(true);
      expect(manager.clientCapabilities).toBe(clientCaps);
      expect(mockLogger.info).toHaveBeenCalledWith('Negotiating capabilities with MCP client');
      expect(mockLogger.info).toHaveBeenCalledWith('Capability negotiation successful');
    });

    test('should negotiate successfully with complete client capabilities', () => {
      const clientCaps = {
        protocolVersion: '2025-06-18',
        capabilities: {
          sampling: {},
          roots: { listChanged: true }
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
          description: 'Test MCP client'
        }
      };

      const result = manager.negotiateCapabilities(clientCaps);

      expect(result).toBe(true);
      expect(manager.isNegotiated).toBe(true);
      expect(manager.clientCapabilities).toBe(clientCaps);

      // Verify logging with complex capabilities
      expect(mockLogger.info).toHaveBeenCalledWith('Client capabilities received:', {
        protocolVersion: '2025-06-18',
        clientInfo: clientCaps.clientInfo,
        capabilities: ['sampling', 'roots']
      });
    });

    test('should handle client capabilities with empty capabilities object', () => {
      const clientCaps = {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'empty-client', version: '1.0.0' }
      };

      const result = manager.negotiateCapabilities(clientCaps);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Client capabilities received:', {
        protocolVersion: '2025-06-18',
        clientInfo: clientCaps.clientInfo,
        capabilities: []
      });
    });

    test('should handle client capabilities without clientInfo', () => {
      const clientCaps = {
        protocolVersion: '2025-06-18',
        capabilities: { sampling: {} }
      };

      const result = manager.negotiateCapabilities(clientCaps);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Client capabilities received:', {
        protocolVersion: '2025-06-18',
        clientInfo: undefined,
        capabilities: ['sampling']
      });
    });

    test('should allow re-negotiation with new capabilities', () => {
      const firstCaps = {
        protocolVersion: '2025-06-18',
        capabilities: { sampling: {} }
      };

      const secondCaps = {
        protocolVersion: '2025-06-18',
        capabilities: { roots: {} }
      };

      expect(manager.negotiateCapabilities(firstCaps)).toBe(true);
      expect(manager.clientCapabilities).toBe(firstCaps);

      expect(manager.negotiateCapabilities(secondCaps)).toBe(true);
      expect(manager.clientCapabilities).toBe(secondCaps);
    });
  });

  describe('Capability Negotiation - Failure Cases', () => {
    test('should reject null and undefined client capabilities', () => {
      expect(manager.negotiateCapabilities(null)).toBe(false);
      expect(manager.negotiateCapabilities(undefined)).toBe(false);

      expect(manager.isNegotiated).toBe(false);
      expect(manager.clientCapabilities).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid client capabilities format');
    });

    test('should reject non-object client capabilities', () => {
      const invalidInputs = ['string', 123, true, [], () => {}];

      invalidInputs.forEach(input => {
        jest.clearAllMocks();
        const result = manager.negotiateCapabilities(input);

        expect(result).toBe(false);
        expect(manager.isNegotiated).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Invalid client capabilities format');
      });
    });

    test('should reject capabilities without protocolVersion', () => {
      const invalidCaps = {
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      };

      const result = manager.negotiateCapabilities(invalidCaps);

      expect(result).toBe(false);
      expect(manager.isNegotiated).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid client capabilities format');
    });

    test('should reject capabilities with non-string protocolVersion', () => {
      const invalidVersions = [123, null, undefined, {}, [], true];

      invalidVersions.forEach(version => {
        jest.clearAllMocks();
        const caps = {
          protocolVersion: version,
          capabilities: {}
        };

        const result = manager.negotiateCapabilities(caps);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Invalid client capabilities format');
      });
    });

    test('should reject unsupported protocol version', () => {
      const unsupportedVersions = [
        '2020-01-01',
        '2024-11-04',
        '2024-11-06',
        '3.0.0',
        'invalid-version'
      ];

      unsupportedVersions.forEach(version => {
        jest.clearAllMocks();
        const caps = {
          protocolVersion: version,
          capabilities: {}
        };

        const result = manager.negotiateCapabilities(caps);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(`Incompatible protocol version: ${version}`);
      });
    });

    test('should reject capabilities with invalid clientInfo type', () => {
      const invalidClientInfos = ['string', 123, [], null, true];

      invalidClientInfos.forEach(clientInfo => {
        jest.clearAllMocks();
        const caps = {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo
        };

        const result = manager.negotiateCapabilities(caps);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Invalid client capabilities format');
      });
    });

    test('should reject capabilities with invalid capabilities type', () => {
      const invalidCapabilities = ['string', 123, [], null, true];

      invalidCapabilities.forEach(capabilities => {
        jest.clearAllMocks();
        const caps = {
          protocolVersion: '2025-06-18',
          capabilities
        };

        const result = manager.negotiateCapabilities(caps);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Invalid client capabilities format');
      });
    });
  });

  describe('Client Capability Validation', () => {
    test('should validate minimal valid capabilities', () => {
      const validCaps = {
        protocolVersion: '2025-06-18'
      };

      expect(manager.validateClientCapabilities(validCaps)).toBe(true);
    });

    test('should validate complete capabilities', () => {
      const validCaps = {
        protocolVersion: '2025-06-18',
        capabilities: {
          sampling: {},
          roots: { listChanged: true }
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      };

      expect(manager.validateClientCapabilities(validCaps)).toBe(true);
    });

    test('should accept capabilities with extra fields', () => {
      const capsWithExtras = {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        },
        extraField: 'should be ignored',
        anotherExtra: { complex: 'object' }
      };

      expect(manager.validateClientCapabilities(capsWithExtras)).toBe(true);
    });

    test('should accept empty clientInfo object', () => {
      const validCaps = {
        protocolVersion: '2025-06-18',
        clientInfo: {}
      };

      expect(manager.validateClientCapabilities(validCaps)).toBe(true);
    });

    test('should accept empty capabilities object', () => {
      const validCaps = {
        protocolVersion: '2025-06-18',
        capabilities: {}
      };

      expect(manager.validateClientCapabilities(validCaps)).toBe(true);
    });
  });

  describe('Protocol Version Compatibility', () => {
    test('should accept exact protocol version match', () => {
      expect(manager.isProtocolVersionCompatible('2025-06-18')).toBe(true);
    });

    test('should reject different protocol versions', () => {
      const incompatibleVersions = [
        '2024-11-04',
        '2024-11-06',
        '2024-10-05',
        '2025-11-05',
        '2023-11-05',
        '1.0.0',
        '2.0.0'
      ];

      incompatibleVersions.forEach(version => {
        expect(manager.isProtocolVersionCompatible(version)).toBe(false);
      });
    });

    test('should handle edge cases for protocol version', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        '   ',
        123,
        {},
        [],
        true,
        false
      ];

      edgeCases.forEach(version => {
        expect(manager.isProtocolVersionCompatible(version)).toBe(false);
      });
    });

    test('should be case sensitive for protocol version', () => {
      expect(manager.isProtocolVersionCompatible('2025-06-18')).toBe(true);
      expect(manager.isProtocolVersionCompatible('2025-06-18 ')).toBe(false);
      expect(manager.isProtocolVersionCompatible(' 2025-06-18')).toBe(false);
    });
  });

  describe('Client Support Checking', () => {
    test('should return false when no client capabilities exist', () => {
      expect(manager.clientSupports('sampling')).toBe(false);
      expect(manager.clientSupports('roots')).toBe(false);
      expect(manager.clientSupports('any_capability')).toBe(false);
    });

    test('should return false when client has no capabilities object', () => {
      manager.clientCapabilities = {
        protocolVersion: '2025-06-18'
      };

      expect(manager.clientSupports('sampling')).toBe(false);
      expect(manager.clientSupports('roots')).toBe(false);
    });

    test('should return false when client has empty capabilities', () => {
      manager.clientCapabilities = {
        protocolVersion: '2025-06-18',
        capabilities: {}
      };

      expect(manager.clientSupports('sampling')).toBe(false);
      expect(manager.clientSupports('roots')).toBe(false);
    });

    test('should correctly identify supported capabilities', () => {
      manager.clientCapabilities = {
        protocolVersion: '2025-06-18',
        capabilities: {
          sampling: {},
          roots: { listChanged: true },
          customCapability: { enabled: false }
        }
      };

      expect(manager.clientSupports('sampling')).toBe(true);
      expect(manager.clientSupports('roots')).toBe(true);
      expect(manager.clientSupports('customCapability')).toBe(true);
      expect(manager.clientSupports('nonexistent')).toBe(false);
    });

    test('should handle client capabilities with null/undefined values', () => {
      manager.clientCapabilities = {
        protocolVersion: '2025-06-18',
        capabilities: {
          sampling: null,
          roots: undefined,
          logging: {}
        }
      };

      // undefined should return false, null and empty object should return true
      expect(manager.clientSupports('sampling')).toBe(true);
      expect(manager.clientSupports('roots')).toBe(false);
      expect(manager.clientSupports('logging')).toBe(true);
    });
  });

  describe('Server Support Checking', () => {
    test('should correctly identify server supported capabilities', () => {
      expect(manager.serverSupports('tools')).toBe(true);
      expect(manager.serverSupports('resources')).toBe(true);
      expect(manager.serverSupports('logging')).toBe(true);
      expect(manager.serverSupports('nonexistent')).toBe(false);
    });

    test('should handle case sensitivity', () => {
      expect(manager.serverSupports('Tools')).toBe(false);
      expect(manager.serverSupports('TOOLS')).toBe(false);
      expect(manager.serverSupports('tools')).toBe(true);
    });

    test('should handle various input types', () => {
      expect(manager.serverSupports('')).toBe(false);
      expect(manager.serverSupports(null)).toBe(false);
      expect(manager.serverSupports(undefined)).toBe(false);
      expect(manager.serverSupports(123)).toBe(false);
      expect(manager.serverSupports({})).toBe(false);
    });
  });

  describe('Client Information Management', () => {
    test('should return null when no client capabilities exist', () => {
      expect(manager.getClientInfo()).toBeNull();
    });

    test('should return client info when available', () => {
      const clientInfo = {
        name: 'test-client',
        version: '1.0.0',
        description: 'Test client'
      };

      manager.clientCapabilities = {
        protocolVersion: '2025-06-18',
        clientInfo
      };

      expect(manager.getClientInfo()).toBe(clientInfo);
    });

    test('should return undefined when client info is missing', () => {
      manager.clientCapabilities = {
        protocolVersion: '2025-06-18'
      };

      expect(manager.getClientInfo()).toBeUndefined();
    });

    test('should handle null client info', () => {
      manager.clientCapabilities = {
        protocolVersion: '2025-06-18',
        clientInfo: null
      };

      expect(manager.getClientInfo()).toBeNull();
    });
  });

  describe('Server Capability Management', () => {
    test('should update server capability', () => {
      const newCapability = { enabled: true, version: 2 };

      manager.updateServerCapability('newFeature', newCapability);

      const serverCaps = manager.getServerCapabilities();
      expect(serverCaps.capabilities.newFeature).toEqual(newCapability);
      expect(mockLogger.debug).toHaveBeenCalledWith('Updated server capability: newFeature');
    });

    test('should overwrite existing server capability', () => {
      const originalToolsCap = manager.getServerCapabilities().capabilities.tools;
      const newToolsCap = { enhanced: true };

      manager.updateServerCapability('tools', newToolsCap);

      const serverCaps = manager.getServerCapabilities();
      expect(serverCaps.capabilities.tools).toEqual(newToolsCap);
      expect(serverCaps.capabilities.tools).not.toEqual(originalToolsCap);
    });

    test('should remove server capability', () => {
      // First verify the capability exists
      expect(manager.getServerCapabilities().capabilities.tools).toBeDefined();

      manager.removeServerCapability('tools');

      const serverCaps = manager.getServerCapabilities();
      expect(serverCaps.capabilities.tools).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Removed server capability: tools');
    });

    test('should handle removing non-existent capability', () => {
      manager.removeServerCapability('nonexistent');

      expect(mockLogger.debug).toHaveBeenCalledWith('Removed server capability: nonexistent');
      // Should not throw error
    });
  });

  describe('Status Information', () => {
    test('should return correct status before negotiation', () => {
      const status = manager.getStatus();

      expect(status).toEqual({
        isNegotiated: false,
        protocolVersion: '2025-06-18',
        serverCapabilities: ['tools', 'resources', 'logging'],
        clientCapabilities: null,
        clientInfo: null
      });
    });

    test('should return correct status after successful negotiation', () => {
      const clientCaps = {
        protocolVersion: '2025-06-18',
        capabilities: {
          sampling: {},
          roots: { listChanged: true }
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      };

      manager.negotiateCapabilities(clientCaps);
      const status = manager.getStatus();

      expect(status).toEqual({
        isNegotiated: true,
        protocolVersion: '2025-06-18',
        serverCapabilities: ['tools', 'resources', 'logging'],
        clientCapabilities: ['sampling', 'roots'],
        clientInfo: clientCaps.clientInfo
      });
    });

    test('should handle client capabilities without capabilities object in status', () => {
      manager.clientCapabilities = {
        protocolVersion: '2025-06-18',
        clientInfo: { name: 'test', version: '1.0' }
      };
      manager.isNegotiated = true;

      const status = manager.getStatus();

      expect(status.clientCapabilities).toEqual([]);
    });

    test('should reflect server capability changes in status', () => {
      manager.updateServerCapability('newCapability', {});
      manager.removeServerCapability('logging');

      const status = manager.getStatus();

      expect(status.serverCapabilities).toContain('newCapability');
      expect(status.serverCapabilities).not.toContain('logging');
      expect(status.serverCapabilities).toContain('tools');
      expect(status.serverCapabilities).toContain('resources');
    });
  });

  describe('Reset', () => {
    test('should reset negotiation state', () => {
      // Setup negotiated state
      const clientCaps = {
        protocolVersion: '2025-06-18',
        capabilities: { sampling: {} },
        clientInfo: { name: 'test', version: '1.0' }
      };

      manager.negotiateCapabilities(clientCaps);
      expect(manager.isNegotiated).toBe(true);
      expect(manager.clientCapabilities).toBe(clientCaps);

      // Reset
      manager.reset();

      expect(manager.isNegotiated).toBe(false);
      expect(manager.clientCapabilities).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Capability negotiation reset');
    });

    test('should not affect server capabilities on reset', () => {
      const originalServerCaps = manager.getServerCapabilities();

      // Add custom capability
      manager.updateServerCapability('custom', { test: true });

      // Negotiate and reset
      manager.negotiateCapabilities({ protocolVersion: '2025-06-18' });
      manager.reset();

      // Server capabilities should be unchanged
      const serverCaps = manager.getServerCapabilities();
      expect(serverCaps.capabilities.custom).toEqual({ test: true });
      expect(serverCaps.capabilities.tools).toEqual(originalServerCaps.capabilities.tools);
    });

    test('should allow negotiation after reset', () => {
      const firstCaps = { protocolVersion: '2025-06-18', capabilities: { first: {} } };
      const secondCaps = { protocolVersion: '2025-06-18', capabilities: { second: {} } };

      manager.negotiateCapabilities(firstCaps);
      manager.reset();

      const result = manager.negotiateCapabilities(secondCaps);

      expect(result).toBe(true);
      expect(manager.isNegotiated).toBe(true);
      expect(manager.clientCapabilities).toBe(secondCaps);
    });

    test('should be safe to call reset multiple times', () => {
      manager.negotiateCapabilities({ protocolVersion: '2025-06-18' });

      manager.reset();
      manager.reset();
      manager.reset();

      expect(manager.isNegotiated).toBe(false);
      expect(manager.clientCapabilities).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledTimes(3);
    });

    test('should be safe to call reset when not negotiated', () => {
      manager.reset();

      expect(manager.isNegotiated).toBe(false);
      expect(manager.clientCapabilities).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Capability negotiation reset');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very large capability objects', () => {
      const largeCaps = {
        protocolVersion: '2025-06-18',
        capabilities: {}
      };

      // Add many capabilities
      for (let i = 0; i < 1000; i++) {
        largeCaps.capabilities[`capability_${i}`] = { index: i, data: `data_${i}` };
      }

      const result = manager.negotiateCapabilities(largeCaps);
      expect(result).toBe(true);

      const status = manager.getStatus();
      expect(status.clientCapabilities).toHaveLength(1000);
    });

    test('should handle deeply nested capability objects', () => {
      const deepCaps = {
        protocolVersion: '2025-06-18',
        capabilities: {
          deeply: {
            nested: {
              capability: {
                with: {
                  many: {
                    levels: {
                      of: {
                        nesting: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const result = manager.negotiateCapabilities(deepCaps);
      expect(result).toBe(true);
      expect(manager.clientSupports('deeply')).toBe(true);
    });

    test('should handle client capabilities with circular references safely', () => {
      const capsWithCircular = {
        protocolVersion: '2025-06-18',
        capabilities: {}
      };

      // Create circular reference
      capsWithCircular.capabilities.self = capsWithCircular.capabilities;

      // Should still validate the base structure
      expect(manager.validateClientCapabilities(capsWithCircular)).toBe(true);
    });

    test('should handle special string values in protocol version', () => {
      const specialValues = [
        '2025-06-18\n',
        '2025-06-18\t',
        '2025-06-18 ',
        ' 2025-06-18',
        '2025-06-18\0',
        '2025-06-18\r',
        'ï»¿2025-06-18', // BOM character
        '2025-06-18â€‹' // Zero-width space
      ];

      specialValues.forEach(version => {
        const caps = { protocolVersion: version };
        expect(manager.negotiateCapabilities(caps)).toBe(false);
      });
    });
  });
});
