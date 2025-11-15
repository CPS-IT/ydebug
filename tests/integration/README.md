# Integration Tests Documentation

This documentation provides comprehensive guidance for developers working with YDebug's integration tests, which validate the complete Xdebug debugging workflow from environment setup to protocol communication.

## Overview

The integration tests ensure that YDebug can successfully communicate with Xdebug using the DBGp (Debug Protocol) specification. These tests validate:

- **Environment Detection**: PHP and Xdebug availability and configuration
- **Protocol Implementation**: DBGp client functionality and command handling
- **Real-world Integration**: Actual connections with Xdebug-enabled PHP processes
- **Error Handling**: Timeouts, connection failures, and cleanup procedures

The integration test suite consists of **12 comprehensive tests** that cover the entire debugging pipeline, from basic environment validation to full debugging session workflows.

## Test Structure

### Files Overview

| File | Purpose | Lines of Code |
|------|---------|---------------|
| `xdebug-connection.test.js` | Main integration test suite | 497 |
| `../utils/dbgp-test-server.js` | Reusable DBGp test server utility | 304 |

### Test Categories

1. **Environment Validation** (4 tests)
   - PHP availability detection
   - Xdebug extension verification  
   - Configuration validation
   - Test server utility verification

2. **DBGp Client Unit Tests** (3 tests)
   - Default configuration validation
   - Custom configuration handling
   - Connection timeout scenarios

3. **DBGp Protocol Integration** (3 tests)
   - Connection establishment and init message handling
   - Command/response cycle testing
   - Connection cleanup verification

4. **Real Xdebug Integration** (2 tests)
   - Actual Xdebug session connection
   - Full debugging workflow simulation

## Environment Requirements

### Required Software

- **PHP**: Version 8.3+ (tested with 8.4.7)
- **Xdebug**: Version 3.0+ (tested with 3.4.7)
- **Node.js**: For running the test suite
- **Operating System**: macOS, Linux, or Windows

### Xdebug Configuration

Your PHP installation must have Xdebug configured with the following settings:

```ini
[xdebug]
zend_extension=xdebug
xdebug.mode=debug
xdebug.client_host=localhost
xdebug.client_port=9003
xdebug.start_with_request=yes
```

### Verification Commands

Verify your environment setup:

```bash
# Check PHP version
php --version

# Verify Xdebug extension is loaded
php -m | grep xdebug

# Check Xdebug configuration
php -i | grep xdebug
```

## Running the Tests

### Complete Test Suite

Run all tests including integration tests:

```bash
npm test
```

### Integration Tests Only

Run only the integration test suite:

```bash
npm test -- tests/integration/xdebug-connection.test.js
```

### Specific Test Categories

Run individual test categories:

```bash
# Environment validation only
npm test -- tests/integration/xdebug-connection.test.js -t "Environment Validation"

# DBGp protocol tests only
npm test -- tests/integration/xdebug-connection.test.js -t "DBGp Protocol Integration"

# Real Xdebug tests only (requires full environment)
npm test -- tests/integration/xdebug-connection.test.js -t "Real Xdebug Integration"
```

### Verbose Output

For detailed test execution information:

```bash
npm test -- tests/integration/xdebug-connection.test.js --verbose
```

## Manual Environment Validation

### Step 1: Verify PHP Installation

```bash
php --version
```

Expected output:
```
PHP 8.4.7 (cli) (built: Nov  8 2024 10:15:23) (NTS)
Copyright (c) The PHP Group
Zend Engine v4.4.7, Copyright (c) Zend Technologies
```

### Step 2: Check Xdebug Extension

```bash
php -m | grep xdebug
```

Expected output:
```
xdebug
```

### Step 3: Validate Xdebug Version

```bash
php --version
```

Expected output (showing Xdebug version):
```
PHP 8.4.7 (cli) (built: Nov  8 2024 10:15:23) (NTS)
Copyright (c) The PHP Group
Zend Engine v4.4.7, Copyright (c) Zend Technologies
    with Xdebug v3.4.7, Copyright (c) 2002-2023, by Derick Rethans
```

**Note**: If you see "Cannot load Xdebug - it was already loaded" in the output, this is **normal and expected**. It indicates Xdebug is properly configured and loaded.

### Step 4: Check Critical Settings

```bash
php -i | grep -E "(xdebug.mode|xdebug.client_host|xdebug.client_port|xdebug.start_with_request)"
```

