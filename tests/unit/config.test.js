/**
 * Configuration System Tests
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

const fs = require('fs');

// Import config functions directly to avoid mocking conflicts
const configPath = require.resolve('../../src/config');
delete require.cache[configPath];
const { loadConfig, validateConfig, DEFAULT_CONFIG } = require('../../src/config');

describe('Configuration System', () => {
  afterEach(() => {
    // Clean up test config files
    const testFiles = [
      'test-config.json',
      'ydebug.config.json',
      '.ydebug.json',
    ];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  test('loadConfig returns default config when no file exists', () => {
    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  test('validateConfig accepts valid configuration', () => {
    const validConfig = {
      xdebug: { port: 9003, timeout: 5000 },
      logging: { level: 'info' },
    };

    expect(() => validateConfig(validConfig)).not.toThrow();
  });

  test('validateConfig rejects invalid port', () => {
    const invalidConfig = {
      xdebug: { port: 99999 },
    };

    expect(() => validateConfig(invalidConfig)).toThrow(
      'port must be a valid port number'
    );
  });

  test('validateConfig rejects invalid logging level', () => {
    const invalidConfig = {
      logging: { level: 'invalid' },
    };

    expect(() => validateConfig(invalidConfig)).toThrow(
      'logging.level must be one of'
    );
  });

  test('configuration file loading and merging works correctly', () => {
    // Clear the require cache for config module to ensure fresh load
    const configPath = require.resolve('../../src/config');
    delete require.cache[configPath];
    
    const testConfig = {
      xdebug: { port: 9005 },
      logging: { level: 'debug' },
    };

    fs.writeFileSync('ydebug.config.json', JSON.stringify(testConfig));

    // Mock console.log to suppress the "Loaded configuration" message
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Re-import to get fresh instance
    const { loadConfig: freshLoadConfig } = require('../../src/config');
    const config = freshLoadConfig();

    expect(config.xdebug.port).toBe(9005);
    expect(config.xdebug.host).toBe('localhost'); // Should keep default
    expect(config.logging.level).toBe('debug');

    consoleSpy.mockRestore();
  });
});
