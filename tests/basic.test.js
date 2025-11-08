/**
 * Basic test to verify test setup is working
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

describe('YDebug Basic Tests', () => {
  test('environment is set up correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('basic functionality works', () => {
    expect(1 + 1).toBe(2);
  });
});
