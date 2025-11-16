/**
 * Service Registry for MCP Integration
 * Provides dependency injection for MCP tools and services
 */

const { logger } = require('../utils/Logger');

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.logger = logger;
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {*} service - Service instance
   */
  register(name, service) {
    if (this.services.has(name)) {
      this.logger.warn(`Service '${String(name)}' is already registered, overwriting`);
    }
    
    this.services.set(name, service);
    this.logger.debug(`Service '${String(name)}' registered`);
  }

  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {*} Service instance or null if not found
   */
  get(name) {
    const service = this.services.get(name);
    if (!service) {
      this.logger.error(`Service '${String(name)}' not found in registry`);
    }
    return service || null;
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   * @returns {boolean} True if service was removed
   */
  unregister(name) {
    const removed = this.services.delete(name);
    if (removed) {
      this.logger.debug(`Service '${String(name)}' unregistered`);
    }
    return removed;
  }

  /**
   * Get all registered service names
   * @returns {string[]}
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services
   */
  clear() {
    const count = this.services.size;
    this.services.clear();
    this.logger.debug(`Cleared ${count} services from registry`);
  }

  /**
   * Get registry status
   * @returns {object}
   */
  getStatus() {
    return {
      serviceCount: this.services.size,
      services: this.getServiceNames()
    };
  }
}

module.exports = ServiceRegistry;