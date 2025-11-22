/**
 * Debugger Index Tests
 * Tests for src/debugger/index.js - debugger module exports
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

describe('Debugger Index (src/debugger/index.js)', () => {
  test('should export DBGpClient', () => {
    const debuggerModule = require('../../src/debugger/index.js');
    
    expect(debuggerModule).toHaveProperty('DBGpClient');
    expect(typeof debuggerModule.DBGpClient).toBe('function');
  });

  test('should export all expected classes', () => {
    const debuggerModule = require('../../src/debugger/index.js');
    
    // Currently only DBGpClient is implemented
    expect(Object.keys(debuggerModule)).toContain('DBGpClient');
    expect(Object.keys(debuggerModule).length).toBeGreaterThanOrEqual(1);
  });

  test('DBGpClient should be importable and instantiable', () => {
    const { DBGpClient } = require('../../src/debugger/index.js');
    
    expect(() => {
      const client = new DBGpClient();
      expect(client).toBeInstanceOf(DBGpClient);
    }).not.toThrow();
  });
});