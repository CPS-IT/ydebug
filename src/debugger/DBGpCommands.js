/**
 * DBGp Commands
 * Command execution framework for DBGp protocol operations
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

/**
 * DBGp Commands handler
 * Provides command execution framework and core DBGp command implementations
 */
class DBGpCommands {
    constructor(client) {
        this.client = client;
        this.transactionId = 0;
        this.commandTimeout = 5000; // 5 seconds default timeout
    }

    /**
     * Get next transaction ID
     * @returns {number} Transaction ID
     */
    getNextTransactionId() {
        return ++this.transactionId;
    }

    /**
     * Execute a DBGp command with timeout and response parsing
     * @param {string} command - DBGp command to execute
     * @param {Object} options - Command options
     * @param {number} options.timeout - Command timeout in milliseconds
     * @returns {Promise<Object>} Parsed command response
     */
    async executeCommand(command, options = {}) {
        const timeout = options.timeout || this.commandTimeout;
        const transactionId = this.getNextTransactionId();
        const commandWithId = `${command} -i ${transactionId}`;
        
        logger.debug(`Executing DBGp command: ${commandWithId}`);
        const startTime = Date.now();
        
        try {
            // Send command and get XML response
            const xmlResponse = await this.client.sendCommand(commandWithId, { timeout });
            const duration = Date.now() - startTime;
            
            logger.debug(`Command completed in ${duration}ms: ${command}`);
            
            // Parse XML response
            const parsedResponse = await this.parseXMLResponse(xmlResponse);
            
            // Validate transaction ID
            this.validateTransactionId(parsedResponse, transactionId);
            
            return parsedResponse;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Command failed after ${duration}ms: ${command} - ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse XML response from DBGp server
     * @param {string} xmlString - Raw XML response
     * @returns {Promise<Object>} Parsed XML object
     */
    async parseXMLResponse(xmlString) {
        return new Promise((resolve, reject) => {
            if (!xmlString || typeof xmlString !== 'string') {
                reject(new Error('Invalid XML response: empty or non-string'));
                return;
            }

            parseString(xmlString, {
                explicitArray: false,
                mergeAttrs: true,
                trim: true,
                normalize: true
            }, (error, result) => {
                if (error) {
                    logger.error('XML parsing error:', error.message);
                    reject(new Error(`Failed to parse XML response: ${error.message}`));
                    return;
                }

                if (!result) {
                    reject(new Error('XML parsing resulted in empty object'));
                    return;
                }

                logger.debug('Parsed XML response:', JSON.stringify(result, null, 2));
                resolve(result);
            });
        });
    }

    /**
     * Validate transaction ID in response matches request
     * @param {Object} response - Parsed XML response
     * @param {number} expectedId - Expected transaction ID
     */
    validateTransactionId(response, expectedId) {
        const responseId = this.extractTransactionId(response);
        if (responseId !== expectedId) {
            throw new Error(`Transaction ID mismatch: expected ${expectedId}, got ${responseId}`);
        }
    }

    /**
     * Extract transaction ID from response
     * @param {Object} response - Parsed XML response
     * @returns {number} Transaction ID
     */
    extractTransactionId(response) {
        // Look for transaction_id in various response structures
        if (response.response && response.response.transaction_id) {
            return parseInt(response.response.transaction_id);
        }
        if (response.init && response.init.transaction_id) {
            return parseInt(response.init.transaction_id);
        }
        if (response.transaction_id) {
            return parseInt(response.transaction_id);
        }
        return null;
    }

    /**
     * Check if response indicates an error
     * @param {Object} response - Parsed XML response
     * @returns {Error|null} Error object if response contains error, null otherwise
     */
    checkResponseError(response) {
        if (response.response && response.response.error) {
            const error = response.response.error;
            const code = error.code || 'unknown';
            const message = error.message || 'Unknown DBGp error';
            return new Error(`DBGp Error ${code}: ${message}`);
        }
        return null;
    }

    // ===== Core DBGp Commands =====

    /**
     * Execute status command to get current debugger status
     * @returns {Promise<Object>} Status response
     */
    async status() {
        logger.info('Getting debugger status');
        
        const response = await this.executeCommand('status');
        const error = this.checkResponseError(response);
        if (error) {
            throw error;
        }

        const status = response.response?.status || 'unknown';
        const reason = response.response?.reason || '';
        
        logger.info(`Debugger status: ${status} ${reason ? `(${reason})` : ''}`);
        
        return {
            status,
            reason,
            response
        };
    }

    /**
     * Get debugger feature information
     * @param {string} featureName - Name of feature to query
     * @returns {Promise<Object>} Feature response
     */
    async featureGet(featureName) {
        logger.debug(`Getting feature: ${featureName}`);
        
        const response = await this.executeCommand(`feature_get -n ${featureName}`);
        const error = this.checkResponseError(response);
        if (error) {
            throw error;
        }

        const supported = response.response?.supported || '0';
        const value = response.response?._ || response.response?.value || '';
        
        logger.debug(`Feature ${featureName}: supported=${supported}, value="${value}"`);
        
        return {
            featureName,
            supported: supported === '1',
            value,
            response
        };
    }

    /**
     * Set debugger feature value
     * @param {string} featureName - Name of feature to set
     * @param {string} value - Value to set
     * @returns {Promise<Object>} Set feature response
     */
    async featureSet(featureName, value) {
        logger.debug(`Setting feature ${featureName} to: ${value}`);
        
        const response = await this.executeCommand(`feature_set -n ${featureName} -v ${value}`);
        const error = this.checkResponseError(response);
        if (error) {
            throw error;
        }

        const success = response.response?.success || '0';
        
        logger.debug(`Feature set ${featureName}: success=${success}`);
        
        return {
            featureName,
            value,
            success: success === '1',
            response
        };
    }

    /**
     * Execute step over command for demonstration flow
     * @returns {Promise<Object>} Step response
     */
    async stepOver() {
        logger.info('Executing step over');
        
        const response = await this.executeCommand('step_over');
        const error = this.checkResponseError(response);
        if (error) {
            throw error;
        }

        const status = response.response?.status || 'unknown';
        const reason = response.response?.reason || '';
        
        logger.info(`Step over completed: ${status} ${reason ? `(${reason})` : ''}`);
        
        return {
            status,
            reason,
            response
        };
    }

    /**
     * Set command timeout
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
        this.commandTimeout = timeout;
        logger.debug(`Command timeout set to ${timeout}ms`);
    }

    /**
     * Get current command timeout
     * @returns {number} Current timeout in milliseconds
     */
    getTimeout() {
        return this.commandTimeout;
    }
}

module.exports = {
    DBGpCommands
};