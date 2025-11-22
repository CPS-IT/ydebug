/**
 * MCP Resources Integration Tests
 * Tests resource management, subscriptions, and data consistency with enhanced logging
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const MCPServer = require('../../../src/mcp/MCPServer');
const { Logger } = require('../../../src/utils/Logger');
const fs = require('fs');
const path = require('path');

// Create dedicated logger for resource integration testing
const resourceLogger = new Logger({
  level: Logger.LOG_LEVELS.DEBUG,
  target: 'both',
  directory: 'test/log',
  filename: 'mcp-resources-integration.log',
  category: 'mcp.resources.integration',
  format: 'json'
});

// Mock resource data provider for realistic testing
class MockResourceDataProvider {
  constructor() {
    this.debuggingSessions = new Map();
    this.executionHistory = [];
    this.variableContexts = new Map();
    this.analysisResults = new Map();
    this.subscribers = new Map();
  }

  // Debugging session resource data
  createDebuggingSession(sessionId, scriptPath) {
    const session = {
      id: sessionId,
      scriptPath,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      breakpoints: [],
      currentLine: 1,
      callStack: [
        { function: 'main', file: scriptPath, line: 1 }
      ]
    };
    
    this.debuggingSessions.set(sessionId, session);
    this.notifySubscribers('debugging-sessions', 'created', { sessionId, session });
    
    resourceLogger.debug('Mock debugging session created', { sessionId, scriptPath });
    return session;
  }

  updateDebuggingSession(sessionId, updates) {
    const session = this.debuggingSessions.get(sessionId);
    if (!session) return null;

    Object.assign(session, updates, { lastActivity: new Date().toISOString() });
    this.debuggingSessions.set(sessionId, session);
    this.notifySubscribers('debugging-sessions', 'updated', { sessionId, updates });
    
    resourceLogger.debug('Mock debugging session updated', { sessionId, updates });
    return session;
  }

  // Execution history resource data
  addExecutionStep(sessionId, stepData) {
    const historyEntry = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      timestamp: new Date().toISOString(),
      type: stepData.type || 'step',
      line: stepData.line,
      function: stepData.function || 'main',
      variables: stepData.variables || {},
      duration: stepData.duration || Math.floor(Math.random() * 100)
    };
    
    this.executionHistory.push(historyEntry);
    this.notifySubscribers('execution-history', 'added', { entry: historyEntry });
    
    resourceLogger.debug('Execution step added to history', { 
      entryId: historyEntry.id, 
      sessionId,
      type: historyEntry.type 
    });
    
    return historyEntry;
  }

  // Variable context resource data
  updateVariableContext(sessionId, contextLevel, variables) {
    const contextKey = `${sessionId}_${contextLevel}`;
    const context = {
      sessionId,
      contextLevel,
      variables,
      lastUpdated: new Date().toISOString(),
      changeCount: (this.variableContexts.get(contextKey)?.changeCount || 0) + 1
    };
    
    this.variableContexts.set(contextKey, context);
    this.notifySubscribers('variable-contexts', 'updated', { contextKey, context });
    
    resourceLogger.debug('Variable context updated', { 
      contextKey, 
      variableCount: Object.keys(variables).length,
      changeCount: context.changeCount
    });
    
    return context;
  }

  // Analysis results resource data
  storeAnalysisResult(sessionId, analysisType, result) {
    const analysisKey = `${sessionId}_${analysisType}`;
    const analysis = {
      sessionId,
      analysisType,
      result,
      generatedAt: new Date().toISOString(),
      confidence: Math.random() * 100, // Mock confidence score
      tags: ['automated', 'mcp-generated']
    };
    
    this.analysisResults.set(analysisKey, analysis);
    this.notifySubscribers('analysis-results', 'added', { analysisKey, analysis });
    
    resourceLogger.debug('Analysis result stored', { 
      analysisKey, 
      analysisType,
      confidence: analysis.confidence
    });
    
    return analysis;
  }

  // Subscription management
  subscribe(resourceType, subscriberId, callback) {
    if (!this.subscribers.has(resourceType)) {
      this.subscribers.set(resourceType, new Map());
    }
    
    this.subscribers.get(resourceType).set(subscriberId, callback);
    
    resourceLogger.debug('Resource subscription added', { 
      resourceType, 
      subscriberId,
      totalSubscribers: this.subscribers.get(resourceType).size
    });
  }

  unsubscribe(resourceType, subscriberId) {
    const resourceSubscribers = this.subscribers.get(resourceType);
    if (resourceSubscribers) {
      const removed = resourceSubscribers.delete(subscriberId);
      
      resourceLogger.debug('Resource subscription removed', { 
        resourceType, 
        subscriberId, 
        removed,
        remainingSubscribers: resourceSubscribers.size
      });
      
      return removed;
    }
    return false;
  }

  notifySubscribers(resourceType, eventType, data) {
    const resourceSubscribers = this.subscribers.get(resourceType);
    if (!resourceSubscribers) return;

    let notificationCount = 0;
    resourceSubscribers.forEach((callback, subscriberId) => {
      try {
        callback(eventType, data);
        notificationCount++;
      } catch (error) {
        resourceLogger.error('Error notifying subscriber', { 
          subscriberId, 
          resourceType, 
          error: error.message 
        });
      }
    });
    
    resourceLogger.debug('Subscribers notified', { 
      resourceType, 
      eventType, 
      notificationCount 
    });
  }

  // Data retrieval methods
  getAllDebuggingSessions() {
    return Array.from(this.debuggingSessions.values());
  }

  getExecutionHistory(sessionId = null, limit = 50) {
    let history = this.executionHistory;
    if (sessionId) {
      history = history.filter(entry => entry.sessionId === sessionId);
    }
    return history.slice(-limit);
  }

  getVariableContexts(sessionId = null) {
    if (sessionId) {
      const contexts = [];
      this.variableContexts.forEach((context, _key) => {
        if (context.sessionId === sessionId) {
          contexts.push(context);
        }
      });
      return contexts;
    }
    return Array.from(this.variableContexts.values());
  }

  getAnalysisResults(sessionId = null, analysisType = null) {
    let results = Array.from(this.analysisResults.values());
    
    if (sessionId) {
      results = results.filter(result => result.sessionId === sessionId);
    }
    
    if (analysisType) {
      results = results.filter(result => result.analysisType === analysisType);
    }
    
    return results;
  }

  getResourceStats() {
    return {
      debuggingSessions: this.debuggingSessions.size,
      executionHistory: this.executionHistory.length,
      variableContexts: this.variableContexts.size,
      analysisResults: this.analysisResults.size,
      activeSubscribers: Array.from(this.subscribers.entries()).reduce(
        (total, [_, subs]) => total + subs.size, 0
      )
    };
  }

  // Cleanup methods
  clearSession(sessionId) {
    const session = this.debuggingSessions.get(sessionId);
    if (!session) return false;

    // Remove session
    this.debuggingSessions.delete(sessionId);
    
    // Remove related execution history
    this.executionHistory = this.executionHistory.filter(
      entry => entry.sessionId !== sessionId
    );
    
    // Remove related variable contexts
    Array.from(this.variableContexts.keys()).forEach(key => {
      if (key.startsWith(`${sessionId}_`)) {
        this.variableContexts.delete(key);
      }
    });
    
    // Remove related analysis results
    Array.from(this.analysisResults.keys()).forEach(key => {
      if (key.startsWith(`${sessionId}_`)) {
        this.analysisResults.delete(key);
      }
    });
    
    this.notifySubscribers('debugging-sessions', 'deleted', { sessionId });
    
    resourceLogger.info('Session resources cleared', { sessionId });
    return true;
  }
}

describe('MCP Resources Integration Tests', () => {
  let server;
  let mockDataProvider;
  let testSubscriptions;

  beforeAll(async () => {
    // Ensure test log directory exists
    await fs.promises.mkdir('test/log', { recursive: true });
    
    // Clear existing resource test logs
    const testLogPath = path.join('test/log', 'mcp-resources-integration.log');
    try {
      await fs.promises.unlink(testLogPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  beforeEach(async () => {
    server = new MCPServer({ debug: true });
    mockDataProvider = new MockResourceDataProvider();
    testSubscriptions = [];

    resourceLogger.info('Starting MCP resources integration test', {
      testName: expect.getState().currentTestName
    });
  });

  afterEach(async () => {
    // Clean up subscriptions
    testSubscriptions.forEach(({ resourceType, subscriberId }) => {
      mockDataProvider.unsubscribe(resourceType, subscriberId);
    });
    testSubscriptions = [];

    try {
      if (server && server.isRunning) {
        await server.stop();
      }
    } catch (error) {
      resourceLogger.error('Error stopping server in resource test cleanup', { 
        error: error.message 
      });
    }

    resourceLogger.info('Completed MCP resources integration test', {
      testName: expect.getState().currentTestName,
      subscriptionsCleaned: true
    });

    await new Promise(resolve => setImmediate(resolve));
  });

  afterAll(async () => {
    // Clean up test artifacts
    try {
      const testDir = 'test';
      if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
        resourceLogger.debug('Cleaned up test directory');
      }
    } catch (error) {
      resourceLogger.warn('Failed to clean up test directory', { error: error.message });
    }
  });

  describe('Resource Data Management', () => {
    test('should manage debugging session resources with proper lifecycle', async () => {
      resourceLogger.info('Testing debugging session resource lifecycle');

      await server.initialize();
      await server.start();

      // Create debugging sessions
      const sessions = [
        { id: 'session_001', script: '/app/test1.php' },
        { id: 'session_002', script: '/app/test2.php' },
        { id: 'session_003', script: '/app/test3.php' }
      ];

      const createdSessions = sessions.map(({ id, script }) => 
        mockDataProvider.createDebuggingSession(id, script)
      );

      expect(createdSessions).toHaveLength(3);
      createdSessions.forEach((session, index) => {
        expect(session.id).toBe(sessions[index].id);
        expect(session.status).toBe('active');
        expect(session.createdAt).toBeDefined();
      });

      resourceLogger.debug('Debugging sessions created', { 
        sessionCount: createdSessions.length 
      });

      // Update sessions with debugging progress
      const updates = [
        { currentLine: 15, status: 'paused' },
        { currentLine: 8, status: 'running' },
        { currentLine: 23, status: 'paused' }
      ];

      const updatedSessions = sessions.map(({ id }, index) => 
        mockDataProvider.updateDebuggingSession(id, updates[index])
      );

      updatedSessions.forEach((session, index) => {
        expect(session.currentLine).toBe(updates[index].currentLine);
        expect(session.status).toBe(updates[index].status);
        expect(session.lastActivity).toBeDefined();
      });

      resourceLogger.debug('Debugging sessions updated', { 
        updateCount: updatedSessions.length 
      });

      // Verify resource retrieval
      const allSessions = mockDataProvider.getAllDebuggingSessions();
      expect(allSessions).toHaveLength(3);
      allSessions.forEach(session => {
        expect(session.id).toBeDefined();
        expect(session.scriptPath).toBeDefined();
        expect(session.lastActivity).toBeDefined();
      });

      // Clean up sessions
      const cleanupResults = sessions.map(({ id }) => 
        mockDataProvider.clearSession(id)
      );

      expect(cleanupResults.every(result => result === true)).toBe(true);
      expect(mockDataProvider.getAllDebuggingSessions()).toHaveLength(0);

      resourceLogger.info('Debugging session resource lifecycle test passed', {
        sessionsCreated: createdSessions.length,
        sessionsUpdated: updatedSessions.length,
        sessionsCleanedUp: cleanupResults.length
      });
    });

    test('should track execution history with detailed timestamping', async () => {
      resourceLogger.info('Testing execution history resource tracking');

      await server.initialize();
      await server.start();

      const sessionId = 'history_test_session';
      mockDataProvider.createDebuggingSession(sessionId, '/app/history_test.php');

      // Generate execution history
      const executionSteps = [
        { type: 'step_into', line: 5, function: 'main', variables: { '$var1': 'value1' } },
        { type: 'step_over', line: 6, function: 'main', variables: { '$var1': 'value1', '$var2': 42 } },
        { type: 'step_into', line: 10, function: 'testFunction', variables: { '$param': 'test' } },
        { type: 'step_out', line: 7, function: 'main', variables: { '$result': 'function_result' } },
        { type: 'continue', line: 15, function: 'main', variables: { '$final': true } }
      ];

      const historyEntries = executionSteps.map(step => 
        mockDataProvider.addExecutionStep(sessionId, step)
      );

      expect(historyEntries).toHaveLength(5);
      historyEntries.forEach((entry, index) => {
        expect(entry.id).toBeDefined();
        expect(entry.sessionId).toBe(sessionId);
        expect(entry.type).toBe(executionSteps[index].type);
        expect(entry.line).toBe(executionSteps[index].line);
        expect(entry.timestamp).toBeDefined();
        expect(entry.duration).toBeDefined();
      });

      resourceLogger.debug('Execution history entries created', { 
        entryCount: historyEntries.length,
        entryIds: historyEntries.map(e => e.id)
      });

      // Retrieve and validate history
      const sessionHistory = mockDataProvider.getExecutionHistory(sessionId);
      expect(sessionHistory).toHaveLength(5);

      const allHistory = mockDataProvider.getExecutionHistory(null, 10);
      expect(allHistory.length).toBeGreaterThanOrEqual(5);

      // Verify chronological order
      for (let i = 1; i < sessionHistory.length; i++) {
        const prevTime = new Date(sessionHistory[i-1].timestamp);
        const currTime = new Date(sessionHistory[i].timestamp);
        expect(currTime >= prevTime).toBe(true);
      }

      resourceLogger.info('Execution history tracking test passed', {
        historyEntriesGenerated: historyEntries.length,
        chronologicalOrder: true
      });
    });

    test('should manage variable contexts with change tracking', async () => {
      resourceLogger.info('Testing variable context resource management');

      await server.initialize();
      await server.start();

      const sessionId = 'context_test_session';
      mockDataProvider.createDebuggingSession(sessionId, '/app/context_test.php');

      // Create variable contexts at different levels
      const contextData = [
        { level: 0, variables: { '$global1': 'value1', '$global2': 42 } },
        { level: 1, variables: { '$local1': 'local_value', '$param1': 'param_value' } },
        { level: 2, variables: { '$nested1': [1, 2, 3], '$nested2': { key: 'value' } } }
      ];

      const contexts = contextData.map(({ level, variables }) => 
        mockDataProvider.updateVariableContext(sessionId, level, variables)
      );

      expect(contexts).toHaveLength(3);
      contexts.forEach((context, index) => {
        expect(context.sessionId).toBe(sessionId);
        expect(context.contextLevel).toBe(contextData[index].level);
        expect(context.changeCount).toBe(1);
        expect(context.lastUpdated).toBeDefined();
      });

      resourceLogger.debug('Variable contexts created', { 
        contextCount: contexts.length 
      });

      // Update contexts to test change tracking
      const updatedContexts = contextData.map(({ level, variables }) => {
        const updatedVars = { ...variables, '$newVar': 'added_value' };
        return mockDataProvider.updateVariableContext(sessionId, level, updatedVars);
      });

      updatedContexts.forEach(context => {
        expect(context.changeCount).toBe(2); // Should increment
        expect(context.variables.$newVar).toBe('added_value');
      });

      resourceLogger.debug('Variable contexts updated', { 
        updateCount: updatedContexts.length 
      });

      // Retrieve contexts
      const sessionContexts = mockDataProvider.getVariableContexts(sessionId);
      expect(sessionContexts).toHaveLength(3);

      const allContexts = mockDataProvider.getVariableContexts();
      expect(allContexts.length).toBeGreaterThanOrEqual(3);

      resourceLogger.info('Variable context management test passed', {
        contextsManaged: contexts.length,
        changesTracked: updatedContexts.length
      });
    });
  });

  describe('Resource Subscriptions and Updates', () => {
    test('should handle resource subscriptions and real-time updates', async () => {
      resourceLogger.info('Testing resource subscription and update system');

      await server.initialize();
      await server.start();

      const notifications = [];
      const subscriberId = 'test_subscriber_001';

      // Subscribe to different resource types
      const resourceTypes = ['debugging-sessions', 'execution-history', 'variable-contexts'];
      
      resourceTypes.forEach(resourceType => {
        mockDataProvider.subscribe(resourceType, subscriberId, (eventType, data) => {
          notifications.push({ resourceType, eventType, data, timestamp: new Date().toISOString() });
        });
        
        testSubscriptions.push({ resourceType, subscriberId });
      });

      resourceLogger.debug('Subscriptions established', { 
        resourceTypes, 
        subscriberId 
      });

      // Trigger resource changes that should generate notifications
      const sessionId = 'subscription_test_session';
      const mockSession = mockDataProvider.createDebuggingSession(sessionId, '/app/sub_test.php');
      
      mockDataProvider.addExecutionStep(sessionId, { 
        type: 'step_over', 
        line: 5, 
        variables: { '$test': 'value' } 
      });
      
      mockDataProvider.updateVariableContext(sessionId, 0, { '$var1': 'updated' });
      
      mockDataProvider.updateDebuggingSession(sessionId, { status: 'paused', currentLine: 10 });

      // Allow notifications to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(notifications.length).toBeGreaterThan(0);
      
      const sessionNotifications = notifications.filter(n => n.resourceType === 'debugging-sessions');
      const historyNotifications = notifications.filter(n => n.resourceType === 'execution-history');
      const contextNotifications = notifications.filter(n => n.resourceType === 'variable-contexts');

      expect(sessionNotifications.length).toBeGreaterThanOrEqual(2); // created + updated
      expect(historyNotifications.length).toBeGreaterThanOrEqual(1); // added
      expect(contextNotifications.length).toBeGreaterThanOrEqual(1); // updated

      resourceLogger.debug('Notifications received', {
        totalNotifications: notifications.length,
        sessionNotifications: sessionNotifications.length,
        historyNotifications: historyNotifications.length,
        contextNotifications: contextNotifications.length
      });

      // Verify notification structure
      notifications.forEach(notification => {
        expect(notification.resourceType).toBeDefined();
        expect(notification.eventType).toBeDefined();
        expect(notification.data).toBeDefined();
        expect(notification.timestamp).toBeDefined();
      });

      // Test unsubscription
      const unsubscribeResults = resourceTypes.map(resourceType => 
        mockDataProvider.unsubscribe(resourceType, subscriberId)
      );
      
      expect(unsubscribeResults.every(result => result === true)).toBe(true);

      resourceLogger.info('Resource subscription test passed', {
        subscriptionsCreated: resourceTypes.length,
        notificationsReceived: notifications.length,
        unsubscriptionsSuccessful: unsubscribeResults.length
      });
    });

    test('should maintain resource data consistency during concurrent operations', async () => {
      resourceLogger.info('Testing resource data consistency under concurrent operations');

      await server.initialize();
      await server.start();

      const sessionId = 'consistency_test_session';
      mockDataProvider.createDebuggingSession(sessionId, '/app/consistency_test.php');

      // Perform concurrent operations
      const concurrentOperations = [];
      const operationCount = 20;

      for (let i = 0; i < operationCount; i++) {
        // Variable context updates
        concurrentOperations.push(
          mockDataProvider.updateVariableContext(sessionId, 0, { [`$var${i}`]: `value${i}` })
        );
        
        // Execution history additions
        concurrentOperations.push(
          mockDataProvider.addExecutionStep(sessionId, { 
            type: 'step_over', 
            line: i + 5,
            variables: { [`$step${i}`]: i }
          })
        );
        
        // Analysis result storage
        if (i % 5 === 0) {
          concurrentOperations.push(
            mockDataProvider.storeAnalysisResult(sessionId, 'variable_analysis', {
              analysis: `Analysis ${i}`,
              variables: [`$var${i}`]
            })
          );
        }
      }

      // Wait for all operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify data consistency
      const sessionHistory = mockDataProvider.getExecutionHistory(sessionId);
      const sessionContexts = mockDataProvider.getVariableContexts(sessionId);
      const sessionAnalysis = mockDataProvider.getAnalysisResults(sessionId);

      expect(sessionHistory.length).toBeGreaterThanOrEqual(operationCount);
      expect(sessionContexts.length).toBeGreaterThan(0);
      expect(sessionAnalysis.length).toBeGreaterThan(0);

      // Verify no data corruption
      sessionHistory.forEach(entry => {
        expect(entry.sessionId).toBe(sessionId);
        expect(entry.timestamp).toBeDefined();
        expect(entry.line).toBeGreaterThan(0);
      });

      sessionContexts.forEach(context => {
        expect(context.sessionId).toBe(sessionId);
        expect(context.lastUpdated).toBeDefined();
        expect(typeof context.changeCount).toBe('number');
      });

      const resourceStats = mockDataProvider.getResourceStats();
      expect(resourceStats.debuggingSessions).toBeGreaterThan(0);
      expect(resourceStats.executionHistory).toBeGreaterThan(0);
      expect(resourceStats.variableContexts).toBeGreaterThan(0);

      resourceLogger.info('Resource data consistency test passed', {
        concurrentOperations: concurrentOperations.length,
        historyEntries: sessionHistory.length,
        contextEntries: sessionContexts.length,
        analysisEntries: sessionAnalysis.length,
        dataConsistent: true
      });
    });
  });

  describe('Resource Performance and Memory Management', () => {
    test('should handle large resource datasets efficiently', async () => {
      resourceLogger.info('Testing resource performance with large datasets');

      const startTime = process.hrtime.bigint();
      
      await server.initialize();
      await server.start();

      // Create multiple sessions with extensive data
      const sessionCount = 10;
      const sessions = [];

      for (let i = 0; i < sessionCount; i++) {
        const sessionId = `perf_session_${i}`;
        sessions.push(sessionId);
        
        mockDataProvider.createDebuggingSession(sessionId, `/app/perf_test_${i}.php`);
        
        // Add extensive execution history
        for (let j = 0; j < 100; j++) {
          mockDataProvider.addExecutionStep(sessionId, {
            type: 'step_over',
            line: j + 1,
            function: `function_${j % 10}`,
            variables: { [`$var${j}`]: `value${j}`, [`$data${j}`]: j * 2 }
          });
        }
        
        // Create multiple variable contexts
        for (let k = 0; k < 5; k++) {
          const variables = {};
          for (let l = 0; l < 20; l++) {
            variables[`$ctx${k}_var${l}`] = `context_${k}_value_${l}`;
          }
          mockDataProvider.updateVariableContext(sessionId, k, variables);
        }
        
        // Store analysis results
        for (let m = 0; m < 10; m++) {
          mockDataProvider.storeAnalysisResult(sessionId, `analysis_type_${m}`, {
            analysis: `Large analysis result ${m}`,
            data: Array.from({ length: 50 }, (_, idx) => `result_item_${idx}`),
            metadata: { session: sessionId, iteration: m }
          });
        }
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // Verify data integrity and performance
      const finalStats = mockDataProvider.getResourceStats();
      expect(finalStats.debuggingSessions).toBe(sessionCount);
      expect(finalStats.executionHistory).toBe(sessionCount * 100);
      expect(finalStats.variableContexts).toBe(sessionCount * 5);
      expect(finalStats.analysisResults).toBe(sessionCount * 10);

      // Performance should be reasonable
      expect(duration).toBeLessThan(10000); // Less than 10 seconds

      // Test data retrieval performance
      const retrievalStartTime = process.hrtime.bigint();
      
      sessions.forEach(sessionId => {
        mockDataProvider.getExecutionHistory(sessionId, 50);
        mockDataProvider.getVariableContexts(sessionId);
        mockDataProvider.getAnalysisResults(sessionId);
      });
      
      const retrievalEndTime = process.hrtime.bigint();
      const retrievalDuration = Number(retrievalEndTime - retrievalStartTime) / 1000000;

      expect(retrievalDuration).toBeLessThan(5000); // Less than 5 seconds

      resourceLogger.info('Resource performance test completed', {
        sessionsCreated: sessionCount,
        totalExecutionHistory: finalStats.executionHistory,
        totalVariableContexts: finalStats.variableContexts,
        totalAnalysisResults: finalStats.analysisResults,
        creationDuration: `${duration}ms`,
        retrievalDuration: `${retrievalDuration}ms`,
        performanceAcceptable: duration < 10000 && retrievalDuration < 5000
      });

      // Clean up large dataset
      const cleanupStartTime = process.hrtime.bigint();
      sessions.forEach(sessionId => mockDataProvider.clearSession(sessionId));
      const cleanupEndTime = process.hrtime.bigint();
      const cleanupDuration = Number(cleanupEndTime - cleanupStartTime) / 1000000;

      expect(mockDataProvider.getResourceStats().debuggingSessions).toBe(0);
      expect(cleanupDuration).toBeLessThan(2000); // Less than 2 seconds

      resourceLogger.info('Resource cleanup completed', {
        cleanupDuration: `${cleanupDuration}ms`,
        cleanupEfficient: cleanupDuration < 2000
      });
    });
  });
});