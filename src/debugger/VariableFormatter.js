/**
 * Variable Formatter
 * Formats variable data for terminal display and JSON output
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
 * Variable Formatter for terminal and JSON output
 * Handles formatting of PHP variables for human-readable display
 */
class VariableFormatter {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 3;
    this.maxStringLength = options.maxStringLength || 100;
    this.maxArrayItems = options.maxArrayItems || 20;
    this.indent = options.indent || '  ';
    this.colors = options.colors !== false; // Enable colors by default
  }

  /**
   * Format variables for terminal display
   * @param {Array} variables - Array of variable objects
   * @param {Object} options - Formatting options
   * @returns {string} Formatted output string
   */
  formatVariables(variables, options = {}) {
    if (!Array.isArray(variables) || variables.length === 0) {
      return 'No variables found';
    }

    const output = [];
    const sortedVars = this.sortVariables(variables);

    for (const variable of sortedVars) {
      output.push(this.formatVariable(variable, 0, options));
    }

    return output.join('\n');
  }

  /**
   * Format a single variable
   * @param {Object} variable - Variable object
   * @param {number} depth - Current nesting depth
   * @param {Object} options - Formatting options
   * @returns {string} Formatted variable string
   */
  formatVariable(variable, depth = 0, options = {}) {
    if (!variable || depth > this.maxDepth) {
      return `${this.getIndent(depth)}[Maximum depth reached]`;
    }

    const indent = this.getIndent(depth);
    const name = this.colorize(variable.name || '<unknown>', 'cyan');
    const type = this.colorize(`(${variable.type})`, 'yellow');
    const value = this.formatValue(variable, depth, options);

    let output = `${indent}${name} ${type}: ${value}`;

    // Add size info for strings and arrays
    if (variable.size && (variable.type === 'string' || variable.type === 'array')) {
      const sizeInfo = this.colorize(`[${variable.size}]`, 'gray');
      output += ` ${sizeInfo}`;
    }

    // Add constant indicator
    if (variable.constant) {
      const constInfo = this.colorize('[CONSTANT]', 'magenta');
      output += ` ${constInfo}`;
    }

    // Format child properties for objects and arrays
    if (variable.hasChildren && variable.properties && variable.properties.length > 0 && depth < this.maxDepth) {
      output += '\n';
      const childOutput = this.formatChildren(variable.properties, depth + 1, options);
      output += childOutput;
    } else if (variable.hasChildren && depth < this.maxDepth) {
      const childrenCount = variable.numchildren || variable.children;
      output += `\n${this.getIndent(depth + 1)}${this.colorize(`[${childrenCount} children - not loaded]`, 'gray')}`;
    }

    return output;
  }

  /**
   * Format variable value based on type
   * @param {Object} variable - Variable object
   * @param {number} depth - Current depth
   * @param {Object} options - Formatting options
   * @returns {string} Formatted value
   */
  formatValue(variable, _depth, _options) {
    const { type, value } = variable;

    // For arrays and objects, show summary even if value is null
    if (type === 'array') {
      return this.formatArraySummary(variable);
    }
    if (type === 'object') {
      return this.formatObjectSummary(variable);
    }

    if (value === null || value === undefined) {
      return this.colorize('null', 'gray');
    }

    switch (type) {
    case 'string':
      return this.formatString(value);
    case 'int':
    case 'integer':
      return this.colorize(value.toString(), 'green');
    case 'float':
    case 'double':
      return this.colorize(value.toString(), 'green');
    case 'bool':
    case 'boolean':
      return this.colorize(value ? 'true' : 'false', 'blue');
    case 'array':
      return this.formatArraySummary(variable);
    case 'object':
      return this.formatObjectSummary(variable);
    case 'resource':
      return this.colorize(`Resource #${value}`, 'magenta');
    case 'null':
      return this.colorize('null', 'gray');
    case 'uninitialized':
      return this.colorize('uninitialized', 'gray');
    default:
      return this.colorize(this.truncateString(value.toString()), 'white');
    }
  }

  /**
   * Format string value with quotes and truncation
   * @param {string} value - String value
   * @returns {string} Formatted string
   */
  formatString(value) {
    if (typeof value !== 'string') {
      value = String(value || '');
    }

    const truncated = this.truncateString(value);
    const hasNewlines = value.includes('\n') || value.includes('\r');
    
    if (hasNewlines) {
      const lineInfo = this.colorize('[multiline]', 'gray');
      return `${this.colorize(`"${truncated}"`, 'green')} ${lineInfo}`;
    }

    return this.colorize(`"${truncated}"`, 'green');
  }

  /**
   * Format array summary
   * @param {Object} variable - Array variable
   * @returns {string} Array summary
   */
  formatArraySummary(variable) {
    const count = variable.numchildren || variable.children || 0;
    if (count === 0) {
      return this.colorize('[]', 'yellow');
    }
    return this.colorize(`Array[${count}]`, 'yellow');
  }

  /**
   * Format object summary
   * @param {Object} variable - Object variable
   * @returns {string} Object summary
   */
  formatObjectSummary(variable) {
    const className = variable.classname || 'Object';
    const count = variable.numchildren || variable.children || 0;
    return this.colorize(`${className}[${count}]`, 'cyan');
  }

  /**
   * Format child properties
   * @param {Array} properties - Child properties
   * @param {number} depth - Current depth
   * @param {Object} options - Formatting options
   * @returns {string} Formatted children
   */
  formatChildren(properties, depth, options) {
    if (!Array.isArray(properties) || properties.length === 0) {
      return '';
    }

    const output = [];
    const maxItems = Math.min(properties.length, this.maxArrayItems);
    const sortedProperties = this.sortVariables(properties.slice(0, maxItems));

    for (const prop of sortedProperties) {
      output.push(this.formatVariable(prop, depth, options));
    }

    if (properties.length > this.maxArrayItems) {
      const remaining = properties.length - this.maxArrayItems;
      const indent = this.getIndent(depth);
      output.push(`${indent}${this.colorize(`... and ${remaining} more items`, 'gray')}`);
    }

    return output.join('\n');
  }

  /**
   * Sort variables for consistent display order
   * @param {Array} variables - Variables to sort
   * @returns {Array} Sorted variables
   */
  sortVariables(variables) {
    if (!Array.isArray(variables)) return [];

    return variables.slice().sort((a, b) => {
      // Sort by name, with numeric indices first
      const aName = a.name || '';
      const bName = b.name || '';

      // Check if both are numeric indices
      const aIsNumeric = /^\d+$/.test(aName);
      const bIsNumeric = /^\d+$/.test(bName);

      if (aIsNumeric && bIsNumeric) {
        return parseInt(aName, 10) - parseInt(bName, 10);
      }

      if (aIsNumeric && !bIsNumeric) return -1;
      if (!aIsNumeric && bIsNumeric) return 1;

      return aName.localeCompare(bName);
    });
  }

  /**
   * Get indentation for specified depth
   * @param {number} depth - Nesting depth
   * @returns {string} Indentation string
   */
  getIndent(depth) {
    return this.indent.repeat(depth);
  }

  /**
   * Truncate string to maximum length
   * @param {string} str - String to truncate
   * @returns {string} Truncated string
   */
  truncateString(str) {
    if (typeof str !== 'string') {
      str = String(str || '');
    }

    if (str.length <= this.maxStringLength) {
      return str;
    }

    return str.substring(0, this.maxStringLength - 3) + '...';
  }

  /**
   * Apply color formatting (if enabled)
   * @param {string} text - Text to colorize
   * @param {string} color - Color name
   * @returns {string} Colored text
   */
  colorize(text, color) {
    if (!this.colors) {
      return text;
    }

    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
      reset: '\x1b[0m'
    };

    const colorCode = colors[color] || colors.white;
    return `${colorCode}${text}${colors.reset}`;
  }

  /**
   * Format variables as JSON
   * @param {Array} variables - Variables to format
   * @param {Object} options - Formatting options
   * @returns {string} JSON string
   */
  formatAsJSON(variables, options = {}) {
    const simplified = this.simplifyVariables(variables, options);
    return JSON.stringify(simplified, null, 2);
  }

  /**
   * Simplify variables for JSON output
   * @param {Array} variables - Variables to simplify
   * @param {Object} options - Options
   * @returns {Array} Simplified variables
   */
  simplifyVariables(variables) {
    if (!Array.isArray(variables)) return [];

    return variables.map(variable => this.simplifyVariable(variable));
  }

  /**
   * Simplify single variable for JSON output
   * @param {Object} variable - Variable to simplify
   * @returns {Object} Simplified variable
   */
  simplifyVariable(variable) {
    const simplified = {
      name: variable.name,
      type: variable.type,
      value: variable.value,
      size: variable.size || null,
      constant: variable.constant || false,
      hasChildren: variable.hasChildren || false,
      numChildren: variable.numchildren || variable.children || 0
    };

    if (variable.classname) {
      simplified.className = variable.classname;
    }

    if (variable.hasChildren && variable.properties && variable.properties.length > 0) {
      simplified.properties = this.simplifyVariables(variable.properties);
    }

    return simplified;
  }

  /**
   * Create formatter with custom options
   * @param {Object} options - Formatter options
   * @returns {VariableFormatter} New formatter instance
   */
  static create(options = {}) {
    return new VariableFormatter(options);
  }
}

module.exports = VariableFormatter;