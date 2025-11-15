/**
 * Transaction Manager
 * Centralized transaction ID management for DBGp protocol communication
 *
 * Copyright (C) 2024 YDebug Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const { logger } = require('../utils/Logger');

/**
 * Centralized transaction ID management for DBGp protocol
 * Eliminates duplication and synchronization issues between components
 */
class TransactionManager {
  constructor() {
    this.transactionId = 0;
    this.pendingTransactions = new Map();
    this.maxTransactionId = Number.MAX_SAFE_INTEGER;
  }

  /**
     * Generate next unique transaction ID
     * @returns {number} Next transaction ID
     */
  getNext() {
    // Check for overflow before incrementing
    if (this.transactionId >= this.maxTransactionId) {
      this.transactionId = 1;
      logger.warn('Transaction ID counter reset due to overflow');
    } else {
      this.transactionId++;
    }
        
    logger.debug(`Generated transaction ID: ${this.transactionId}`);
    return this.transactionId;
  }

  /**
     * Get current transaction ID without incrementing
     * @returns {number} Current transaction ID
     */
  getCurrent() {
    return this.transactionId;
  }

  /**
     * Reset transaction ID counter
     * @param {number} startId - Starting ID (default: 0)
     */
  reset(startId = 0) {
    const oldId = this.transactionId;
    this.transactionId = startId;
    this.pendingTransactions.clear();
        
    logger.debug(`Transaction ID reset from ${oldId} to ${startId}`);
  }

  /**
     * Register a pending transaction for tracking
     * @param {number} transactionId - Transaction ID to track
     * @param {Object} context - Context information for the transaction
     */
  registerPending(transactionId, context = {}) {
    this.pendingTransactions.set(transactionId, {
      timestamp: Date.now(),
      context,
      registered: new Date().toISOString()
    });
        
    logger.debug(`Registered pending transaction ${transactionId}`, context);
  }

  /**
     * Mark transaction as completed and remove from pending
     * @param {number} transactionId - Transaction ID to complete
     * @returns {Object|null} Transaction context if found
     */
  completePending(transactionId) {
    const transaction = this.pendingTransactions.get(transactionId);
    if (transaction) {
      this.pendingTransactions.delete(transactionId);
      const duration = Date.now() - transaction.timestamp;
            
      logger.debug(`Completed transaction ${transactionId} in ${duration}ms`);
      return transaction;
    }
        
    logger.warn(`Attempted to complete unknown transaction: ${transactionId}`);
    return null;
  }

  /**
     * Get pending transaction information
     * @param {number} transactionId - Transaction ID to query
     * @returns {Object|null} Transaction info if found
     */
  getPending(transactionId) {
    return this.pendingTransactions.get(transactionId) || null;
  }

  /**
     * Get all pending transactions
     * @returns {Array} Array of pending transaction info
     */
  getAllPending() {
    return Array.from(this.pendingTransactions.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
  }

  /**
     * Clean up old pending transactions (timeout handling)
     * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
     * @returns {number} Number of transactions cleaned up
     */
  cleanupTimedOut(timeoutMs = 30000) {
    const now = Date.now();
    const timedOut = [];
        
    for (const [id, transaction] of this.pendingTransactions) {
      if (now - transaction.timestamp > timeoutMs) {
        timedOut.push(id);
      }
    }
        
    for (const id of timedOut) {
      this.pendingTransactions.delete(id);
      logger.warn(`Cleaned up timed out transaction: ${id}`);
    }
        
    if (timedOut.length > 0) {
      logger.info(`Cleaned up ${timedOut.length} timed out transactions`);
    }
        
    return timedOut.length;
  }

  /**
     * Validate transaction ID format and range
     * @param {*} transactionId - Value to validate
     * @returns {boolean} True if valid transaction ID
     */
  isValidTransactionId(transactionId) {
    return Number.isInteger(transactionId) && 
               transactionId > 0 && 
               transactionId <= this.maxTransactionId;
  }

  /**
     * Get transaction manager statistics
     * @returns {Object} Statistics about transaction usage
     */
  getStats() {
    return {
      currentId: this.transactionId,
      pendingCount: this.pendingTransactions.size,
      totalGenerated: this.transactionId, // Approximation since resets
      oldestPending: this.getOldestPending()
    };
  }

  /**
     * Get information about oldest pending transaction
     * @returns {Object|null} Oldest pending transaction info
     * @private
     */
  getOldestPending() {
    if (this.pendingTransactions.size === 0) {
      return null;
    }
        
    let oldest = null;
    let oldestTime = Number.MAX_SAFE_INTEGER;
        
    for (const [id, transaction] of this.pendingTransactions) {
      if (transaction.timestamp < oldestTime) {
        oldest = { id, ...transaction };
        oldestTime = transaction.timestamp;
      }
    }
        
    return oldest;
  }
}

// Export singleton instance for shared use
const transactionManager = new TransactionManager();

module.exports = {
  TransactionManager,
  transactionManager
};