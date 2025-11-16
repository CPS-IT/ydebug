/**
 * VariableContextResource MCP Resource
 * Provides access to current scope variable states and context information
 */

const BaseMCPResource = require('./BaseMCPResource');

class VariableContextResource extends BaseMCPResource {
  constructor(services) {
    super(
      'ydebug://variable-context',
      'Variable Context',
      'Current scope variable states, values, and context information'
    );
    
    this.services = services;
    
    // Enable subscriptions with short cache TTL (variables change frequently)
    this.enableSubscriptions();
    this.setCacheable(1500); // 1.5 second cache TTL
    
    this.bindServiceEvents();
  }

  /**
   * Read current variable context data
   * @param {object} options - Read options
   * @returns {Promise<object>} Variable context data
   */
  async read(options = {}) {
    const validatedOptions = this.validateReadOptions(options);
    
    try {
      const variableData = await this.getVariableContextData(validatedOptions);
      
      // Apply filtering
      let filteredData = variableData;
      if (validatedOptions.filter) {
        filteredData = this.applyVariableFilter(filteredData, validatedOptions.filter);
      }

      // Apply pagination to variables if requested
      if (filteredData.variables && validatedOptions.limit) {
        const variableEntries = Object.entries(filteredData.variables);
        const paginatedEntries = this.applyPagination(variableEntries, validatedOptions);
        filteredData.variables = Object.fromEntries(paginatedEntries);
        filteredData.paginationApplied = true;
        filteredData.totalVariables = variableEntries.length;
      }

      return {
        ...filteredData,
        timestamp: Date.now()
      };
      
    } catch (error) {
      throw this.formatError(error, 'Reading variable context data');
    }
  }

  /**
   * Get comprehensive variable context data
   * @param {object} options - Read options
   * @returns {Promise<object>} Variable context data
   * @private
   */
  async getVariableContextData(options) {
    const debuggerService = this.services.get('debugger');
    // const sessionService = this.services.get('session'); // Currently unused
    
    if (!debuggerService || !debuggerService.isConnected()) {
      return {
        status: 'disconnected',
        scope: null,
        variables: {},
        context: {},
        statistics: {
          totalVariables: 0,
          typeDistribution: {},
          nullUndefinedCount: 0
        }
      };
    }

    try {
      // Get current scope information
      const scope = await debuggerService.getCurrentScope();
      
      // Get variables for requested scopes
      const scopesToRetrieve = this.determineScopesToRetrieve(options, scope);
      const variableData = await this.getVariablesForScopes(scopesToRetrieve);
      
      // Get additional context information
      const context = await this.getVariableContext(scope);
      
      // Calculate statistics
      const statistics = this.calculateVariableStatistics(variableData.variables);

      return {
        status: 'connected',
        scope: this.formatScopeInfo(scope),
        variables: variableData.variables,
        scopeHierarchy: variableData.scopeHierarchy,
        context: context,
        statistics: statistics,
        lastRefresh: Date.now()
      };
      
    } catch (error) {
      this.logger.error('Failed to get variable context data', error);
      throw error;
    }
  }

  /**
   * Determine which scopes to retrieve based on options
   * @param {object} options - Read options
   * @param {object} currentScope - Current scope info
   * @returns {Array} Scopes to retrieve
   * @private
   */
  determineScopesToRetrieve(options, currentScope) {
    const requestedScope = options.scope || 'current';
    
    switch (requestedScope) {
    case 'local':
      return [{ type: 'local', depth: 0 }];
    case 'global':
      return [{ type: 'global', depth: -1 }];
    case 'all':
      return [
        { type: 'local', depth: 0 },
        { type: 'global', depth: -1 }
      ];
    case 'current':
    default:
      return [{ type: currentScope?.type || 'local', depth: 0 }];
    }
  }

