/**
 * Jest setup file for YDebug tests
 * Runs before all tests to configure testing environment
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

// Set test environment variables
process.env.NODE_ENV = 'test';

// Configure test timeout
jest.setTimeout(10000);

// Global test utilities
global.testHelpers = {
  // Add test helper functions here as needed
};
