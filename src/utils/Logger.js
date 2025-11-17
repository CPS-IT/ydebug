/**
 * Enhanced logger for YDebug with file and console output capabilities
 * Provides configurable logging with file rotation and structured output
 */
const fs = require('fs');
const path = require('path');
class Logger {
  static LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };

  static LEVEL_NAMES = {
    [Logger.LOG_LEVELS.ERROR]: 'ERROR',
    [Logger.LOG_LEVELS.WARN]: 'WARN',
    [Logger.LOG_LEVELS.INFO]: 'INFO',
    [Logger.LOG_LEVELS.DEBUG]: 'DEBUG'
  };

  static TARGETS = {
    CONSOLE: 'console',
    FILE: 'file',
    BOTH: 'both'
  };

  static FORMATS = {
    TEXT: 'text',
    JSON: 'json'
  };

  constructor(options = {}) {
    this.level = options.level !== undefined ? options.level : Logger.LOG_LEVELS.INFO;
    this.target = options.target || Logger.TARGETS.CONSOLE;
    this.directory = options.directory || 'var/log';
    this.filename = options.filename || 'ydebug.log';
    this.format = options.format || Logger.FORMATS.TEXT;
    this.category = options.category || 'general';
    
    this.rotation = {
      enabled: options.rotation?.enabled || false,
      maxSize: this.parseSize(options.rotation?.maxSize || '10MB'),
      maxFiles: options.rotation?.maxFiles || 5
    };
    
    this._initialized = false;
    this._writeQueue = [];
    this._writing = false;
  }

  setLevel(level) {
    this.level = level;
  }

  setTarget(target) {
    this.target = target;
  }

  setCategory(category) {
    this.category = category;
  }

  parseSize(sizeStr) {
    const units = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024
    };
    
    const match = sizeStr.toString().match(/^(\d+)\s*(B|KB|MB|GB)?$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const size = parseInt(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    
    return size * (units[unit] || 1);
  }

  async ensureDirectory() {
    if (this._initialized) return;
    
    try {
      await fs.promises.mkdir(this.directory, { recursive: true });
      this._initialized = true;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        // eslint-disable-next-line no-console
        console.error('Failed to create log directory:', error.message);
      }
      this._initialized = true;
    }
  }

  getLogFilePath() {
    return path.join(this.directory, this.filename);
  }

  async shouldRotate() {
    if (!this.rotation.enabled) return false;
    
    try {
      const logPath = this.getLogFilePath();
      const stats = await fs.promises.stat(logPath);
      return stats.size >= this.rotation.maxSize;
    } catch {
      return false;
    }
  }

  async rotateLogFile() {
    const basePath = this.getLogFilePath();
    
    try {
      // Remove oldest log file if we've hit the limit
      const oldestFile = `${basePath}.${this.rotation.maxFiles}`;
      try {
        await fs.promises.unlink(oldestFile);
      } catch {
        // Ignore if file doesn't exist
      }
      
      // Rotate existing log files
      for (let i = this.rotation.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${basePath}.${i}`;
        const newFile = `${basePath}.${i + 1}`;
        
        try {
          await fs.promises.rename(oldFile, newFile);
        } catch {
          // Ignore if source file doesn't exist
        }
      }
      
      // Move current log to .1
      try {
        await fs.promises.rename(basePath, `${basePath}.1`);
      } catch {
        // Ignore if current log doesn't exist
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Log rotation failed:', error.message);
    }
  }

  async writeToFile(message) {
    if (this.target === Logger.TARGETS.CONSOLE) return;
    
    await this.ensureDirectory();
    
    if (await this.shouldRotate()) {
      await this.rotateLogFile();
    }
    
    try {
      const logPath = this.getLogFilePath();
      await fs.promises.appendFile(logPath, message + '\n', 'utf8');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to write to log file:', error.message);
    }
  }

  async processWriteQueue() {
    if (this._writing || this._writeQueue.length === 0) return;
    
    this._writing = true;
    
    while (this._writeQueue.length > 0) {
      const message = this._writeQueue.shift();
      await this.writeToFile(message);
    }
    
    this._writing = false;
  }

  shouldLog(level) {
    return level <= this.level;
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = Logger.LEVEL_NAMES[level];
    
    if (this.format === Logger.FORMATS.JSON) {
      const logData = {
        timestamp,
        level: levelName,
        category: this.category,
        message,
        data: args.length > 0 ? args : undefined
      };
      
      return JSON.stringify(logData);
    } else {
      const prefix = `[${timestamp}] [${this.category}] ${levelName}:`;
      
      if (args.length > 0) {
        return [prefix, message, ...args];
      }
      return [prefix, message];
    }
  }

  formatMessageForConsole(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = Logger.LEVEL_NAMES[level];
    const prefix = `[${timestamp}] [${this.category}] ${levelName}:`;
    
    if (args.length > 0) {
      return [prefix, message, ...args];
    }
    return [prefix, message];
  }

  formatMessageForFile(level, message, ...args) {
    if (this.format === Logger.FORMATS.JSON) {
      return this.formatMessage(level, message, ...args);
    } else {
      const consoleFormat = this.formatMessageForConsole(level, message, ...args);
      return consoleFormat.join(' ');
    }
  }

  async logMessage(level, message, ...args) {
    if (!this.shouldLog(level)) return;
    
    // Console output
    if (this.target === Logger.TARGETS.CONSOLE || this.target === Logger.TARGETS.BOTH) {
      const consoleArgs = this.formatMessageForConsole(level, message, ...args);
      
      switch (level) {
      case Logger.LOG_LEVELS.ERROR:
        // eslint-disable-next-line no-console
        console.error(...consoleArgs);
        break;
      case Logger.LOG_LEVELS.WARN:
        // eslint-disable-next-line no-console
        console.warn(...consoleArgs);
        break;
      case Logger.LOG_LEVELS.INFO:
        // eslint-disable-next-line no-console
        console.info(...consoleArgs);
        break;
      case Logger.LOG_LEVELS.DEBUG:
        // eslint-disable-next-line no-console
        console.log(...consoleArgs);
        break;
      }
    }
    
    // File output
    if (this.target === Logger.TARGETS.FILE || this.target === Logger.TARGETS.BOTH) {
      const fileMessage = this.formatMessageForFile(level, message, ...args);
      this._writeQueue.push(fileMessage);
      
      // Process queue asynchronously
      setImmediate(() => this.processWriteQueue());
    }
  }

  error(message, ...args) {
    this.logMessage(Logger.LOG_LEVELS.ERROR, message, ...args);
  }

  warn(message, ...args) {
    this.logMessage(Logger.LOG_LEVELS.WARN, message, ...args);
  }

  info(message, ...args) {
    this.logMessage(Logger.LOG_LEVELS.INFO, message, ...args);
  }

  debug(message, ...args) {
    this.logMessage(Logger.LOG_LEVELS.DEBUG, message, ...args);
  }

  // Static method to create category-specific loggers
  static createLogger(category, options = {}) {
    return new Logger({ ...options, category });
  }
}

// Configuration-aware logger factory
let _defaultLogger = null;

function createDefaultLogger() {
  if (_defaultLogger) return _defaultLogger;
  
  try {
    const ConfigManager = require('../config/ConfigManager');
    const config = new ConfigManager();
    const loggingConfig = config.get('logging') || {};
    
    // Map config levels to Logger levels
    const levelMap = {
      'error': Logger.LOG_LEVELS.ERROR,
      'warn': Logger.LOG_LEVELS.WARN,
      'info': Logger.LOG_LEVELS.INFO,
      'debug': Logger.LOG_LEVELS.DEBUG,
      'trace': Logger.LOG_LEVELS.DEBUG // Map trace to debug
    };
    
    const options = {
      level: levelMap[loggingConfig.level] || Logger.LOG_LEVELS.INFO,
      target: loggingConfig.target || Logger.TARGETS.CONSOLE,
      directory: loggingConfig.directory || 'var/log',
      filename: loggingConfig.filename || 'ydebug.log',
      format: loggingConfig.format || Logger.FORMATS.TEXT,
      category: 'general',
      rotation: loggingConfig.rotation || {}
    };
    
    _defaultLogger = new Logger(options);
    return _defaultLogger;
  } catch {
    // Fallback to basic console logger if config fails
    _defaultLogger = new Logger();
    return _defaultLogger;
  }
}

// Create default logger instance
const logger = createDefaultLogger();

module.exports = {
  Logger,
  logger,
  LOG_LEVELS: Logger.LOG_LEVELS,
  LOG_TARGETS: Logger.TARGETS,
  LOG_FORMATS: Logger.FORMATS
};
