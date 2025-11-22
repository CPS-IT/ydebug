# Feature 035: JsonRpcMessageValidator Refactor

## Overview

Refactor the JsonRpcHandler class to extract message validation logic into a dedicated JsonRpcMessageValidator class, improving code organization, testability, and reusability.

## Background

The JsonRpcHandler class currently contains both message handling logic and validation logic in a `validateMessage` method. This creates tight coupling and makes the validation logic difficult to test and reuse independently.

## Goals

1. **Separation of Concerns**: Extract validation logic into a dedicated class
2. **Improved Testability**: Enable independent testing of validation rules
3. **Code Reusability**: Allow validation logic to be used by other components
4. **Better Maintainability**: Simplify JsonRpcHandler by focusing on protocol handling

## Proposed Solution

### New Class: JsonRpcMessageValidator

Create a new class `src/mcp/protocol/JsonRpcMessageValidator.js` with the following structure:

```javascript
class JsonRpcMessageValidator {
  /**
   * Validate JSON-RPC 2.0 message format
   * @param {*} message - Message to validate
   * @returns {object} Validation result { valid: boolean, error?: string }
   */
  validateMessage(message) {
    // Check if message is an object (and not an array or null)
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return { valid: false, error: 'Message must be an object' };
    }

    // Check JSON-RPC version
    if (message.jsonrpc === undefined) {
      return { valid: false, error: 'Missing jsonrpc field' };
    }
    if (message.jsonrpc !== '2.0') {
      return { valid: false, error: 'Invalid jsonrpc version' };
    }

    // Check if it's a request, response, or notification
    if (message.method !== undefined) {
      return this.#validateRequestOrNotification(message);
    } else if (message.result !== undefined || message.error !== undefined) {
      return this.#validateResponse(message);
    } else {
      return this.#validateUnknownMessage(message);
    }
  }

  /**
   * Validate request or notification message format
   * @param {object} message - Request/notification message
   * @returns {object} Validation result
   */
  #validateRequestOrNotification(message) {
    if (typeof message.method !== 'string') {
      return { valid: false, error: 'Method must be a string' };
    }

    // Validate ID for requests (notifications don't have ID)
    if (message.id !== undefined) {
      if (typeof message.id !== 'string' && typeof message.id !== 'number' && message.id !== null) {
        return { valid: false, error: 'ID must be string, number, or null' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate response message format
   * @param {object} message - Response message
   * @returns {object} Validation result
   */
  #validateResponse(message) {
    if (message.result !== undefined && message.error !== undefined) {
      return { valid: false, error: 'Response cannot have both result and error fields' };
    }

    // Validate error format
    if (message.error !== undefined) {
      const errorValidation = this.#validateErrorObject(message.error);
      if (!errorValidation.valid) {
        return errorValidation;
      }
    }

    // Response must have ID (except for error responses to notifications)
    if (message.id === undefined && message.error === undefined) {
      return { valid: false, error: 'Response must have an ID' };
    }

    return { valid: true };
  }

  /**
   * Validate error response format
   * @param {object} errorObject - Error object
   * @returns {object} Validation result
   */
  #validateErrorObject(errorObject) {
    if (typeof errorObject !== 'object' || !errorObject || Array.isArray(errorObject)) {
      return { valid: false, error: 'Error must be an object' };
    }
    if (typeof errorObject.code !== 'number') {
      return { valid: false, error: 'Error code must be a number' };
    }
    if (typeof errorObject.message !== 'string') {
      return { valid: false, error: 'Error message must be a string' };
    }
    return { valid: true };
  }

  /**
   * Validate messages that don't fit standard patterns
   * @param {object} message - Unknown message type
   * @returns {object} Validation result
   */
  #validateUnknownMessage(message) {
    // Message has neither method nor result/error
    // If it has ID, it's likely intended as a response
    if (message.id !== undefined) {
      return { valid: false, error: 'Response must have result or error field' };
    } else {
      return { valid: false, error: 'Request must have method field' };
    }
  }
}
```

### Refactored JsonRpcHandler

Update JsonRpcHandler to use the new validator:

