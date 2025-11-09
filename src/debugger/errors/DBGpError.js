/**
 * DBGp Base Error Class
 * Base class for all DBGp-related errors with standardized error handling
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

/**
 * Base class for all DBGp-related errors
 * Provides standardized error handling with context information
 */
class DBGpError extends Error {
  /**
   * Create a DBGp error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {string} options.code - Error code for programmatic handling
   * @param {Object} options.context - Additional context information
   * @param {Error} options.cause - Original error that caused this error
   * @param {boolean} options.recoverable - Whether this error is recoverable
   * @param {string} options.category - Error category for classification
   */
  constructor(message, options = {}) {
    super(message);

    this.name = this.constructor.name;
    this.code = options.code || 'DBGP_ERROR';
    this.context = options.context || {};
    this.cause = options.cause || null;
    this.recoverable = options.recoverable !== false; // Default to recoverable
    this.category = options.category || 'general';
    this.timestamp = new Date().toISOString();

    // Maintain a proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Include cause in stack trace if available
    if (this.cause && this.cause.stack) {
      this.stack += '\nCaused by: ' + this.cause.stack;
    }
  }

  /**
   * Get error information for logging/reporting
   * @returns {Object} Error information object
   */
  getErrorInfo() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        code: this.cause.code
      } : null
    };
  }

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return this.message;
  }

  /**
   * Get recovery suggestions
   * @returns {string[]} Array of recovery suggestions
   */
  getRecoverySuggestions() {
    return [
      'Check DBGp connection status',
      'Verify debugger configuration',
      'Review error context for more details'
    ];
  }

  /**
   * Get single recovery suggestion
   * @returns {string|null} Recovery suggestion or null for non-recoverable errors
   */
  getRecoverySuggestion() {
    if (!this.recoverable) {
      return null;
    }
    return 'Check the error details and retry the operation';
  }

  /**
   * Check if error is of a specific category
   * @param {string} category - Category to check
   * @returns {boolean} True if error is in the specified category
   */
  isCategory(category) {
    return this.category === category;
  }

  /**
   * Check if error is recoverable
   * @returns {boolean} True if error is recoverable
   */
  isRecoverable() {
    return this.recoverable;
  }

  /**
   * Add additional context to the error
   * @param {string|Object} keyOrObject - Context key or object with key-value pairs
   * @param {*} value - Context value (when first param is a key)
   */
  addContext(keyOrObject, value) {
    if (typeof keyOrObject === 'object' && keyOrObject !== null) {
      // If an object is passed, merge it with existing context
      Object.assign(this.context, keyOrObject);
    } else {
      // If a key-value pair is passed
      this.context[keyOrObject] = value;
    }
  }

  /**
   * Get context value
   * @param {string} key - Context key
   * @returns {*} Context value or undefined
   */
  getContext(key) {
    return this.context[key];
  }

  /**
   * Convert error to string representation
   * @returns {string} String representation of the error
   */
  toString() {
    const contextStr = JSON.stringify(this.context);
    return `${this.name}: ${this.message}\n` +
           `Code: ${this.code}\n` +
           `Context: ${contextStr}\n` +
           `Recoverable: ${this.recoverable}\n` +
           `Timestamp: ${this.timestamp}`;
  }

  /**
   * Convert error to JSON for serialization
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Create error from JSON
   * @param {Object} json - JSON representation
   * @returns {DBGpError} Error instance
   * @static
   */
  static fromJSON(json) {
    const error = new DBGpError(json.message, {
      code: json.code,
      context: json.context,
      recoverable: json.recoverable,
      category: json.category
    });

    error.timestamp = json.timestamp;
    error.stack = json.stack;

    return error;
  }
}

module.exports = DBGpError;