Expected output:
```
xdebug.mode => debug => debug
xdebug.client_host => localhost => localhost
xdebug.client_port => 9003 => 9003
xdebug.start_with_request => yes => yes
```

**Alternative command** (if the above produces too much output):
```bash
php -i | grep -E "^xdebug\.(mode|client_host|client_port|start_with_request)" | head -4
```

### Step 4a: Additional Validation Commands

If you need more detailed Xdebug information:

```bash
# Show all Xdebug-related configuration
php -i | grep xdebug

# List all loaded extensions (verify xdebug is present)  
php -m | grep -i xdebug

# Check specific Xdebug settings
php -i | grep "xdebug.mode\|xdebug.client_host\|xdebug.client_port\|xdebug.start_with_request"
```

**Important Notes**:
- **"Cannot load Xdebug - it was already loaded"** is a **normal message** that appears when Xdebug is properly configured
- Commands using `php -r` may hang when `xdebug.start_with_request=yes` because they trigger debugging sessions
- Use `php -i | grep` or `php --version` for reliable, non-blocking validation
- If commands hang, it usually means Xdebug is working correctly but trying to connect to a debugger

### Step 5: Test DBGp Connection

Create a test PHP file:

```php
<?php
// test-debug.php
echo "Testing Xdebug connection...\n";
$test = "Hello, Xdebug!";
echo $test . "\n";
?>
```

Run with debugging enabled:

```bash
XDEBUG_CONFIG="idekey=test" php test-debug.php
```

## Test Environment Behavior

### When Xdebug is Available

- All 12 tests run completely
- Real Xdebug integration tests execute with actual PHP processes
- Full protocol validation occurs
- Complete debugging workflow testing

### When Xdebug is Not Available

- Environment tests detect the absence and skip gracefully
- DBGp client unit tests continue to run (protocol independent)
- Real Xdebug tests are automatically skipped with informative messages
- Test suite still provides valuable coverage for supported environments

### Graceful Degradation

The tests are designed to provide maximum value regardless of environment:

```javascript
// Example of environment-aware testing
if (!phpAvailable || !xdebugAvailable) {
  console.log('Skipping real Xdebug test - PHP or Xdebug not available');
  return;
}
```

## Troubleshooting

### Common Issues and Solutions

#### PHP Not Found

**Problem**: Tests fail with "PHP not available"

**Solutions**:
- Install PHP: `brew install php` (macOS) or `sudo apt-get install php` (Ubuntu)
- Verify PATH includes PHP binary location
- Check PHP installation: `which php`

#### Xdebug Extension Missing

**Problem**: "Xdebug extension not found"

**Solutions**:
- Install Xdebug: `pecl install xdebug`
- Enable in php.ini: `zend_extension=xdebug`
- Verify installation: `php -m | grep xdebug`

#### Xdebug Configuration Issues

**Problem**: Tests detect Xdebug but configuration validation fails

**Solutions**:
- Check php.ini location: `php --ini`
- Add required configuration:
  ```ini
  xdebug.mode=debug
  xdebug.client_host=localhost
  xdebug.client_port=9003
  xdebug.start_with_request=yes
  ```
- Restart web server/PHP-FPM if applicable

#### Validation Commands Hanging

**Problem**: Commands like `php -r "..."` hang or timeout during validation

**Cause**: When `xdebug.start_with_request=yes` is configured, PHP scripts automatically try to connect to a debugger

**Solutions**:
- Use `php --version` instead of `php -r` commands
- Use `php -i | grep xdebug` for configuration validation
- Use `php -m | grep xdebug` to verify extension loading
- Avoid interactive PHP commands when `start_with_request=yes`

#### "Cannot load Xdebug" Messages

**Problem**: Seeing "Cannot load Xdebug - it was already loaded" in output

**Status**: **This is normal and expected behavior**

**Explanation**:
- This message appears when Xdebug is properly configured and loaded
- It indicates the extension is working correctly, not an error
- The message can safely be ignored during validation
- It confirms Xdebug is available for debugging sessions

#### Port Already in Use

**Problem**: "Port 9003 already in use" or connection timeouts

**Solutions**:
- Check for running processes: `lsof -i :9003`
- Kill conflicting processes: `kill -9 <PID>`
- Use alternative port in test configuration
- Ensure no IDE debuggers are listening on port 9003

