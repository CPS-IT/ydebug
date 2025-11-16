/**
 * MCP Capability Management
 * Handles MCP server capabilities, negotiation, and client handshake
 */

const { logger } = require('../../utils/Logger');

class CapabilityManager {
  constructor() {
    this.logger = logger;
    this.serverCapabilities = {
      // Core MCP protocol version
      protocolVersion: '2024-11-05',
      
      // Server information
      serverInfo: {
        name: 'ydebug-mcp-server',
        version: '1.0.0'
      },

      // Supported capabilities
      capabilities: {
        // Tools capability - server can execute tools
        tools: {},
        
        // Resources capability - server can provide resources  
        resources: {
          // Support for resource subscriptions
          subscribe: true,
          // Support for listing resources
          listChanged: true
        },

        // Prompts capability (not implemented yet)
        // prompts: {},

        // Logging capability
        logging: {}
      }
    };

    this.clientCapabilities = null;
    this.isNegotiated = false;
  }

  /**
   * Get server capabilities for initialization response
   * @returns {object} Server capabilities object
   */
  getServerCapabilities() {
    return {
      protocolVersion: this.serverCapabilities.protocolVersion,
      serverInfo: { ...this.serverCapabilities.serverInfo },
      capabilities: JSON.parse(JSON.stringify(this.serverCapabilities.capabilities))
    };
  }

  /**
   * Handle client capabilities from initialization request
   * @param {object} clientCapabilities - Client capabilities object
   * @returns {boolean} True if negotiation successful
   */
  negotiateCapabilities(clientCapabilities) {
    this.logger.info('Negotiating capabilities with MCP client');
    
    // Validate client capabilities structure
    if (!this.validateClientCapabilities(clientCapabilities)) {
      this.logger.error('Invalid client capabilities format');
      return false;
    }

    // Store client capabilities
    this.clientCapabilities = clientCapabilities;

    // Log negotiated capabilities
    this.logger.info('Client capabilities received:', {
      protocolVersion: clientCapabilities.protocolVersion,
      clientInfo: clientCapabilities.clientInfo,
      capabilities: Object.keys(clientCapabilities.capabilities || {})
    });

    // Check protocol version compatibility
    if (!this.isProtocolVersionCompatible(clientCapabilities.protocolVersion)) {
      this.logger.error(`Incompatible protocol version: ${clientCapabilities.protocolVersion}`);
      return false;
    }

    this.isNegotiated = true;
    this.logger.info('Capability negotiation successful');
    return true;
  }

  /**
   * Validate client capabilities format
   * @param {object} capabilities - Client capabilities
   * @returns {boolean} True if valid format
   */
  validateClientCapabilities(capabilities) {
    if (!capabilities || typeof capabilities !== 'object') {
      return false;
    }

    // Check required fields
    if (!capabilities.protocolVersion || typeof capabilities.protocolVersion !== 'string') {
      return false;
    }

    // Client info is optional but should be object if present (not null, not array)
    if (capabilities.clientInfo !== undefined && (
        capabilities.clientInfo === null || 
        Array.isArray(capabilities.clientInfo) || 
        typeof capabilities.clientInfo !== 'object'
    )) {
      return false;
    }

    // Capabilities field is optional but should be object if present (not null, not array)
    if (capabilities.capabilities !== undefined && (
        capabilities.capabilities === null || 
        Array.isArray(capabilities.capabilities) || 
        typeof capabilities.capabilities !== 'object'
    )) {
      return false;
    }

    return true;
  }

  /**
   * Check if protocol version is compatible
   * @param {string} clientVersion - Client protocol version
   * @returns {boolean} True if compatible
   */
  isProtocolVersionCompatible(clientVersion) {
    // For now, we only support the exact protocol version
    // In future versions, we could implement backward compatibility
    return clientVersion === this.serverCapabilities.protocolVersion;
  }

  /**
   * Check if client supports specific capability
   * @param {string} capability - Capability name (e.g., 'tools', 'resources')
   * @returns {boolean} True if client supports capability
   */
  clientSupports(capability) {
    if (!this.clientCapabilities || !this.clientCapabilities.capabilities) {
      return false;
    }
    return this.clientCapabilities.capabilities[capability] !== undefined;
  }

  /**
   * Check if server supports specific capability
   * @param {string} capability - Capability name
   * @returns {boolean} True if server supports capability
   */
  serverSupports(capability) {
    return this.serverCapabilities.capabilities[capability] !== undefined;
  }

  /**
   * Get client information
   * @returns {object|null} Client info or null if not negotiated
   */
  getClientInfo() {
    return this.clientCapabilities ? this.clientCapabilities.clientInfo : null;
  }

  /**
   * Update server capabilities (for dynamic capability registration)
   * @param {string} capability - Capability name
   * @param {object} config - Capability configuration
   */
  updateServerCapability(capability, config) {
    this.serverCapabilities.capabilities[capability] = config;
    this.logger.debug(`Updated server capability: ${capability}`);
  }

  /**
   * Remove server capability
   * @param {string} capability - Capability name to remove
   */
  removeServerCapability(capability) {
    delete this.serverCapabilities.capabilities[capability];
    this.logger.debug(`Removed server capability: ${capability}`);
  }

  /**
   * Get negotiation status
   * @returns {object} Status information
   */
  getStatus() {
    return {
      isNegotiated: this.isNegotiated,
      protocolVersion: this.serverCapabilities.protocolVersion,
      serverCapabilities: Object.keys(this.serverCapabilities.capabilities),
      clientCapabilities: this.clientCapabilities 
        ? Object.keys(this.clientCapabilities.capabilities || {})
        : null,
      clientInfo: this.getClientInfo()
    };
  }

  /**
   * Reset capability negotiation
   */
  reset() {
    this.clientCapabilities = null;
    this.isNegotiated = false;
    this.logger.debug('Capability negotiation reset');
  }
}

module.exports = CapabilityManager;