```javascript
const JsonRpcMessageValidator = require('./JsonRpcMessageValidator');

class JsonRpcHandler {
  constructor() {
    this.validator = new JsonRpcMessageValidator();
  }

  parseMessage(data) {
    // Handle empty strings
    if (data === '') {
      return { 
        success: false, 
        error: 'Empty message' 
      };
    }
    
    // Handle other falsy inputs that aren't valid JSON strings
    if (data == null || typeof data !== 'string') {
      return { 
        success: false, 
        error: 'Invalid JSON: input must be a string' 
      };
    }
    
    try {
      const message = JSON.parse(data);
      const validation = this.validator.validateMessage(message);
      
      if (!validation.valid) {
        return { 
          success: false, 
          error: validation.error 
        };
      }

      return { 
        success: true, 
        message 
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Invalid JSON: ${error.message}` 
      };
    }
  }
}
```

## Implementation Tasks

### Task 1: Create JsonRpcMessageValidator Class
- [ ] Create `src/mcp/protocol/JsonRpcMessageValidator.js`
- [ ] Extract validation logic from JsonRpcHandler
- [ ] Implement modular private validation methods
- [ ] Add comprehensive JSDoc documentation

### Task 2: Refactor JsonRpcHandler
- [ ] Remove private `#validateMessage` method
- [ ] Integrate JsonRpcMessageValidator instance
- [ ] Update parseMessage method to use validator
- [ ] Maintain backward compatibility

### Task 3: Create Dedicated Tests
- [ ] Create `tests/mcp/protocol/JsonRpcMessageValidator.test.js`
- [ ] Move validation tests from JsonRpcHandler tests
- [ ] Test only the public `validateMessage` method
- [ ] Ensure 100% test coverage through public interface

### Task 4: Update Integration Tests
- [ ] Update JsonRpcHandler.enhanced.test.js to use public validator.validateMessage()
- [ ] Verify all existing tests still pass
- [ ] Add integration tests between Handler and Validator

## Success Criteria

1. **Clean Separation**: JsonRpcHandler focuses only on protocol handling
2. **Independent Testing**: Validation logic can be tested through public interface
3. **No Regression**: All existing tests pass without modification
4. **Improved Coverage**: Enhanced testability leads to better coverage
5. **Reusability**: Validator can be used by other MCP components

## Testing Strategy

### Unit Tests
- Public `validateMessage` method tests covering all code paths
- Edge case coverage for all validation rules through public interface
- Error message accuracy verification
- Private methods tested indirectly through public method

### Integration Tests
- JsonRpcHandler + JsonRpcMessageValidator interaction
- Full message processing pipeline testing
- Backward compatibility verification

### Performance Tests
- Validation performance benchmarks
- Memory usage comparison
- Ensure no performance regression

## Migration Path

### Phase 1: Create Validator (Non-breaking)
1. Create JsonRpcMessageValidator class
2. Implement public validateMessage and private helper methods
3. Add comprehensive tests using only public interface
4. Validate against existing test cases

### Phase 2: Integrate Validator (Non-breaking)
1. Add validator instance to JsonRpcHandler
2. Update parseMessage to use validator.validateMessage()
3. Keep private method as fallback
4. Run full test suite

### Phase 3: Complete Migration (Breaking)
1. Remove private #validateMessage method from JsonRpcHandler
2. Update test references to use validator.validateMessage()
3. Clean up unused imports
4. Final verification

## Architecture Benefits

### Before
```
JsonRpcHandler
├── parseMessage()
├── serializeMessage()
├── isRequest()
├── isNotification()
├── isResponse()
└── #validateMessage() [private - hard to test independently]
```

### After
```
JsonRpcHandler
├── parseMessage() → uses validator.validateMessage()
├── serializeMessage()
├── isRequest()
├── isNotification()
└── isResponse()

JsonRpcMessageValidator [independently testable]
├── validateMessage() [PUBLIC - main entry point]
├── #validateRequestOrNotification() [private]
├── #validateResponse() [private]
├── #validateErrorObject() [private]
└── #validateUnknownMessage() [private]
```

## Future Enhancements

1. **Custom Validation Rules**: Allow registration of custom validators
2. **Schema-based Validation**: Integration with JSON Schema validation
3. **Performance Optimization**: Caching and optimization for high-volume scenarios
4. **Validation Profiles**: Different validation strictness levels

## Dependencies

- No new external dependencies required
- Uses existing project structure and patterns
- Maintains compatibility with current MCP implementation

## Timeline

- **Phase 1**: Create JsonRpcMessageValidator class and tests (3 days)
- **Phase 2**: Integrate validator into JsonRpcHandler (2 days)
- **Phase 3**: Complete migration and cleanup (2 days)
- **Final**: Documentation and performance verification (1 day)

## Related Features

- **Feature 027**: MCP Server Foundation (base architecture)
- **Feature 028**: MCP Debugging Tools (uses JsonRpcHandler)
- **Future Feature**: Advanced MCP validation and schema support
