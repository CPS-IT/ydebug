const net = require('net');
const EventEmitter = require('events');
const { XMLParser } = require('fast-xml-parser');

const { logger } = require('../utils/Logger');
const DBGpError = require('./errors/DBGpError');
const DBGpConnectionError = require('./errors/DBGpConnectionError');
const DBGpSession = require('./DBGpSession');

class DBGpServer extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 9003,
            maxConnections: config.maxConnections || 10,
            sessionTimeout: config.sessionTimeout || 300000, // 5 minutes
            ...config
        };
        
        this.logger = logger;
        this.server = null;
        this.sessions = new Map();
        this.isRunning = false;
        
        // XML parser for DBGp messages
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
            parseAttributeValue: true
        });
        
        // Bind methods to preserve context
        this.handleConnection = this.handleConnection.bind(this);
        this.handleServerError = this.handleServerError.bind(this);
        this.shutdown = this.shutdown.bind(this);
    }
    
    /**
     * Start the DBGp server
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning) {
            throw new DBGpError('Server is already running');
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.server = net.createServer();
                
                // Configure server options
                this.server.maxConnections = this.config.maxConnections;
                
                // Set up event handlers
                this.server.on('connection', this.handleConnection);
                this.server.on('error', this.handleServerError);
                this.server.on('close', () => {
                    this.logger.info('DBGp server closed');
                    this.isRunning = false;
                    this.emit('close');
                });
                
                // Start listening
                this.server.listen(this.config.port, this.config.host, () => {
                    this.isRunning = true;
                    const address = this.server.address();
                    this.logger.info(`DBGp server listening on ${address.address}:${address.port}`);
                    this.emit('listening', address);
                    resolve();
                });
                
            } catch (error) {
                reject(new DBGpConnectionError('Failed to start server', { 
                    originalError: error,
                    host: this.config.host,
                    port: this.config.port
                }));
            }
        });
    }
    
    /**
     * Stop the DBGp server
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.isRunning || !this.server) {
            return;
        }
        
        return new Promise((resolve) => {
            // Close all active sessions
            for (const [sessionId, session] of this.sessions.entries()) {
                this.logger.info(`Closing session: ${sessionId}`);
                session.close();
            }
            this.sessions.clear();
            
            // Close the server
            this.server.close(() => {
                this.isRunning = false;
                this.logger.info('DBGp server stopped');
                resolve();
            });
        });
    }
    
    /**
     * Handle incoming connections
     * @param {net.Socket} socket 
     */
    handleConnection(socket) {
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        const sessionId = this.generateSessionId();
        
        this.logger.info(`New connection from ${clientAddress}, session: ${sessionId}`);
        
        try {
            // Create new debugging session
            const session = new DBGpSession(sessionId, socket, {
                xmlParser: this.xmlParser,
                timeout: this.config.sessionTimeout
            });
            
            // Store session
            this.sessions.set(sessionId, session);
            
            // Set up session event handlers
            session.on('initialized', (sessionData) => {
                this.logger.info(`Session ${sessionId} initialized: ${sessionData.language} ${sessionData.protocol_version}`);
                this.emit('sessionInitialized', sessionId, sessionData);
            });
            
            session.on('breakpoint', (breakpointData) => {
                this.logger.info(`Session ${sessionId} hit breakpoint`);
                this.emit('breakpoint', sessionId, breakpointData);
            });
            
            session.on('variables', (contextId, variables) => {
                this.logger.debug(`Session ${sessionId} received variables for context ${contextId}`);
                this.emit('variables', sessionId, contextId, variables);
            });
            
            session.on('error', (error) => {
                this.logger.error(`Session ${sessionId} error:`, error);
                this.emit('sessionError', sessionId, error);
            });
            
            session.on('close', (reason) => {
                this.logger.info(`Session ${sessionId} closed: ${reason}`);
                this.sessions.delete(sessionId);
                this.emit('sessionClosed', sessionId, reason);
            });
            
            // Initialize the session
            session.initialize();
            
        } catch (error) {
            this.logger.error(`Failed to create session for ${clientAddress}:`, error);
            socket.end();
        }
    }
    
    /**
     * Handle server errors
     * @param {Error} error 
     */
    handleServerError(error) {
        this.logger.error('DBGp server error:', error);
        
        if (error.code === 'EADDRINUSE') {
            this.emit('error', new DBGpConnectionError(
                `Port ${this.config.port} is already in use. Please stop other debugger or use different port.`,
                { 
                    code: 'PORT_IN_USE',
                    port: this.config.port,
                    originalError: error 
                }
            ));
        } else {
            this.emit('error', new DBGpConnectionError('Server error', {
                originalError: error
            }));
        }
    }
    
    /**
     * Generate unique session ID
     * @returns {string}
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `session_${timestamp}_${random}`;
    }
    
    /**
     * Get active session by ID
     * @param {string} sessionId 
     * @returns {DBGpSession|null}
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    
    /**
     * Get all active sessions
     * @returns {Array<{id: string, session: DBGpSession}>}
     */
    getAllSessions() {
        return Array.from(this.sessions.entries()).map(([id, session]) => ({
            id,
            session
        }));
    }
    
    /**
     * Get server status
     * @returns {object}
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            host: this.config.host,
            port: this.config.port,
            activeSessions: this.sessions.size,
            maxConnections: this.config.maxConnections,
            address: this.server ? this.server.address() : null
        };
    }
    
    /**
     * Graceful shutdown handler
     */
    async shutdown() {
        this.logger.info('Shutting down DBGp server...');
        await this.stop();
        this.logger.info('DBGp server shutdown complete');
    }
}

module.exports = DBGpServer;