  /**
   * Get variables for specified scopes
   * @param {Array} scopes - Scopes to retrieve
   * @returns {Promise<object>} Variables and hierarchy
   * @private
   */
  async getVariablesForScopes(scopes) {
    const debuggerService = this.services.get('debugger');
    const allVariables = {};
    const scopeHierarchy = [];

    for (const scope of scopes) {
      try {
        const scopeVariables = await debuggerService.getScopeVariables(scope.type, scope.depth);
        const formattedScope = {
          type: scope.type,
          depth: scope.depth,
          variableCount: Object.keys(scopeVariables).length,
          variables: {}
        };

        // Format variables for this scope
        Object.entries(scopeVariables).forEach(([name, value]) => {
          const formattedVariable = this.formatVariableInfo(name, value, scope.type);
          allVariables[`${scope.type}:${name}`] = formattedVariable;
          formattedScope.variables[name] = formattedVariable;
        });

        scopeHierarchy.push(formattedScope);
        
      } catch (error) {
        this.logger.warn(`Failed to get variables for scope ${scope.type}:${scope.depth}`, error);
        scopeHierarchy.push({
          type: scope.type,
          depth: scope.depth,
          error: error.message,
          variableCount: 0,
          variables: {}
        });
      }
    }

    return {
      variables: allVariables,
      scopeHierarchy: scopeHierarchy
    };
  }

  /**
   * Format variable information with enhanced details
   * @param {string} name - Variable name
   * @param {*} value - Variable value
   * @param {string} scope - Variable scope
   * @returns {object} Formatted variable info
   * @private
   */
  formatVariableInfo(name, value, scope) {
    const info = {
      name: name,
      scope: scope,
      value: value,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      size: this.getVariableSize(value),
      preview: this.getVariablePreview(value)
    };

    // Add type-specific information
    if (Array.isArray(value)) {
      info.isArray = true;
      info.length = value.length;
      info.elementTypes = this.analyzeArrayElementTypes(value);
    } else if (value !== null && typeof value === 'object') {
      info.isObject = true;
      info.properties = Object.keys(value);
      info.propertyCount = info.properties.length;
      info.nestedLevels = this.calculateNestedLevels(value);
    } else if (typeof value === 'string') {
      info.stringLength = value.length;
      info.multiline = value.includes('\n');
    } else if (typeof value === 'number') {
      info.isFinite = Number.isFinite(value);
      info.isInteger = Number.isInteger(value);
    }

    // Add memory and complexity indicators
    info.complexity = this.assessVariableComplexity(value);
    info.estimatedMemory = this.estimateMemoryUsage(value);

    return info;
  }

  /**
   * Get additional variable context information
   * @param {object} scope - Current scope
   * @returns {Promise<object>} Context information
   * @private
   */
  async getVariableContext(scope) {
    const debuggerService = this.services.get('debugger');
    
    try {
      const position = await debuggerService.getCurrentPosition();
      
      return {
        currentFunction: position?.function || null,
        currentClass: position?.class || null,
        currentMethod: position?.method || null,
        currentFile: position?.filename || null,
        currentLine: position?.line || null,
        scopeType: scope?.type || 'unknown',
        scopeDepth: scope?.depth || 0,
        callStackDepth: await this.getCallStackDepth()
      };
      
    } catch (error) {
      this.logger.debug('Failed to get variable context', error);
      return {
        currentFunction: null,
        currentClass: null,
        currentMethod: null,
        currentFile: null,
        currentLine: null,
        scopeType: 'unknown',
        scopeDepth: 0,
        callStackDepth: 0
      };
    }
  }

  /**
   * Calculate variable statistics
   * @param {object} variables - Variables object
   * @returns {object} Statistics
   * @private
   */
  calculateVariableStatistics(variables) {
    const stats = {
      totalVariables: 0,
      typeDistribution: {},
      nullUndefinedCount: 0,
      arrayCount: 0,
      objectCount: 0,
      stringTotalLength: 0,
      largestArray: 0,
      deepestObject: 0,
      complexVariables: 0
    };

    Object.values(variables).forEach(varInfo => {
      stats.totalVariables++;
      
      // Type distribution
      const type = varInfo.type;
      stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1;
      
      // Null/undefined count
      if (varInfo.isNull || varInfo.isUndefined) {
        stats.nullUndefinedCount++;
      }
      
      // Array statistics
      if (varInfo.isArray) {
        stats.arrayCount++;
        if (varInfo.length > stats.largestArray) {
          stats.largestArray = varInfo.length;
        }
      }
      
      // Object statistics
      if (varInfo.isObject) {
        stats.objectCount++;
        if (varInfo.nestedLevels > stats.deepestObject) {
          stats.deepestObject = varInfo.nestedLevels;
        }
      }
      
      // String statistics
      if (type === 'string' && varInfo.stringLength) {
        stats.stringTotalLength += varInfo.stringLength;
      }
      
      // Complexity
      if (varInfo.complexity === 'high') {
        stats.complexVariables++;
      }
    });

    return stats;
  }

