/**
 * Transaction Manager Tests
 * Tests for centralized transaction ID management
 */

const { TransactionManager, transactionManager } = require('../../src/debugger/TransactionManager');

describe('TransactionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new TransactionManager();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(manager.transactionId).toBe(0);
      expect(manager.pendingTransactions.size).toBe(0);
    });
  });

  describe('Transaction ID Generation', () => {
    test('should increment transaction ID', () => {
      expect(manager.getNext()).toBe(1);
      expect(manager.getNext()).toBe(2);
      expect(manager.getNext()).toBe(3);
    });

    test('should return current ID without incrementing', () => {
      manager.getNext();
      expect(manager.getCurrent()).toBe(1);
      expect(manager.getCurrent()).toBe(1); // Should not increment
    });

    test('should reset transaction counter', () => {
      manager.getNext();
      manager.getNext();
      manager.reset();
      expect(manager.getCurrent()).toBe(0);
      expect(manager.getNext()).toBe(1);
    });

    test('should reset to custom start ID', () => {
      manager.reset(100);
      expect(manager.getCurrent()).toBe(100);
      expect(manager.getNext()).toBe(101);
    });
  });

  describe('Pending Transaction Management', () => {
    test('should register and complete pending transactions', () => {
      const context = { command: 'status' };
      manager.registerPending(1, context);

      expect(manager.getPending(1)).toEqual(expect.objectContaining({
        context,
        timestamp: expect.any(Number)
      }));

      const completed = manager.completePending(1);
      expect(completed).toEqual(expect.objectContaining({
        context,
        timestamp: expect.any(Number)
      }));

      expect(manager.getPending(1)).toBe(null);
    });

    test('should return null for unknown transaction completion', () => {
      const result = manager.completePending(999);
      expect(result).toBe(null);
    });

    test('should get all pending transactions', () => {
      manager.registerPending(1, { command: 'status' });
      manager.registerPending(2, { command: 'feature_get' });

      const pending = manager.getAllPending();
      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe(1);
      expect(pending[1].id).toBe(2);
    });

    test('should clean up timed out transactions', () => {
      manager.registerPending(1, { command: 'status' });
      manager.registerPending(2, { command: 'feature_get' });

      // Mock old timestamp for one transaction
      const transaction = manager.pendingTransactions.get(1);
      transaction.timestamp = Date.now() - 35000; // 35 seconds ago

      const cleaned = manager.cleanupTimedOut(30000); // 30 second timeout
      expect(cleaned).toBe(1);
      expect(manager.getPending(1)).toBe(null);
      expect(manager.getPending(2)).not.toBe(null);
    });
  });

  describe('Transaction ID Validation', () => {
    test('should validate valid transaction IDs', () => {
      expect(manager.isValidTransactionId(1)).toBe(true);
      expect(manager.isValidTransactionId(100)).toBe(true);
      expect(manager.isValidTransactionId(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    test('should reject invalid transaction IDs', () => {
      expect(manager.isValidTransactionId(0)).toBe(false);
      expect(manager.isValidTransactionId(-1)).toBe(false);
      expect(manager.isValidTransactionId('1')).toBe(false);
      expect(manager.isValidTransactionId(null)).toBe(false);
      expect(manager.isValidTransactionId(1.5)).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should provide transaction statistics', () => {
      manager.getNext();
      manager.getNext();
      manager.registerPending(1, { command: 'status' });

      const stats = manager.getStats();
      expect(stats.currentId).toBe(2);
      expect(stats.pendingCount).toBe(1);
      expect(stats.totalGenerated).toBe(2);
    });

    test('should track oldest pending transaction', (done) => {
      const now = Date.now();

      manager.registerPending(1, { command: 'status' });
      // Simulate time passing
      setTimeout(() => {
        manager.registerPending(2, { command: 'feature_get' });

        const stats = manager.getStats();
        expect(stats.oldestPending.id).toBe(1);
        expect(stats.oldestPending.timestamp).toBeLessThanOrEqual(now + 10);
        done(); // Signal that the test is complete
      }, 10);
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton instance', () => {
      expect(transactionManager).toBeInstanceOf(TransactionManager);
    });

    test('should maintain state across imports', () => {
      transactionManager.getNext();
      expect(transactionManager.getCurrent()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle transaction ID overflow', () => {
      manager.transactionId = Number.MAX_SAFE_INTEGER - 1;

      const id1 = manager.getNext();
      expect(id1).toBe(Number.MAX_SAFE_INTEGER);

      const id2 = manager.getNext();
      expect(id2).toBe(1); // Should reset to 1
    });

    test('should clear pending transactions on reset', () => {
      manager.registerPending(1, { command: 'status' });
      manager.reset();
      expect(manager.getAllPending()).toHaveLength(0);
    });
  });
});
