# YDebug Server Mode

## Overview

YDebug Server Mode allows YDebug to act as a DBGp server (similar to an IDE) rather than connecting to existing debugging sessions. This mode is particularly useful when you need independent variable inspection capabilities or when working with IDEs that don't support multiple simultaneous DBGp connections.

**Implementation Status**: Core functionality complete. Some advanced features (auto-detection, graceful fallback) are planned for future releases.

## When to Use Server Mode

### Use Server Mode When:
- You want to inspect variables independently of your IDE
- Your IDE doesn't support multiple DBGp connections
- You need programmatic access to debugging data
- You're building automated debugging workflows

### Use Client Mode When:
- You want to connect to an existing IDE debugging session
- You need to inspect variables while your IDE is already debugging
- You prefer to work within your existing IDE workflow

## Getting Started

### Basic Usage

Start the YDebug server:

```bash
ydebug server --port 9003
```

Run your PHP script with Xdebug enabled:

```bash
XDEBUG_TRIGGER=1 php your-script.php
```

### Using with the Inspect Command

You can also use server mode through the inspect command:

```bash
ydebug inspect --server --port 9003
```

This provides a unified interface that can switch between client and server modes based on your needs.

## Configuration Options

### Server Command Options

```bash
ydebug server [options]
```

**Connection Options:**
- `--host <host>` - Server host (default: localhost)
- `--port <port>` - Server port (default: 9003)
- `--max-connections <num>` - Maximum concurrent connections (default: 10)
- `--session-timeout <ms>` - Session timeout in milliseconds (default: 300000)

**Breakpoint Options:**
- `--breakpoint-file <file>` - PHP file for automatic breakpoint
- `--breakpoint-line <line>` - Line number for automatic breakpoint

**Output Options:**
- `--json` - Output variables in JSON format
- `--no-colors` - Disable colored output
- `--no-auto-inspect` - Disable automatic variable inspection at breakpoints

### Inspect Command with Server Mode

```bash
ydebug inspect --server [options]
```

All standard inspect options are available when using `--server` flag.

## Usage Examples

### Basic Variable Inspection

1. Start the server:
```bash
ydebug server --port 9003
```

2. Create a simple PHP script (`test.php`):
```php
<?php
$greeting = "Hello, YDebug!";
$numbers = [1, 2, 3, 4, 5];
xdebug_break(); // Trigger breakpoint
echo "Script complete\n";
?>
```

3. Run the script:
```bash
XDEBUG_TRIGGER=1 php test.php
```

The server will automatically pause at the `xdebug_break()` call and display the variables.

### Automatic Breakpoint

Set a breakpoint at a specific line:

```bash
ydebug server --breakpoint-file /path/to/script.php --breakpoint-line 5
```

This will automatically set a breakpoint at line 5 of the specified file when a debugging session connects.

### JSON Output for Automation

For programmatic use, enable JSON output:

```bash
ydebug server --json --no-colors
```

This outputs variable data in structured JSON format suitable for parsing by other tools.

### Custom Port to Avoid Conflicts

If port 9003 is already in use by your IDE:

```bash
ydebug server --port 9004
```

Then configure your PHP script to connect to the custom port:

```bash
XDEBUG_TRIGGER=1 php -d xdebug.client_port=9004 your-script.php
```

## Advanced Configuration

### Multiple Sessions

YDebug server can handle multiple concurrent debugging sessions:

```bash
ydebug server --max-connections 20 --session-timeout 600000
```

Each session is isolated and managed independently.

### Integration with Development Workflow

You can integrate YDebug server into your development workflow:

```bash
# Start server in background
ydebug server --port 9004 --json > debug-output.log 2>&1 &

# Run your test suite with debugging
XDEBUG_TRIGGER=1 vendor/bin/phpunit tests/

# Stop server when done
pkill -f "ydebug server"
```

## Troubleshooting

### Port Conflicts

If you see "Port already in use" errors:

1. Check what's using the port:
```bash
lsof -i :9003
```

2. Use a different port:
```bash
ydebug server --port 9004
```

3. Or stop conflicting services (like IDE debuggers).

### Connection Issues

If PHP scripts don't connect to the server:

1. Verify Xdebug is enabled:
```bash
php -m | grep xdebug
```

2. Check Xdebug configuration:
```bash
php -i | grep xdebug
```

3. Ensure the trigger is set:
```bash
XDEBUG_TRIGGER=1 php your-script.php
```

### No Variables Displayed

If the server connects but shows no variables:

1. Ensure your script has variables in scope at the breakpoint
2. Check that `xdebug_break()` is called or breakpoints are set
3. Verify the script reaches the breakpoint location

## Differences from Client Mode

| Feature | Client Mode | Server Mode |
|---------|-------------|-------------|
| Connection | Connects to existing session | Listens for new sessions |
| IDE Compatibility | Requires IDE cooperation | Independent of IDE |
| Session Control | Limited | Full control |
| Multiple Sessions | Not supported | Supported |
| Breakpoint Setting | Limited | Full support |

## Current Limitations

- **Auto-detection**: Currently requires manual mode selection via `--server` flag
- **Graceful fallback**: No automatic fallback between modes on connection failure
- **Performance testing**: Limited testing with large variable sets
- **Xdebug versions**: Tested primarily with Xdebug 3.x

These limitations are planned to be addressed in future releases.

## Next Steps

After getting familiar with basic server mode usage:

1. Explore the `ydebug config` command for persistent settings
2. Check out integration tests in `tests/integration/` for more examples
3. Review the architecture documentation for technical details
4. Consider contributing performance testing or additional Xdebug version compatibility

For technical implementation details, see the feature documentation in `documentation/plan/feature/prototype/`.