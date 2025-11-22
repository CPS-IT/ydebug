/**
 * MCP Resource Registry
 * Central registry for MCP resources that provide persistent debugging state
 */

const EventEmitter = require('events');
const { logger } = require('../../utils/Logger');

class MCPResourceRegistry extends EventEmitter {
  constructor() {
    super();
    
    this.logger = logger;
    this.resources = new Map();
    this.subscriptions = new Map();
    this.resourcesCache = new Map();
    
    // Resource change notifications
    this.resourceUpdateQueue = [];
    this.isProcessingUpdates = false;
  }

  /**
   * Register a new MCP resource
   * @param {string} uri - Resource URI
   * @param {MCPResource} resource - Resource instance
   */
  register(uri, resource) {
    if (this.resources.has(uri)) {
      throw new Error(`Resource with URI '${uri}' already registered`);
    }

    // Validate resource implements required interface
    this.validateResource(resource, uri);
    
    this.resources.set(uri, resource);
    this.logger.debug(`Registered MCP resource: ${uri}`, { type: resource.constructor.name });
    
    // Listen for resource updates
    resource.on('update', (data) => {
      this.handleResourceUpdate(uri, data);
    });
    
    this.emit('resource:registered', { uri, resource });
  }

  /**
   * Unregister an MCP resource
   * @param {string} uri - Resource URI
   */
  unregister(uri) {
    const resource = this.resources.get(uri);
    if (!resource) {
      this.logger.warn(`Attempted to unregister unknown resource: ${uri}`);
      return;
    }

    // Clean up subscriptions for this resource
    for (const [subscriptionKey, subscription] of this.subscriptions.entries()) {
      if (subscription.uri === uri) {
        this.subscriptions.delete(subscriptionKey);
      }
    }

    // Remove from cache
    this.resourcesCache.delete(uri);
    
    // Remove resource
    this.resources.delete(uri);
    this.logger.debug(`Unregistered MCP resource: ${uri}`);
    
    this.emit('resource:unregistered', { uri });
  }

  /**
   * Get all registered resource URIs
   * @returns {Array<string>} List of resource URIs
   */
  listResources() {
    return Array.from(this.resources.keys());
  }

  /**
   * Get resource by URI
   * @param {string} uri - Resource URI
   * @returns {MCPResource|null} Resource instance or null if not found
   */
  getResource(uri) {
    return this.resources.get(uri) || null;
  }

