/**
 * Base MCP Resource Class
 * Provides common functionality for MCP resources
 */

const EventEmitter = require('events');
const { logger } = require('../../utils/Logger');

class BaseMCPResource extends EventEmitter {
  constructor(uri, name, description) {
    super();
    
    if (!uri) {
      throw new Error('Resource URI is required');
    }
    
    if (!name) {
      throw new Error('Resource name is required');
    }

    this.uri = uri;
    this.name = name;
    this.description = description || '';
    this.logger = logger;
    
    // Resource configuration
    this.cacheable = false;
    this.cacheTTL = 0; // 0 means no expiration
    this.subscriptionsSupported = false;
    
    // Resource state
    this.lastUpdated = Date.now();
    this.updateCount = 0;
    this.isInitialized = false;
  }

  /**
   * Initialize the resource
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    this.logger.debug(`Initializing resource: ${this.uri}`);
    
    // Override in subclasses for custom initialization
    await this.doInitialize();
    
    this.isInitialized = true;
    this.logger.debug(`Resource initialized: ${this.uri}`);
    this.emit('initialized');
  }

  /**
   * Custom initialization logic - override in subclasses
   * @returns {Promise<void>}
   * @protected
   */
  async doInitialize() {
    // Override in subclasses
  }

  /**
   * Read resource content - must be implemented by subclasses
   * @param {object} options - Read options
   * @returns {Promise<object>} Resource data
   * @abstract
   */
  async read(_options = {}) {
    throw new Error(`read() method must be implemented by ${this.constructor.name}`);
  }

  /**
   * Get resource metadata
   * @returns {object} Metadata object
   */
  getMetadata() {
    return {
      uri: this.uri,
      name: this.name,
      description: this.description,
      mimeType: this.getMimeType(),
      lastUpdated: this.lastUpdated,
      updateCount: this.updateCount,
      cacheable: this.cacheable,
      cacheTTL: this.cacheTTL,
      supportsSubscriptions: this.subscriptionsSupported
    };
  }

  /**
   * Get resource MIME type
   * @returns {string} MIME type
   */
  getMimeType() {
    return 'application/json';
  }

  /**
   * Check if resource supports subscriptions
   * @returns {boolean} True if subscriptions supported
   */
  supportsSubscriptions() {
    return this.subscriptionsSupported;
  }

  /**
   * Check if resource is cacheable
   * @returns {boolean} True if cacheable
   */
  isCacheable() {
    return this.cacheable;
  }

  /**
   * Get cache TTL in milliseconds
   * @returns {number} TTL in ms, 0 means no expiration
   */
  getCacheTTL() {
    return this.cacheTTL;
  }

  /**
   * Notify subscribers of resource update
   * @param {object} updateData - Update data
   * @protected
   */
  notifyUpdate(updateData = {}) {
    this.lastUpdated = Date.now();
    this.updateCount++;
    
    const eventData = {
      uri: this.uri,
      timestamp: this.lastUpdated,
      updateCount: this.updateCount,
      ...updateData
    };

    this.logger.debug(`Resource updated: ${this.uri}`, { 
      updateCount: this.updateCount 
    });
    
    this.emit('update', eventData);
  }

  /**
   * Set resource as cacheable with optional TTL
   * @param {number} ttl - Cache TTL in milliseconds (0 = no expiration)
   */
  setCacheable(ttl = 0) {
    this.cacheable = true;
    this.cacheTTL = ttl;
  }

  /**
   * Enable subscriptions for this resource
   */
  enableSubscriptions() {
    this.subscriptionsSupported = true;
  }

  /**
   * Disable subscriptions for this resource
   */
  disableSubscriptions() {
    this.subscriptionsSupported = false;
  }

  /**
   * Validate read options - override in subclasses
   * @param {object} options - Read options
   * @returns {object} Validated options
   * @protected
   */
  validateReadOptions(options) {
    return {
      // Default options
      limit: null,
      offset: 0,
      filter: null,
      ...options
    };
  }

  /**
   * Apply pagination to data
   * @param {Array} data - Data array to paginate
   * @param {object} options - Pagination options
   * @returns {Array} Paginated data
   * @protected
   */
  applyPagination(data, options) {
    if (!Array.isArray(data)) {
      return data;
    }

    let result = data;

    // Apply offset
    if (options.offset > 0) {
      result = result.slice(options.offset);
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Apply filtering to data
   * @param {Array} data - Data array to filter
   * @param {object|string} filter - Filter criteria
   * @returns {Array} Filtered data
   * @protected
   */
  applyFilter(data, filter) {
    if (!filter || !Array.isArray(data)) {
      return data;
    }

    if (typeof filter === 'string') {
      // Simple string filter - search in JSON representation
      return data.filter(item => 
        JSON.stringify(item).toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (typeof filter === 'object') {
      // Object filter - match properties
      return data.filter(item => {
        return Object.entries(filter).every(([key, value]) => {
          const itemValue = this.getNestedProperty(item, key);
          return itemValue === value;
        });
      });
    }

    return data;
  }

  /**
   * Get nested property from object using dot notation
   * @param {object} obj - Object to search
   * @param {string} path - Property path (e.g., 'user.name')
   * @returns {*} Property value or undefined
   * @private
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Format resource error for consistent error handling
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {Error} Formatted error
   * @protected
   */
  formatError(error, operation) {
    const message = `${operation} failed for resource ${this.uri}: ${error.message}`;
    const formattedError = new Error(message);
    formattedError.originalError = error;
    formattedError.resourceUri = this.uri;
    formattedError.operation = operation;
    return formattedError;
  }

  /**
   * Get resource status
   * @returns {object} Status information
   */
  getStatus() {
    return {
      uri: this.uri,
      name: this.name,
      initialized: this.isInitialized,
      lastUpdated: this.lastUpdated,
      updateCount: this.updateCount,
      cacheable: this.cacheable,
      subscriptionsSupported: this.subscriptionsSupported
    };
  }
}

module.exports = BaseMCPResource;