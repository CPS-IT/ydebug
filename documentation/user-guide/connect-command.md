# YDebug Connect Command - User Guide

## Overview

The `ydebug connect` command tests connectivity to your Xdebug debugger and validates the DBGp protocol handshake. This command is essential for verifying that your debugging environment is properly configured and ready for use with YDebug.

## Purpose

Use the connect command to:

* [x] Verify Xdebug is running and accessible
* [x] Test DBGp protocol communication
* [x] Validate connection settings before debugging sessions
* [x] Troubleshoot connection issues with detailed error information
* [x] Confirm your PHP debugging environment is ready

## Requirements

### PHP Configuration

Your PHP environment must have Xdebug installed and configured. Add these settings to your `php.ini`:

```ini
zend_extension=xdebug
xdebug.mode=debug
xdebug.client_host=localhost
xdebug.client_port=9003
xdebug.start_with_request=yes
```

### Network Requirements

* The specified host must be accessible from your machine
* The specified port must be open and available
* Firewall settings should allow connections to the debug port

## Command Syntax

```bash
ydebug connect [options]
```

### Command Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--host <host>` | `-h` | Debugger host address | `localhost` |
| `--port <port>` | `-p` | Debugger port number | `9003` |
| `--timeout <ms>` | `-t` | Connection timeout in milliseconds | `10000` |

## Usage Examples

### Basic Connection Test

Test connection with default settings (localhost:9003):

```bash
ydebug connect
```

### Custom Host and Port

Connect to a remote debugger:

```bash
ydebug connect --host 192.168.1.100 --port 9000
```

### Extended Timeout

Increase timeout for slow connections:

```bash
ydebug connect --timeout 30000
```

### Complete Custom Configuration

```bash
ydebug connect --host remote-server.example.com --port 9001 --timeout 15000
```

## Configuration

### Configuration Files

YDebug loads connection settings from configuration files in this order:

1. `ydebug.config.json` (project-specific)
2. `.ydebug.json` (project-specific)
3. `~/.ydebug.json` (user-specific)

### Sample Configuration File

Create `ydebug.config.json` in your project root:

```json
{
  "xdebug": {
    "host": "localhost",
    "port": 9003,
    "timeout": 30000
  },
  "logging": {
    "level": "info"
  }
}
```

### Configuration Precedence

Settings are applied in this order (higher priority overrides lower):

1. **Default values** (localhost:9003, 10s timeout)
2. **Configuration file settings**
3. **Command-line options** (highest priority)

### Creating Configuration

Generate a sample configuration file:

```bash
ydebug config --init
```

View current configuration:

```bash
ydebug config --show
```

## Output Examples

### Successful Connection

```
Testing connection to Xdebug at localhost:9003...
✓ Connected to Xdebug successfully!

Connection Details:
  Host: localhost
  Port: 9003
  Connection Time: 45ms

Session Information:
  Application ID: myapp
  IDE Key: PHPSTORM
  Session: 12345
  Language: PHP
  Protocol Version: 1.0
  Initial File: file:///path/to/script.php

Xdebug connection test completed successfully!
Your debugging environment is ready.
```

### Failed Connection

```
Testing connection to Xdebug at localhost:9003...
✗ Failed to connect to Xdebug

Connection Attempt:
  Host: localhost
  Port: 9003
  Timeout: 10000ms
  Time Elapsed: 10001ms

Error Details:
  ECONNREFUSED

Troubleshooting:
  • Connection refused - Xdebug is likely not running or listening
  • Verify Xdebug is configured to listen on localhost:9003
  • Check your PHP configuration for xdebug.mode=debug
  • Ensure xdebug.start_with_request=yes or trigger debugging manually

Common Xdebug Configuration (php.ini):
  zend_extension=xdebug
  xdebug.mode=debug
  xdebug.client_host=localhost
  xdebug.client_port=9003
  xdebug.start_with_request=yes

For more help, check the YDebug documentation or run `ydebug config --show`
```

## Troubleshooting

### Common Issues and Solutions

#### Connection Refused (ECONNREFUSED)

**Problem**: Xdebug is not running or not listening on the specified port.

**Solutions**:
* Verify Xdebug is installed: `php -m | grep xdebug`
* Check PHP configuration: `php --ini`
* Ensure `xdebug.mode=debug` is set
* Verify `xdebug.client_port` matches your connection port
* Restart your web server after configuration changes

#### Connection Timeout (ETIMEDOUT)

**Problem**: Connection is timing out, possibly due to network issues or slow response.

**Solutions**:
* Increase timeout: `ydebug connect --timeout 30000`
* Check network connectivity
* Verify firewall settings allow the debug port
* Test with a local connection first

#### Host Not Found (ENOTFOUND)

**Problem**: The specified hostname cannot be resolved.

**Solutions**:
* Verify the hostname is correct
* Try using an IP address instead: `ydebug connect --host 192.168.1.100`
* Check DNS resolution: `nslookup hostname`

#### Connection Reset (ECONNRESET)

**Problem**: Xdebug closed the connection unexpectedly.

**Solutions**:
* Check Xdebug version compatibility
* Review PHP error logs for issues
* Verify Xdebug configuration is complete

### Xdebug Configuration Examples

#### For Development (php.ini)

```ini
zend_extension=xdebug
xdebug.mode=debug
xdebug.client_host=localhost
xdebug.client_port=9003
xdebug.start_with_request=yes
xdebug.log=/tmp/xdebug.log
```

#### For Remote Debugging

```ini
zend_extension=xdebug
xdebug.mode=debug
xdebug.client_host=192.168.1.100
xdebug.client_port=9003
xdebug.start_with_request=trigger
xdebug.trigger_value=my_ide_key
```

#### For Docker Environments

```ini
zend_extension=xdebug
xdebug.mode=debug
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.start_with_request=yes
```

### Debugging Configuration Issues

#### Check Xdebug Installation

```bash
php -m | grep xdebug
```

#### View PHP Configuration

```bash
php --ini
php -i | grep xdebug
```

#### Test Xdebug Directly

Create a simple PHP script to trigger Xdebug:

```php
<?php
// test-debug.php
xdebug_break();
echo "Hello World\n";
?>
```

Run with:
```bash
php test-debug.php
```

## Integration with YDebug Workflow

The connect command is typically used:

1. **Initial Setup**: Verify your debugging environment after installation
2. **Configuration Changes**: Test after modifying Xdebug settings
3. **Environment Troubleshooting**: Diagnose connection issues
4. **CI/CD Pipelines**: Validate debugging setup in automated environments
5. **Remote Debugging**: Verify connectivity to remote servers

## Next Steps

After successfully connecting:

1. Configure your IDE to listen for debug connections
2. Set up project-specific YDebug configuration
3. Start debugging your PHP applications with YDebug
4. Use other YDebug commands for advanced debugging features

For additional help and advanced configuration options, see:

* YDebug Configuration Guide: `ydebug config --show`
* Xdebug Official Documentation: https://xdebug.org/docs/
* YDebug GitHub Repository: [Project documentation](../README.md)