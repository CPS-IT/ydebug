/**
 * Connect Command
 * Tests connection to Xdebug and validates DBGp handshake
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

const BaseCommand = require('./base');
const { DBGpClient } = require('../../debugger');
const { logger } = require('../../utils/Logger');

/**
 * Connect command implementation
 */
class ConnectCommand extends BaseCommand {
  /**
   * Execute connect command
   * @param {Object} options - Command options
   */
  async execute(options) {
    try {
      // Load configuration and merge with command options
      const config = this.loadConfig();
      const connectionConfig = this.buildConnectionConfig(config, options);

      logger.debug('Starting connection test with config:', connectionConfig);
      this.info(`Testing connection to Xdebug at ${connectionConfig.host}:${connectionConfig.port}...`);
      
      // Start timing
      const startTime = Date.now();
      
      // Create DBGp client and attempt connection
      const client = new DBGpClient(connectionConfig);
      
      // Set up error event handler to prevent unhandled errors
      client.on('error', () => {
        // Error is already handled by the promise rejection
        // This handler prevents the unhandled error event
      });
      
      try {
        const initData = await client.connect();
        const connectionTime = Date.now() - startTime;
        
        // Display successful connection information
        this.displayConnectionSuccess(initData, connectionConfig, connectionTime);
        
        // Clean up
        await client.disconnect();
        
      } catch (error) {
        const connectionTime = Date.now() - startTime;
        logger.debug('Connection test failed:', error.message);
        this.displayConnectionFailure(error, connectionConfig, connectionTime);
        throw error;
      }
      
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Build connection configuration from config file and command options
   * @param {Object} config - Loaded configuration
   * @param {Object} options - Command line options
   * @returns {Object} Connection configuration
   */
  buildConnectionConfig(config, options) {
    const xdebugConfig = config.xdebug || {};
    const safeOptions = options || {};
    
    return {
      host: safeOptions.host || xdebugConfig.host || 'localhost',
      port: parseInt(safeOptions.port || xdebugConfig.port || 9003),
      timeout: parseInt(safeOptions.timeout || xdebugConfig.timeout || 10000),
    };
  }

  /**
   * Display successful connection information
   * @param {Object} initData - DBGp init message data
   * @param {Object} connectionConfig - Connection configuration used
   * @param {number} connectionTime - Time taken to connect in ms
   */
  displayConnectionSuccess(initData, connectionConfig, connectionTime) {
    this.success(`Connected to Xdebug successfully!`);
    this.info('');
    
    // Connection details
    this.info('Connection Details:');
    this.info(`  Host: ${connectionConfig.host}`);
    this.info(`  Port: ${connectionConfig.port}`);
    this.info(`  Connection Time: ${connectionTime}ms`);
    this.info('');
    
    // Xdebug session information
    if (initData) {
      this.info('Session Information:');
      if (initData.appid) {
        this.info(`  Application ID: ${initData.appid}`);
      }
      if (initData.idekey) {
        this.info(`  IDE Key: ${initData.idekey}`);
      }
      if (initData.session) {
        this.info(`  Session: ${initData.session}`);
      }
      if (initData.thread) {
        this.info(`  Thread: ${initData.thread}`);
      }
      if (initData.parent) {
        this.info(`  Parent: ${initData.parent}`);
      }
      if (initData.language) {
        this.info(`  Language: ${initData.language}`);
      }
      if (initData.protocol_version) {
        this.info(`  Protocol Version: ${initData.protocol_version}`);
      }
      if (initData.fileuri) {
        this.info(`  Initial File: ${initData.fileuri}`);
      }
      this.info('');
    }
    
    this.success('Xdebug connection test completed successfully!');
    this.info('Your debugging environment is ready.');
  }

  /**
   * Display connection failure information with troubleshooting
   * @param {Error} error - The connection error
   * @param {Object} connectionConfig - Connection configuration used
   * @param {number} connectionTime - Time taken before failure in ms
   */
  displayConnectionFailure(error, connectionConfig, connectionTime) {
    this.error(`Failed to connect to Xdebug`);
    this.info('');
    
    // Connection attempt details
    this.info('Connection Attempt:');
    this.info(`  Host: ${connectionConfig.host}`);
    this.info(`  Port: ${connectionConfig.port}`);
    this.info(`  Timeout: ${connectionConfig.timeout}ms`);
    this.info(`  Time Elapsed: ${connectionTime}ms`);
    this.info('');
    
    // Error details
    this.error('Error Details:');
    const errorMsg = error.message || error.code || 'Unknown error';
    this.error(`  ${errorMsg}`);
    this.info('');
    
    // Troubleshooting information
    this.displayTroubleshootingInfo(error, connectionConfig);
  }

  /**
   * Display troubleshooting information based on error type
   * @param {Error} error - The connection error
   * @param {Object} connectionConfig - Connection configuration used
   */
  displayTroubleshootingInfo(error, connectionConfig) {
    this.info('Troubleshooting:');
    
    if (error.code === 'ECONNREFUSED') {
      this.info('  - Connection refused - Xdebug is likely not running or listening');
      this.info(`  - Verify Xdebug is configured to listen on ${connectionConfig.host}:${connectionConfig.port}`);
      this.info('  - Check your PHP configuration for xdebug.mode=debug');
      this.info('  - Ensure xdebug.start_with_request=yes or trigger debugging manually');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      this.info('  - Connection timed out - Xdebug may be slow to respond');
      this.info('  - Try increasing the timeout with --timeout option');
      this.info('  - Check network connectivity and firewall settings');
    } else if (error.code === 'ENOTFOUND') {
      this.info('  - Host not found - Check the hostname/IP address');
      this.info('  - Verify DNS resolution if using a hostname');
    } else if (error.code === 'ECONNRESET') {
      this.info('  - Connection was reset by the remote host');
      this.info('  - Xdebug may have closed the connection unexpectedly');
    } else {
      this.info('  - Unexpected error occurred');
      this.info('  - Check Xdebug configuration and PHP error logs');
    }
    
    this.info('');
    this.info('Common Xdebug Configuration (php.ini):');
    this.info('  zend_extension=xdebug');
    this.info('  xdebug.mode=debug');
    this.info(`  xdebug.client_host=${connectionConfig.host}`);
    this.info(`  xdebug.client_port=${connectionConfig.port}`);
    this.info('  xdebug.start_with_request=yes');
    this.info('');
    this.info('For more help, check the YDebug documentation or run `ydebug config --show`');
  }
}

module.exports = ConnectCommand;