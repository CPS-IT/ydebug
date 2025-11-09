/**
 * DBGp XML Parser
 * Unified XML parsing service for DBGp protocol responses
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

const { parseString } = require('xml2js');
const { logger } = require('../utils/Logger');
const DBGpProtocolError = require('./errors/DBGpProtocolError');

/**
 * Unified XML parser for DBGp protocol responses
 * Consolidates XML parsing logic from DBGpClient and DBGpCommands
 */
class DBGpXmlParser {
  constructor(options = {}) {
    this.parseOptions = {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: true,
      ...options
    };
  }

  /**
     * Parse XML string into JavaScript object
     * @param {string} xmlString - Raw XML response from DBGp server
     * @returns {Promise<Object>} Parsed XML object
     */
  async parseResponse(xmlString) {
    return new Promise((resolve, reject) => {
      if (!this.isValidXmlInput(xmlString)) {
        const error = new Error('Invalid XML input: empty, null, or non-string value');
        logger.error('XML parsing failed:', error.message);
        reject(error);
        return;
      }

      logger.debug('Parsing XML response', { 
        length: xmlString.length, 
        preview: xmlString.substring(0, 100) 
      });

      parseString(xmlString, this.parseOptions, (error, result) => {
        if (error) {
          const parseError = new Error(`XML parsing failed: ${error.message}`);
          logger.error('XML parsing error:', {
            message: error.message,
            xmlPreview: xmlString.substring(0, 200)
          });
          reject(parseError);
          return;
        }

        if (!result || typeof result !== 'object') {
          const emptyError = new Error('XML parsing resulted in empty or invalid object');
          logger.error('XML parsing produced invalid result:', result);
          reject(emptyError);
          return;
        }

        logger.debug('XML parsed successfully', {
          rootKeys: Object.keys(result),
          resultType: typeof result
        });

        resolve(result);
      });
    });
  }

  /**
     * Parse XML and extract specific DBGp response data
     * @param {string} xmlString - Raw XML response
     * @returns {Promise<Object>} Structured DBGp response
     */
  async parseDBGpResponse(xmlString) {
    const parsed = await this.parseResponse(xmlString);
        
    // Extract common DBGp response structure
    const response = this.extractResponseData(parsed);
        
    logger.debug('Extracted DBGp response data', {
      hasResponse: !!response.response,
      hasInit: !!response.init,
      transactionId: response.transactionId,
      status: response.status
    });

    return response;
  }

  /**
     * Extract structured data from parsed XML
     * @param {Object} parsed - Parsed XML object
     * @returns {Object} Structured response data
     * @private
     */
  extractResponseData(parsed) {
    const result = {
      raw: parsed,
      transactionId: null,
      status: null,
      reason: null,
      error: null,
      data: null
    };

    // Handle different DBGp response types
    if (parsed.response) {
      result.response = parsed.response;
      result.transactionId = this.parseTransactionId(parsed.response.transaction_id);
      result.status = parsed.response.status || null;
      result.reason = parsed.response.reason || null;
      result.data = this.extractResponseContent(parsed.response);
      result.error = this.extractError(parsed.response);
    } else if (parsed.init) {
      result.init = parsed.init;
      result.transactionId = this.parseTransactionId(parsed.init.transaction_id);
      result.data = parsed.init;
    } else {
      // Handle other response formats
      result.data = parsed;
      result.transactionId = this.findTransactionIdAnywhere(parsed);
    }

    return result;
  }

  /**
     * Extract error information from response
     * @param {Object} response - Response object
     * @returns {Object|null} Error information
     * @private
     */
  extractError(response) {
    if (!response.error) {
      return null;
    }

    const error = response.error;
    return {
      code: error.code || 'unknown',
      message: error.message || 'Unknown DBGp error',
      raw: error
    };
  }

  /**
     * Extract content data from response
     * @param {Object} response - Response object  
     * @returns {*} Response content
     * @private
     */
  extractResponseContent(response) {
    // Return text content if available
    if (response._ !== undefined) {
      return response._;
    }

    // Return the response object without transaction metadata
    const content = { ...response };
    delete content.transaction_id;
    delete content.status;
    delete content.reason;
    delete content.error;
        
    return Object.keys(content).length > 0 ? content : null;
  }

  /**
     * Parse transaction ID from string to number
     * @param {*} transactionId - Transaction ID value
     * @returns {number|null} Parsed transaction ID
     * @private
     */
  parseTransactionId(transactionId) {
    if (transactionId === undefined || transactionId === null) {
      return null;
    }
        
    const parsed = parseInt(transactionId, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
     * Search for transaction ID anywhere in the parsed structure
     * @param {Object} obj - Parsed object to search
     * @returns {number|null} Found transaction ID
     * @private
     */
  findTransactionIdAnywhere(obj) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    // Direct transaction_id property
    if (obj.transaction_id !== undefined) {
      return this.parseTransactionId(obj.transaction_id);
    }

    // Search in nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = this.findTransactionIdAnywhere(obj[key]);
        if (found !== null) {
          return found;
        }
      }
    }

    return null;
  }

  /**
     * Validate XML input before parsing
     * @param {*} xmlString - Input to validate
     * @returns {boolean} True if valid for parsing
     * @private
     */
  isValidXmlInput(xmlString) {
    return typeof xmlString === 'string' && 
               xmlString.length > 0 && 
               xmlString.trim().length > 0;
  }

  /**
     * Parse init message from DBGp server
     * @param {string} xmlString - Init message XML
     * @returns {Promise<Object>} Parsed init data
     */
  async parseInitMessage(xmlString) {
    const parsed = await this.parseResponse(xmlString);
        
    if (!parsed.init) {
      throw new DBGpProtocolError(
        'Invalid init message: missing <init> element',
        {
          code: 'INVALID_INIT_MESSAGE',
          context: {
            parsedData: parsed,
            xmlString: xmlString.length > 200 ? xmlString.substring(0, 200) + '...' : xmlString
          },
          recoverable: false,
          category: 'protocol'
        }
      );
    }

    const init = parsed.init;
    return {
      appid: init.appid || null,
      idekey: init.idekey || null,
      session: init.session || null,
      thread: init.thread || null,
      parent: init.parent || null,
      language: init.language || 'php',
      protocol_version: init.protocol_version || '1.0',
      fileuri: init.fileuri || null,
      raw: init
    };
  }

  /**
     * Check if parsed response indicates an error
     * @param {Object} parsedResponse - Result from parseDBGpResponse
     * @returns {Error|null} Error object if response contains error
     */
  checkForError(parsedResponse) {
    if (!parsedResponse.error) {
      return null;
    }

    const error = parsedResponse.error;
    return new Error(`DBGp Error ${error.code}: ${error.message}`);
  }

  /**
     * Get parser configuration options
     * @returns {Object} Current parse options
     */
  getParseOptions() {
    return { ...this.parseOptions };
  }

  /**
     * Update parser configuration options
     * @param {Object} newOptions - Options to merge
     */
  updateParseOptions(newOptions) {
    this.parseOptions = {
      ...this.parseOptions,
      ...newOptions
    };
        
    logger.debug('Updated XML parser options', newOptions);
  }
}

// Export singleton instance for shared use
const xmlParser = new DBGpXmlParser();

module.exports = {
  DBGpXmlParser,
  xmlParser
};