  /**
   * Read resource content
   * @param {string} uri - Resource URI
   * @param {object} options - Read options
   * @returns {Promise<object>} Resource content
   */
  async readResource(uri, options = {}) {
    const resource = this.getResource(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    try {
      // Check cache first if enabled
      if (options.useCache && this.resourcesCache.has(uri)) {
        const cached = this.resourcesCache.get(uri);
        if (!this.isCacheExpired(cached)) {
          this.logger.debug(`Returning cached resource: ${uri}`);
          return cached.data;
        }
      }

      const data = await resource.read(options);
      
      // Cache the result if configured
      if (options.useCache || resource.isCacheable()) {
        this.resourcesCache.set(uri, {
          data: data,
          timestamp: Date.now(),
          ttl: resource.getCacheTTL()
        });
      }

      this.logger.debug(`Read resource successfully: ${uri}`, { 
        size: JSON.stringify(data).length 
      });
      
      return data;
      
    } catch (error) {
      this.logger.error(`Failed to read resource: ${uri}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to resource updates
   * @param {string} uri - Resource URI
   * @param {string} subscriptionId - Client subscription ID
   * @param {object} options - Subscription options
   */
  subscribe(uri, subscriptionId, options = {}) {
    const resource = this.getResource(uri);
    if (!resource) {
      throw new Error(`Resource not found for subscription: ${uri}`);
    }

    if (!resource.supportsSubscriptions()) {
      throw new Error(`Resource does not support subscriptions: ${uri}`);
    }

    const subscriptionKey = `${subscriptionId}:${uri}`;
    
    if (this.subscriptions.has(subscriptionKey)) {
      this.logger.warn(`Subscription already exists: ${subscriptionKey}`);
      return;
    }

    this.subscriptions.set(subscriptionKey, {
      uri: uri,
      subscriptionId: subscriptionId,
      options: options,
      createdAt: Date.now()
    });

    this.logger.debug(`Created resource subscription: ${subscriptionKey}`);
    this.emit('resource:subscribed', { uri, subscriptionId, options });
  }

  /**
   * Unsubscribe from resource updates
   * @param {string} subscriptionId - Client subscription ID
   * @param {string} uri - Resource URI (optional, removes all if not specified)
   */
  unsubscribe(subscriptionId, uri = null) {
    let removedCount = 0;
    
    for (const [subscriptionKey, subscription] of this.subscriptions.entries()) {
      if (subscription.subscriptionId === subscriptionId && 
          (!uri || subscription.uri === uri)) {
        this.subscriptions.delete(subscriptionKey);
        removedCount++;
        this.logger.debug(`Removed subscription: ${subscriptionKey}`);
      }
    }

    if (removedCount === 0) {
      this.logger.warn(`No subscriptions found for: ${subscriptionId}${uri ? `:${uri}` : ''}`);
    }

    this.emit('resource:unsubscribed', { subscriptionId, uri, count: removedCount });
  }

  /**
   * Get active subscriptions for a resource URI
   * @param {string} uri - Resource URI
   * @returns {Array} Active subscriptions
   */
  getResourceSubscriptions(uri) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.uri === uri);
  }

  /**
   * Handle resource update notifications
   * @param {string} uri - Resource URI
   * @param {object} updateData - Update data
   * @private
   */
  handleResourceUpdate(uri, updateData) {
    // Queue the update for processing
    this.resourceUpdateQueue.push({
      uri: uri,
      data: updateData,
      timestamp: Date.now()
    });

    // Process updates asynchronously to avoid blocking
    this.processResourceUpdates();
  }

  /**
   * Process queued resource updates
   * @private
   */
  async processResourceUpdates() {
    if (this.isProcessingUpdates || this.resourceUpdateQueue.length === 0) {
      return;
    }

    this.isProcessingUpdates = true;

    try {
      while (this.resourceUpdateQueue.length > 0) {
        const update = this.resourceUpdateQueue.shift();
        await this.notifyResourceSubscribers(update.uri, update.data);
      }
    } catch (error) {
      this.logger.error('Error processing resource updates', error);
    } finally {
      this.isProcessingUpdates = false;
    }
  }

  /**
   * Notify subscribers of resource updates
   * @param {string} uri - Resource URI
   * @param {object} updateData - Update data
   * @private
   */
  async notifyResourceSubscribers(uri, updateData) {
    const subscriptions = this.getResourceSubscriptions(uri);
    
    if (subscriptions.length === 0) {
      return;
    }

    this.logger.debug(`Notifying ${subscriptions.length} subscribers of resource update: ${uri}`);

    // Invalidate cache
    this.resourcesCache.delete(uri);

    // Emit update event for MCP server to handle
    this.emit('resource:updated', {
      uri: uri,
      data: updateData,
      subscriptions: subscriptions
    });
  }

  /**
   * Validate resource implements required interface
   * @param {object} resource - Resource to validate
   * @param {string} uri - Resource URI for error context
   * @private
   */
  validateResource(resource, uri) {
    const requiredMethods = ['read', 'getMetadata', 'supportsSubscriptions'];
    
    for (const method of requiredMethods) {
      if (typeof resource[method] !== 'function') {
        throw new Error(`Resource '${uri}' must implement ${method}() method`);
      }
    }

    if (!resource.constructor.name) {
      throw new Error(`Resource '${uri}' must have a constructor name`);
    }
  }

  /**
   * Check if cached data is expired
   * @param {object} cached - Cached data object
   * @returns {boolean} True if expired
   * @private
   */
  isCacheExpired(cached) {
    if (!cached.ttl) {
      return false; // No TTL means never expires
    }
    
    return (Date.now() - cached.timestamp) > cached.ttl;
  }

  /**
   * Clear all cached resources
   */
  clearCache() {
    const count = this.resourcesCache.size;
    this.resourcesCache.clear();
    this.logger.debug(`Cleared ${count} cached resources`);
  }

  /**
   * Get resource registry statistics
   * @returns {object} Statistics
   */
  getStats() {
    return {
      totalResources: this.resources.size,
      totalSubscriptions: this.subscriptions.size,
      cachedResources: this.resourcesCache.size,
      updateQueueSize: this.resourceUpdateQueue.length,
      isProcessingUpdates: this.isProcessingUpdates
    };
  }
}

module.exports = MCPResourceRegistry;