  /**
   * Apply variable-specific filtering
   * @param {object} data - Variable context data
   * @param {string|object} filter - Filter criteria
   * @returns {object} Filtered data
   * @private
   */
  applyVariableFilter(data, filter) {
    if (typeof filter === 'string') {
      return this.applyPresetVariableFilter(data, filter);
    }

    if (typeof filter === 'object') {
      return this.applyCustomVariableFilter(data, filter);
    }

    return data;
  }

  /**
   * Apply preset variable filter
   * @param {object} data - Variable context data
   * @param {string} filterType - Preset filter type
   * @returns {object} Filtered data
   * @private
   */
  applyPresetVariableFilter(data, filterType) {
    let filteredVariables = data.variables;

    switch (filterType) {
    case 'null-undefined':
      filteredVariables = this.filterVariablesByPredicate(data.variables, 
        (varInfo) => varInfo.isNull || varInfo.isUndefined);
      break;
    case 'arrays':
      filteredVariables = this.filterVariablesByPredicate(data.variables, 
        (varInfo) => varInfo.isArray);
      break;
    case 'objects':
      filteredVariables = this.filterVariablesByPredicate(data.variables, 
        (varInfo) => varInfo.isObject);
      break;
    case 'primitives':
      filteredVariables = this.filterVariablesByPredicate(data.variables, 
        (varInfo) => !varInfo.isArray && !varInfo.isObject);
      break;
    case 'complex':
      filteredVariables = this.filterVariablesByPredicate(data.variables, 
        (varInfo) => varInfo.complexity === 'high');
      break;
    case 'local-only':
      filteredVariables = this.filterVariablesByPredicate(data.variables, 
        (varInfo) => varInfo.scope === 'local');
      break;
    case 'global-only':
      filteredVariables = this.filterVariablesByPredicate(data.variables, 
        (varInfo) => varInfo.scope === 'global');
      break;
    case 'statistics-only':
      return {
        status: data.status,
        statistics: data.statistics,
        context: data.context,
        timestamp: Date.now()
      };
    default:
      break;
    }

    return {
      ...data,
      variables: filteredVariables,
      filterApplied: filterType,
      filteredCount: Object.keys(filteredVariables).length
    };
  }

  /**
   * Apply custom variable filter
   * @param {object} data - Variable context data
   * @param {object} filter - Custom filter object
   * @returns {object} Filtered data
   * @private
   */
  applyCustomVariableFilter(data, filter) {
    let filteredVariables = data.variables;

    // Filter by type
    if (filter.type) {
      filteredVariables = this.filterVariablesByPredicate(filteredVariables, 
        (varInfo) => varInfo.type === filter.type);
    }

    // Filter by name pattern
    if (filter.namePattern) {
      const pattern = new RegExp(filter.namePattern, 'i');
      filteredVariables = this.filterVariablesByPredicate(filteredVariables, 
        (varInfo) => pattern.test(varInfo.name));
    }

    // Filter by scope
    if (filter.scope) {
      filteredVariables = this.filterVariablesByPredicate(filteredVariables, 
        (varInfo) => varInfo.scope === filter.scope);
    }

    // Filter by size
    if (filter.minSize !== undefined) {
      filteredVariables = this.filterVariablesByPredicate(filteredVariables, 
        (varInfo) => varInfo.size >= filter.minSize);
    }

    if (filter.maxSize !== undefined) {
      filteredVariables = this.filterVariablesByPredicate(filteredVariables, 
        (varInfo) => varInfo.size <= filter.maxSize);
    }

    return {
      ...data,
      variables: filteredVariables,
      filterApplied: 'custom',
      filteredCount: Object.keys(filteredVariables).length,
      filterCriteria: filter
    };
  }

