const DBGpServer = require('../../../src/debugger/DBGpServer');

// Mock all dependencies to prevent side effects
jest.mock('../../../src/utils/Logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../../src/debugger/DBGpSession', () => {
  const EventEmitter = require('events');
  return jest.fn().mockImplementation(() => {
    const mock = new EventEmitter();
    mock.initialize = jest.fn();
    mock.close = jest.fn();
    mock.getStatus = jest.fn(() => ({ isInitialized: true }));
    return mock;
  });
});

describe('DBGpServer - Simple Tests', () => {
  describe('constructor', () => {
    it('should create server with default configuration', () => {
      const server = new DBGpServer();
            
      expect(server).toBeInstanceOf(DBGpServer);
      expect(server.config.host).toBe('localhost');
      expect(server.config.port).toBe(9003);
      expect(server.config.maxConnections).toBe(10);
      expect(server.isRunning).toBe(false);
    });

    it('should create server with custom configuration', () => {
      const config = {
        host: '127.0.0.1',
        port: 9004,
        maxConnections: 5,
        sessionTimeout: 60000
      };

      const server = new DBGpServer(config);

      expect(server.config.host).toBe('127.0.0.1');
      expect(server.config.port).toBe(9004);
      expect(server.config.maxConnections).toBe(5);
      expect(server.config.sessionTimeout).toBe(60000);
    });
  });

  describe('session management', () => {
    it('should generate unique session IDs', () => {
      const server = new DBGpServer();

      const id1 = server.generateSessionId();
      const id2 = server.generateSessionId();

      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should return null for non-existent session', () => {
      const server = new DBGpServer();
      const session = server.getSession('non-existent');
      expect(session).toBeNull();
    });

    it('should return empty array when no sessions', () => {
      const server = new DBGpServer();
      const sessions = server.getAllSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when stopped', () => {
      const server = new DBGpServer({ port: 9999 });
      const status = server.getStatus();

      expect(status).toEqual({
        isRunning: false,
        host: 'localhost',
        port: 9999,
        activeSessions: 0,
        maxConnections: 10,
        address: null
      });
    });
  });
});