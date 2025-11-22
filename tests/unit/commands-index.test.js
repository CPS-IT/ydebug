/**
 * Commands Index Tests
 * Tests for src/cli/commands/index.js - command exports
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

describe('Commands Index (src/cli/commands/index.js)', () => {
  test('should export ConfigCommand', () => {
    const commands = require('../../src/cli/commands/index.js');
    
    expect(commands).toHaveProperty('ConfigCommand');
    expect(typeof commands.ConfigCommand).toBe('function');
  });

  test('should export all expected commands', () => {
    const commands = require('../../src/cli/commands/index.js');
    
    // Currently only ConfigCommand is implemented
    expect(Object.keys(commands)).toContain('ConfigCommand');
    expect(Object.keys(commands).length).toBeGreaterThanOrEqual(1);
  });

  test('ConfigCommand should be importable and instantiable', () => {
    const { ConfigCommand } = require('../../src/cli/commands/index.js');
    
    expect(() => {
      const cmd = new ConfigCommand();
      expect(cmd).toBeInstanceOf(ConfigCommand);
    }).not.toThrow();
  });
});