  /**
   * Filter variables by predicate function
   * @param {object} variables - Variables object
   * @param {Function} predicate - Filter predicate
   * @returns {object} Filtered variables
   * @private
   */
  filterVariablesByPredicate(variables, predicate) {
    const filtered = {};
    
    Object.entries(variables).forEach(([key, varInfo]) => {
      if (predicate(varInfo)) {
        filtered[key] = varInfo;
      }
    });
    
    return filtered;
  }

  /**
   * Helper methods for variable analysis
   */

  getVariableSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return Object.keys(value).length;
    return 1;
  }

  getVariablePreview(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    const str = String(value);
    if (str.length <= 100) return str;
    
    return str.substring(0, 97) + '...';
  }

  analyzeArrayElementTypes(array) {
    const types = {};
    array.forEach(element => {
      const type = typeof element;
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  calculateNestedLevels(obj, currentLevel = 0) {
    if (typeof obj !== 'object' || obj === null) return currentLevel;
    
    let maxLevel = currentLevel;
    
    Object.values(obj).forEach(value => {
      if (typeof value === 'object' && value !== null) {
        const level = this.calculateNestedLevels(value, currentLevel + 1);
        if (level > maxLevel) maxLevel = level;
      }
    });
    
    return maxLevel;
  }

  assessVariableComplexity(value) {
    if (value === null || value === undefined) return 'low';
    if (typeof value !== 'object') return 'low';
    
    const size = this.getVariableSize(value);
    const levels = this.calculateNestedLevels(value);
    
    if (size > 100 || levels > 5) return 'high';
    if (size > 20 || levels > 2) return 'medium';
    return 'low';
  }

  estimateMemoryUsage(value) {
    // Rough estimation in bytes
    if (value === null || value === undefined) return 8;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (typeof value === 'string') return value.length * 2;
    if (Array.isArray(value)) return value.length * 8 + 32;
    if (typeof value === 'object') return Object.keys(value).length * 16 + 32;
    return 8;
  }

  async getCallStackDepth() {
    try {
      const debuggerService = this.services.get('debugger');
      const callStack = await debuggerService.getCallStack();
      return Array.isArray(callStack) ? callStack.length : 0;
    } catch {
      return 0;
    }
  }

  formatScopeInfo(scope) {
    if (!scope) return null;
    
    return {
      type: scope.type,
      depth: scope.depth,
      name: scope.name || null,
      parentScope: scope.parent || null
    };
  }

  /**
   * Bind to service events for real-time updates
   */
  bindServiceEvents() {
    if (this.services.has('debugger')) {
      const debuggerService = this.services.get('debugger');
      
      debuggerService.on('execution:stepped', () => {
        this.handleVariableChange('execution_stepped');
      });
      
      debuggerService.on('scope:changed', (scope) => {
        this.handleVariableChange('scope_changed', { scope });
      });
      
      debuggerService.on('variables:modified', (variables) => {
        this.handleVariableChange('variables_modified', { variables });
      });
    }
  }

  /**
   * Handle variable context change events
   */
  handleVariableChange(changeType, data = {}) {
    this.notifyUpdate({
      changeType: changeType,
      eventData: data
    });
  }

  /**
   * Validate read options specific to variable context resource
   */
  validateReadOptions(options) {
    const baseOptions = super.validateReadOptions(options);
    
    const validFilters = ['null-undefined', 'arrays', 'objects', 'primitives', 'complex', 'local-only', 'global-only', 'statistics-only'];
    
    if (baseOptions.filter && typeof baseOptions.filter === 'string') {
      if (!validFilters.includes(baseOptions.filter)) {
        this.logger.warn(`Invalid variable context filter: ${baseOptions.filter}. Using default.`);
        baseOptions.filter = null;
      }
    }

    // Validate scope option
    const validScopes = ['local', 'global', 'current', 'all'];
    if (options.scope && !validScopes.includes(options.scope)) {
      this.logger.warn(`Invalid scope option: ${options.scope}. Using 'current'.`);
      baseOptions.scope = 'current';
    } else {
      baseOptions.scope = options.scope || 'current';
    }

    return baseOptions;
  }
}

module.exports = VariableContextResource;