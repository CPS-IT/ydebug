/**
 * DBGp Response Parser
 * Handles parsing of DBGp responses and init messages
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

const xml2js = require('xml2js');
const { logger } = require('../../utils/Logger');

/**
 * Response Parser for DBGp responses
 * Handles parsing of XML responses and init messages
 */
class ResponseParser {
  /**
   * Create a response parser instance
   * @param {Object} options - Parser options
   * @param {string} options.version - Protocol version
   * @param {string} options.encoding - Default encoding for data
   */
  constructor(options = {}) {
    this.version = options.version || '1.0';
    this.encoding = options.encoding || 'base64';

    // Configure XML parser
    this.xmlParser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: false,
      explicitRoot: false,
      ignoreAttrs: false,
      trim: true,
      normalize: true
    });

    this.stats = {
      responsesParsed: 0,
      initMessagesParsed: 0,
      errorsDetected: 0,
      parseErrors: 0
    };
  }

  /**
   * Parse a DBGp response
   * @param {string} response - Raw XML response
   * @returns {Object} Parsed response object
   * @throws {Error} If parsing fails
   */
  async parseResponse(response) {
    if (!response || typeof response !== 'string') {
      throw new Error('Invalid response: must be a non-empty string');
    }

    try {
      const parsed = await this.xmlParser.parseStringPromise(response);
      this.stats.responsesParsed++;

      // Handle different response formats
      if (parsed.response) {
        return this._processResponseElement(parsed.response);
      } else if (parsed.init) {
        return this._processInitElement(parsed.init);
      } else {
        // Handle root-level response
        return this._processResponseElement(parsed);
      }

    } catch (error) {
      this.stats.parseErrors++;
      logger.error('XML parsing failed:', error.message);
      throw new Error(`Failed to parse XML response: ${error.message}`);
    }
  }

  /**
   * Parse initialization message
   * @param {string} initMessage - Raw init XML message
   * @returns {Object} Parsed init data
   */
  async parseInit(initMessage) {
    if (!initMessage || typeof initMessage !== 'string') {
      throw new Error('Invalid init message: must be a non-empty string');
    }

    try {
      const parsed = await this.xmlParser.parseStringPromise(initMessage);
      this.stats.initMessagesParsed++;

      if (parsed.init) {
        return this._processInitElement(parsed.init);
      } else if (parsed.$ || Object.keys(parsed).length > 0) {
        // With explicitRoot: false, the init element becomes the root object
        return this._processInitElement(parsed);
      } else {
        throw new Error('Invalid init message format');
      }

    } catch (error) {
      this.stats.parseErrors++;
      logger.error('Init message parsing failed:', error.message);
      throw new Error(`Failed to parse init message: ${error.message}`);
    }
  }

  /**
   * Process response element
   * @param {Object} responseElement - Parsed response element
   * @returns {Object} Processed response
   * @private
   */
  _processResponseElement(responseElement) {
    const result = {
      $: responseElement.$ || {},
      command: responseElement.$.command || 'unknown',
      transactionId: responseElement.$.transaction_id || null,
      status: responseElement.$.status || null,
      reason: responseElement.$.reason || null
    };

    // Parse transaction ID as number
    if (result.transactionId) {
      result.transactionId = parseInt(result.transactionId, 10);
    }

    // Add child elements
    Object.keys(responseElement).forEach(key => {
      if (key !== '$') {
        result[key] = responseElement[key];
      }
    });

    // Check for errors
    const error = this.checkError(result);
    if (error) {
      this.stats.errorsDetected++;
      result.error = error;
    }

    return result;
  }

  /**
   * Process init element
   * @param {Object} initElement - Parsed init element
   * @returns {Object} Processed init data
   * @private
   */
  _processInitElement(initElement) {
    const attributes = initElement.$ || {};

    return {
      appid: attributes.appid || null,
      idekey: attributes.idekey || null,
      session: attributes.session || null,
      thread: attributes.thread || null,
      parent: attributes.parent || null,
      language: attributes.language || null,
      protocol_version: attributes.protocol_version || null,
      fileuri: attributes.fileuri || null,
      // Additional Xdebug-specific attributes
      'xdebug:language_version': attributes['xdebug:language_version'] || null,
      // Raw attributes for extensibility
      $: attributes
    };
  }

  /**
   * Check if response contains an error
   * @param {Object} parsedResponse - Parsed response object
   * @returns {Error|null} Error object if found, null otherwise
   */
  checkError(parsedResponse) {
    // Check for error element
    if (parsedResponse.error) {
      const errorElement = parsedResponse.error;
      const errorAttrs = errorElement.$ || {};
      const message = errorElement.message || errorElement._ || 'Unknown error';

      const error = new Error(message);
      error.code = errorAttrs.code || 'UNKNOWN_ERROR';
      error.apperr = errorAttrs.apperr || null;

      return error;
    }

    // Check status for error conditions
    const status = parsedResponse.status || parsedResponse.$.status;
    if (status === 'error') {
      const reason = parsedResponse.reason || parsedResponse.$.reason || 'Unknown error';
      const error = new Error(`Command error: ${reason}`);
      error.code = 'COMMAND_ERROR';
      return error;
    }

    return null;
  }

  /**
   * Extract transaction ID from response
   * @param {string|Object} response - Response string or parsed object
   * @returns {number|null} Transaction ID or null
   */
  extractTransactionId(response) {
    if (typeof response === 'string') {
      // Try to extract from XML string
      const match = response.match(/transaction_id="(\d+)"/);
      return match ? parseInt(match[1], 10) : null;
    } else if (typeof response === 'object' && response !== null) {
      // Extract from parsed object
      const id = response.transactionId !== undefined ? response.transactionId :
        (response.$ && response.$.transaction_id);
      return id !== undefined && id !== null ? parseInt(id, 10) : null;
    }

    return null;
  }

  /**
   * Parse encoded data from response
   * @param {string} data - Encoded data
   * @param {string} encoding - Encoding type
   * @returns {*} Parsed data
   */
  parseData(data, encoding = this.encoding) {
    if (!data || typeof data !== 'string') {
      return data;
    }

    try {
      switch (encoding) {
      case 'base64':
        // Check if the base64 data is valid before attempting to decode
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
          throw new Error(`Invalid base64 data: ${data}`);
        }
        return Buffer.from(data, 'base64').toString('utf8');
      case 'urlencode':
        return decodeURIComponent(data);
      case 'none':
      default:
        return data;
      }
    } catch (error) {
      logger.warn(`Failed to decode data with encoding '${encoding}':`, error.message);
      throw error; // Throw the error instead of returning original data
    }
  }

  /**
   * Parse property value from response
   * @param {Object} property - Property element from response
   * @returns {*} Parsed property value
   */
  parseProperty(property) {
    if (!property) return null;

    const attrs = property.$ || {};
    const result = {
      name: attrs.name || null,
      fullname: attrs.fullname || null,
      type: attrs.type || 'undefined',
      classname: attrs.classname || null,
      constant: attrs.constant === '1',
      children: attrs.children ? parseInt(attrs.children, 10) : 0,
      size: attrs.size ? parseInt(attrs.size, 10) : 0,
      page: attrs.page ? parseInt(attrs.page, 10) : 0,
      pagesize: attrs.pagesize ? parseInt(attrs.pagesize, 10) : 0,
      encoding: attrs.encoding || this.encoding,
      numchildren: attrs.numchildren ? parseInt(attrs.numchildren, 10) : 0
    };

    // Parse value based on encoding
    if (property._) {
      result.value = this.parseData(property._, result.encoding);
    } else {
      result.value = null;
    }

    // Parse child properties
    if (property.property) {
      result.properties = Array.isArray(property.property)
        ? property.property.map(p => this.parseProperty(p))
        : [this.parseProperty(property.property)];
    }

    return result;
  }

  /**
   * Parse stack frame from response
   * @param {Object} stack - Stack element from response
   * @returns {Object} Parsed stack frame
   */
  parseStackFrame(stack) {
    if (!stack || !stack.$) return null;

    const attrs = stack.$;
    return {
      level: attrs.level ? parseInt(attrs.level, 10) : 0,
      type: attrs.type || 'file',
      filename: attrs.filename || null,
      lineno: attrs.lineno ? parseInt(attrs.lineno, 10) : 0,
      where: attrs.where || null,
      cmdbegin: attrs.cmdbegin || null,
      cmdend: attrs.cmdend || null
    };
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.encoding) {
      this.encoding = config.encoding;
    }
  }

  /**
   * Get parser statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats.responsesParsed = 0;
    this.stats.initMessagesParsed = 0;
    this.stats.errorsDetected = 0;
    this.stats.parseErrors = 0;
  }
}

module.exports = ResponseParser;