#### Connection Timeouts

**Problem**: Tests timeout waiting for Xdebug connections

**Solutions**:
- Increase timeout values in test configuration
- Verify firewall settings allow localhost connections
- Check Xdebug client_host configuration
- Ensure no antivirus blocking connections

### Debug Mode

For detailed debugging information, enable verbose test output:

```bash
DEBUG=1 npm test -- tests/integration/xdebug-connection.test.js --verbose
```

### Test Isolation Issues

If tests are interfering with each other:

```bash
# Run tests in isolation
npm test -- tests/integration/xdebug-connection.test.js --runInBand
```

## Developer Setup

### Quick Development Environment Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install PHP and Xdebug**:
   ```bash
   # macOS with Homebrew
   brew install php
   pecl install xdebug
   
   # Ubuntu/Debian
   sudo apt-get install php php-xdebug
   ```

3. **Configure Xdebug**:
   Add to your php.ini:
   ```ini
   [xdebug]
   zend_extension=xdebug
   xdebug.mode=debug
   xdebug.client_host=localhost
   xdebug.client_port=9003
   xdebug.start_with_request=yes
   ```

4. **Validate Setup**:
   ```bash
   npm test -- tests/integration/xdebug-connection.test.js
   ```

### Development Workflow

1. **Make Changes**: Modify DBGp client or protocol handling
2. **Run Unit Tests**: `npm test`
3. **Run Integration Tests**: `npm test -- tests/integration/xdebug-connection.test.js`
4. **Verify Coverage**: `npm run test:coverage`
5. **Check All Environments**: Test with/without Xdebug available

### Adding New Integration Tests

When adding new integration tests:

1. **Follow the Pattern**:
   ```javascript
   describe('New Test Category', () => {
     test('should validate new functionality', async () => {
       if (!xdebugAvailable) {
         console.log('Skipping test - Xdebug not available');
         return;
       }
       
       // Your test implementation
     });
   });
   ```

2. **Use DBGpTestServer**: Utilize the reusable test server utility
3. **Handle Cleanup**: Ensure proper resource cleanup in afterEach
4. **Add Timeouts**: Set appropriate timeouts for async operations
5. **Test Graceful Degradation**: Verify tests skip appropriately

### Environment Detection

CI environments automatically benefit from graceful degradation:

- **With Xdebug**: Full integration test coverage
- **Without Xdebug**: Core functionality tests still validate protocol implementation
- **Test Results**: Clear indication of which tests ran vs. skipped

### Performance Considerations

| Test Category           | Typical Duration | Resource Usage              |
|-------------------------|------------------|-----------------------------|
| Environment Validation  | 1-3 seconds      | Low CPU, minimal memory     |
| DBGp Client Unit        | 0.5-2 seconds    | Low CPU, minimal memory     |
| Protocol Integration    | 2-8 seconds      | Medium CPU, moderate memory |
| Real Xdebug Integration | 5-15 seconds     | High CPU, moderate memory   |

Total integration test runtime: **8-28 seconds** (depending on environment)

## Test Coverage

Current integration test coverage includes:

* [x] PHP environment detection
* [x] Xdebug extension validation  
* [x] Configuration requirement verification
* [x] DBGp client instantiation and configuration
* [x] Connection timeout handling
* [x] Protocol handshake simulation
* [x] Command/response cycle testing
* [x] Resource cleanup verification
* [x] Real Xdebug session establishment
* [x] Full debugging workflow simulation
* [x] Error condition handling
* [x] Environment-aware test skipping

## Next Steps

After successfully running the integration tests:

1. **Explore the Test Code**: Review `xdebug-connection.test.js` to understand implementation patterns
2. **Study the DBGp Server**: Examine `dbgp-test-server.js` for protocol details
3. **Run Main Application**: Try the YDebug tool with your PHP projects
4. **Contribute**: Consider adding tests for additional scenarios or edge cases

## Related Resources

- [DBGp Protocol Specification](https://xdebug.org/docs/dbgp)
- [Xdebug Documentation](https://xdebug.org/docs/)
- [YDebug Main Documentation](../../README.md)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

---

This integration test suite ensures YDebug provides reliable debugging capabilities across diverse development environments. The tests balance comprehensive validation with practical usability, automatically adapting to available environment capabilities while providing clear guidance for optimal setup.
