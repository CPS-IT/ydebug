/**
 * Simple console logger for YDebug prototype
 * Provides basic logging levels with text prefixes for debugging
 */
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

  constructor(level = Logger.LOG_LEVELS.INFO) {
    this.level = level;
  }

  setLevel(level) {
    this.level = level;
  }

  shouldLog(level) {
    return level <= this.level;
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = Logger.LEVEL_NAMES[level];
    const prefix = `[${timestamp}] ${levelName}:`;

    if (args.length > 0) {
      return [prefix, message, ...args];
    }
    return [prefix, message];
  }

  error(message, ...args) {
    if (this.shouldLog(Logger.LOG_LEVELS.ERROR)) {
      // eslint-disable-next-line no-console
      console.error(...this.formatMessage(Logger.LOG_LEVELS.ERROR, message, ...args));
    }
  }

  warn(message, ...args) {
    if (this.shouldLog(Logger.LOG_LEVELS.WARN)) {
      // eslint-disable-next-line no-console
      console.warn(...this.formatMessage(Logger.LOG_LEVELS.WARN, message, ...args));
    }
  }

  info(message, ...args) {
    if (this.shouldLog(Logger.LOG_LEVELS.INFO)) {
      // eslint-disable-next-line no-console
      console.info(...this.formatMessage(Logger.LOG_LEVELS.INFO, message, ...args));
    }
  }

  debug(message, ...args) {
    if (this.shouldLog(Logger.LOG_LEVELS.DEBUG)) {
      // eslint-disable-next-line no-console
      console.log(...this.formatMessage(Logger.LOG_LEVELS.DEBUG, message, ...args));
    }
  }
}

// Create default logger instance
const logger = new Logger();

module.exports = {
  Logger,
  logger,
  LOG_LEVELS: Logger.LOG_LEVELS
};
