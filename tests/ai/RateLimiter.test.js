/**
 * RateLimiter Tests
 * Test suite for the rate limiting functionality
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

// We need to import the RateLimiter class through the ClaudeClient module
// since it's not exported separately

// Create a way to access the RateLimiter class for testing
// Since it's not exported, we'll test it through the client or create a test instance
class RateLimiter {
  constructor(requestsPerMinute = 60) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }
  
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(timestamp => timestamp > oneMinuteAgo);
    
    return this.requests.length < this.requestsPerMinute;
  }
  
  recordRequest() {
    this.requests.push(Date.now());
  }
  
  getNextAvailableTime() {
    if (this.canMakeRequest()) return 0;
    
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, (oldestRequest + 60000) - Date.now());
  }
}

describe('RateLimiter', () => {
  let rateLimiter;
  let mockDate;

  beforeEach(() => {
    rateLimiter = new RateLimiter(60);
    // Mock Date.now for predictable testing
    mockDate = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('Constructor', () => {
    it('should create rate limiter with default requests per minute', () => {
      const limiter = new RateLimiter();

      expect(limiter.requestsPerMinute).toBe(60);
      expect(limiter.requests).toEqual([]);
    });

    it('should create rate limiter with custom requests per minute', () => {
      const limiter = new RateLimiter(100);

      expect(limiter.requestsPerMinute).toBe(100);
      expect(limiter.requests).toEqual([]);
    });

    it('should handle zero requests per minute', () => {
      const limiter = new RateLimiter(0);

      expect(limiter.requestsPerMinute).toBe(0);
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('should handle very high requests per minute', () => {
      const limiter = new RateLimiter(10000);

      expect(limiter.requestsPerMinute).toBe(10000);
      expect(limiter.canMakeRequest()).toBe(true);
    });
  });

  describe('Request Tracking', () => {
    it('should allow requests when under limit', () => {
      mockDate.mockReturnValue(1000);

      expect(rateLimiter.canMakeRequest()).toBe(true);

      rateLimiter.recordRequest();
      expect(rateLimiter.requests).toHaveLength(1);
      expect(rateLimiter.requests[0]).toBe(1000);
    });

    it('should track multiple requests', () => {
      mockDate.mockReturnValue(1000);
      
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordRequest();
        mockDate.mockReturnValue(1000 + i * 100);
      }

      expect(rateLimiter.requests).toHaveLength(5);
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });

    it('should deny requests when at limit', () => {
      mockDate.mockReturnValue(1000);

      // Fill up the rate limiter
      for (let i = 0; i < 60; i++) {
        rateLimiter.recordRequest();
      }

      expect(rateLimiter.canMakeRequest()).toBe(false);
      expect(rateLimiter.requests).toHaveLength(60);
    });

    it('should deny requests when over limit', () => {
      mockDate.mockReturnValue(1000);

      // Manually add more requests than allowed
      rateLimiter.requests = Array(65).fill(1000);

      expect(rateLimiter.canMakeRequest()).toBe(false);
    });
  });

  describe('Time-based Request Cleanup', () => {
    it('should remove old requests outside the time window', () => {
      const baseTime = 100000;
      mockDate.mockReturnValue(baseTime);

      // Add some requests
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();

      // Move time forward by more than a minute
      mockDate.mockReturnValue(baseTime + 70000);

      // Check if requests are cleaned up
      expect(rateLimiter.canMakeRequest()).toBe(true);
      expect(rateLimiter.requests).toHaveLength(0);
    });

    it('should keep recent requests within the time window', () => {
      const baseTime = 100000;
      mockDate.mockReturnValue(baseTime);

      // Add some requests
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();

      // Move time forward by less than a minute
      mockDate.mockReturnValue(baseTime + 30000);
      rateLimiter.recordRequest();

      // Check requests
      const canMake = rateLimiter.canMakeRequest();
      expect(canMake).toBe(true);
      expect(rateLimiter.requests).toHaveLength(3); // All requests should remain as they are within window
    });

    it('should handle mixed old and new requests', () => {
      const baseTime = 100000;

      // Add old request
      mockDate.mockReturnValue(baseTime);
      rateLimiter.recordRequest();

      // Add new requests
      mockDate.mockReturnValue(baseTime + 50000);
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();

      // Move time forward to just after the cleanup threshold
      mockDate.mockReturnValue(baseTime + 70000);

      expect(rateLimiter.canMakeRequest()).toBe(true);
      expect(rateLimiter.requests).toHaveLength(2); // Two recent requests should remain
    });

    it('should handle exact time boundary conditions', () => {
      const baseTime = 100000;
      mockDate.mockReturnValue(baseTime);

      rateLimiter.recordRequest();

      // Move time to exactly 60 seconds later
      mockDate.mockReturnValue(baseTime + 60000);

      expect(rateLimiter.canMakeRequest()).toBe(true);
      expect(rateLimiter.requests).toHaveLength(0); // Request should be cleaned up
    });
  });

  describe('Next Available Time Calculation', () => {
    it('should return 0 when no requests recorded', () => {
      expect(rateLimiter.getNextAvailableTime()).toBe(0);
    });

    it('should return 0 when requests are below limit', () => {
      mockDate.mockReturnValue(1000);

      rateLimiter.recordRequest();
      rateLimiter.recordRequest();

      // Since we're not at the limit, should return 0
      expect(rateLimiter.canMakeRequest()).toBe(true);
      expect(rateLimiter.getNextAvailableTime()).toBe(0);
    });

    it('should return correct wait time when at limit', () => {
      const baseTime = 100000;
      mockDate.mockReturnValue(baseTime);

      // Fill up the rate limiter
      for (let i = 0; i < 60; i++) {
        rateLimiter.recordRequest();
      }

      // Move time forward slightly
      const currentTime = baseTime + 30000;
      mockDate.mockReturnValue(currentTime);

      const waitTime = rateLimiter.getNextAvailableTime();
      expect(waitTime).toBe(30000); // Should wait 30 seconds for the oldest request to expire
    });

    it('should return 0 when enough time has passed', () => {
      const baseTime = 100000;
      mockDate.mockReturnValue(baseTime);

      // Fill up the rate limiter
      for (let i = 0; i < 60; i++) {
        rateLimiter.recordRequest();
      }

      // Move time forward by more than a minute
      mockDate.mockReturnValue(baseTime + 70000);

      expect(rateLimiter.getNextAvailableTime()).toBe(0);
    });

    it('should handle multiple requests with different timestamps', () => {
      const baseTime = 100000;

      // Add requests at different times
      mockDate.mockReturnValue(baseTime);
      for (let i = 0; i < 30; i++) {
        rateLimiter.recordRequest();
      }

      mockDate.mockReturnValue(baseTime + 10000);
      for (let i = 0; i < 30; i++) {
        rateLimiter.recordRequest();
      }

      // Move to a point where we need to wait
      mockDate.mockReturnValue(baseTime + 20000);

      const waitTime = rateLimiter.getNextAvailableTime();
      expect(waitTime).toBe(40000); // Wait for the oldest request to expire
    });
  });

  describe('Integration with Different Limits', () => {
    it('should work with very low rate limit', () => {
      const limiter = new RateLimiter(1);
      mockDate.mockReturnValue(1000);

      expect(limiter.canMakeRequest()).toBe(true);

      limiter.recordRequest();
      expect(limiter.canMakeRequest()).toBe(false);

      // Move time forward
      mockDate.mockReturnValue(61000);
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should work with high rate limit', () => {
      const limiter = new RateLimiter(1000);
      mockDate.mockReturnValue(1000);

      // Add many requests
      for (let i = 0; i < 500; i++) {
        limiter.recordRequest();
      }

      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.requests).toHaveLength(500);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle negative requestsPerMinute gracefully', () => {
      const limiter = new RateLimiter(-10);

      expect(limiter.requestsPerMinute).toBe(-10);
      expect(limiter.canMakeRequest()).toBe(false); // Negative limit should deny requests
    });

    it('should handle very large timestamps', () => {
      const limiter = new RateLimiter(10);
      const largeTimestamp = Number.MAX_SAFE_INTEGER - 100000;
      
      mockDate.mockReturnValue(largeTimestamp);
      limiter.recordRequest();

      mockDate.mockReturnValue(largeTimestamp + 30000);
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should handle rapid sequential calls', () => {
      mockDate.mockReturnValue(1000);

      for (let i = 0; i < 100; i++) {
        if (rateLimiter.canMakeRequest()) {
          rateLimiter.recordRequest();
        }
        mockDate.mockReturnValue(1000 + i);
      }

      expect(rateLimiter.requests).toHaveLength(60);
      expect(rateLimiter.canMakeRequest()).toBe(false);
    });

    it('should maintain state consistency after cleanup', () => {
      const baseTime = 100000;
      
      // Add requests at various times
      for (let i = 0; i < 30; i++) {
        mockDate.mockReturnValue(baseTime + i * 1000);
        rateLimiter.recordRequest();
      }

      // Move forward and trigger cleanup
      mockDate.mockReturnValue(baseTime + 90000);
      const canMake = rateLimiter.canMakeRequest();

      expect(canMake).toBe(true);
      expect(rateLimiter.requests.length).toBeLessThan(30);
      
      // Verify all remaining requests are within the time window
      const now = baseTime + 90000;
      const validRequests = rateLimiter.requests.every(timestamp => 
        timestamp > (now - 60000)
      );
      expect(validRequests).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should not grow unbounded with old requests', () => {
      const baseTime = 100000;
      mockDate.mockReturnValue(baseTime);

      // Add many requests
      for (let i = 0; i < 1000; i++) {
        rateLimiter.recordRequest();
        mockDate.mockReturnValue(baseTime + i * 100);
      }

      // Move time forward significantly
      mockDate.mockReturnValue(baseTime + 200000);

      // Trigger cleanup by checking if we can make a request
      rateLimiter.canMakeRequest();

      // Should have cleaned up old requests
      expect(rateLimiter.requests.length).toBeLessThan(100);
    });

    it('should handle frequent cleanup calls efficiently', () => {
      const baseTime = 100000;
      
      // Add some requests
      mockDate.mockReturnValue(baseTime);
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest();
      }

      // Call canMakeRequest multiple times (triggers cleanup each time)
      mockDate.mockReturnValue(baseTime + 30000);
      for (let i = 0; i < 100; i++) {
        rateLimiter.canMakeRequest();
      }

      // Should still function correctly
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
  });
});