# Configuration Management

YDebug provides a comprehensive configuration system that supports multiple configuration sources with proper precedence handling. This guide covers all aspects of configuration management.

## Quick Start

### Initialize Configuration

Create a sample configuration file in your project:

```bash
ydebug config --init
```

This creates a `ydebug.config.json` file with all available options and their default values.

### View Current Configuration

Display your current configuration settings:

```bash
ydebug config --show
```

### Set Configuration Values

Set individual configuration values:

```bash
ydebug config-set xdebug.port 9004
ydebug config-set logging.level debug
ydebug config-set logging.target both
ydebug config-set logging.format json
ydebug config-set ai.enabled true
```

### Get Configuration Values

Retrieve specific configuration values:

```bash
ydebug config-get xdebug.host
ydebug config-get logging.level
```

### Reset Configuration

Reset configuration to defaults (removes local configuration files):

```bash
ydebug config --reset --confirm
```

## Configuration Sources and Precedence

YDebug loads configuration from multiple sources in the following priority order (highest to lowest):

1. **Command-line arguments** (highest priority)
2. **Environment variables**
3. **Local project configuration files**
4. **User-specific configuration files**
5. **Default configuration** (lowest priority)

### Configuration File Locations

YDebug follows the XDG Base Directory Specification and searches for configuration files in this order:

#### Project-Level Configuration (Highest Priority)
- `./.ydebug.json` (project root)
- `./ydebug.config.json` (project root)

#### User-Level Configuration
- `$XDG_CONFIG_HOME/ydebug/config.json` (if `XDG_CONFIG_HOME` is set)
- `~/.config/ydebug/config.json` (XDG default location)
- `~/.ydebug.json` (legacy location)
- `~/.ydebug/config.json` (legacy location)

## Configuration Schema

### Complete Configuration Structure

```json
{
  "xdebug": {
    "host": "localhost",
    "port": 9003,
    "timeout": 30000,
    "ideKey": "YDEBUG",
    "autostart": true,
    "pathMappings": {},
    "maxDepth": 3,
    "maxChildren": 100
  },
  "logging": {
    "level": "info",
    "target": "console",
    "directory": "var/log",
    "filename": "ydebug.log",
    "format": "text",
    "file": null,
    "timestamp": true,
    "colors": true,
    "rotation": {
      "enabled": false,
      "maxSize": "10MB",
      "maxFiles": 5,
      "interval": "daily"
    }
  },
  "ai": {
    "enabled": true,
    "maxContextLines": 100,
    "analysisDepth": "medium",
    "includeStackTrace": true
  },
  "editor": {
    "command": null,
    "lineFormat": "%f:%l"
  },
  "breakpoints": {
    "stopOnEntry": false,
    "stopOnException": true,
    "ignorePatterns": ["vendor/*", "node_modules/*"]
  },
  "display": {
    "maxStringLength": 1000,
    "showPrivateProperties": false,
    "colorOutput": true
  }
}
```

### Configuration Sections

#### Xdebug Configuration (`xdebug`)

Controls connection and behavior with Xdebug:

- **`host`** (string): Xdebug server hostname (default: "localhost")
- **`port`** (integer): Xdebug server port (default: 9003, range: 1-65535)
- **`timeout`** (integer): Connection timeout in milliseconds (default: 30000, minimum: 1000)
- **`ideKey`** (string): IDE key for Xdebug sessions (default: "YDEBUG")
- **`autostart`** (boolean): Whether to auto-start debugging sessions (default: true)
- **`pathMappings`** (object): Remote-to-local path mappings for debugging
- **`maxDepth`** (integer): Maximum depth for variable inspection (default: 3)
- **`maxChildren`** (integer): Maximum number of child elements to retrieve (default: 100)

#### Logging Configuration (`logging`)

Controls application logging behavior with support for file output, rotation, and multiple formats:

- **`level`** (string): Log level - "error", "warn", "info", "debug", "trace" (default: "info")
- **`target`** (string): Log output target - "console", "file", "both" (default: "console")
- **`directory`** (string): Directory for log files (default: "var/log")
- **`filename`** (string): Base log filename (default: "ydebug.log")
- **`format`** (string): Log format - "text", "json" (default: "text")
- **`file`** (string|null): Deprecated - use `target` instead (default: null)
- **`timestamp`** (boolean): Include timestamps in log messages (default: true)
- **`colors`** (boolean): Use colored console output (default: true)
- **`rotation`**: Log rotation settings:
  - **`enabled`** (boolean): Enable log rotation (default: false)
  - **`maxSize`** (string): Maximum file size before rotation - "1KB", "10MB", "1GB" (default: "10MB")
  - **`maxFiles`** (integer): Maximum number of rotated files to keep (default: 5)
  - **`interval`** (string): Rotation interval - "daily", "weekly", "monthly" (default: "daily")

#### AI Configuration (`ai`)

Controls AI analysis features:

- **`enabled`** (boolean): Enable AI-powered analysis (default: true)
- **`maxContextLines`** (integer): Maximum lines of code context for AI analysis (default: 100)
- **`analysisDepth`** (string): Analysis depth - "shallow", "medium", "deep" (default: "medium")
- **`includeStackTrace`** (boolean): Include stack traces in AI analysis (default: true)

#### Editor Configuration (`editor`)

Controls external editor integration:

- **`command`** (string|null): External editor command template (default: null)
- **`lineFormat`** (string): Format for opening files at specific lines (default: "%f:%l")

#### Breakpoint Configuration (`breakpoints`)

Controls breakpoint behavior:

- **`stopOnEntry`** (boolean): Automatically stop on script entry (default: false)
- **`stopOnException`** (boolean): Stop when exceptions are thrown (default: true)
- **`ignorePatterns`** (array): File patterns to ignore for debugging (default: ["vendor/*", "node_modules/*"])

#### Display Configuration (`display`)

Controls output formatting and display:

- **`maxStringLength`** (integer): Maximum string length to display (default: 1000)
- **`showPrivateProperties`** (boolean): Show private object properties (default: false)
- **`colorOutput`** (boolean): Use colored terminal output (default: true)

## Environment Variables

YDebug supports environment variable overrides for common settings:

### Available Environment Variables

- **`YDEBUG_HOST`** → `xdebug.host`
- **`YDEBUG_PORT`** → `xdebug.port`
- **`YDEBUG_TIMEOUT`** → `xdebug.timeout`
- **`YDEBUG_IDE_KEY`** → `xdebug.ideKey`
- **`YDEBUG_LOG_LEVEL`** → `logging.level`
- **`YDEBUG_LOG_FILE`** → `logging.file`
- **`YDEBUG_AI_ENABLED`** → `ai.enabled`

### Usage Examples

```bash
# Set Xdebug port via environment variable
export YDEBUG_PORT=9004
ydebug connect

# Set log level for a single command
YDEBUG_LOG_LEVEL=debug ydebug connect

# Disable AI features temporarily
YDEBUG_AI_ENABLED=false ydebug connect
```

## Configuration Validation

YDebug validates all configuration values and provides helpful error messages:

### Validation Rules

#### Xdebug Validation
- Port must be an integer between 1 and 65535
- Timeout must be an integer of at least 1000ms
- PathMappings must be an object

#### Logging Validation
- Level must be one of: "error", "warn", "info", "debug", "trace"
- Target must be one of: "console", "file", "both"
- Format must be one of: "text", "json"
- Rotation.enabled must be a boolean
- Rotation.maxSize must be a valid size string (e.g., "10MB", "1GB")

#### AI Validation
- AnalysisDepth must be one of: "shallow", "medium", "deep"

### Example Validation Errors

```bash
$ ydebug config-set xdebug.port 70000
Error: xdebug.port must be a valid port number (1-65535)

$ ydebug config-set logging.level invalid
Error: logging.level must be one of: error, warn, info, debug, trace
```

## Advanced Usage

### Path Mappings for Remote Debugging

Configure path mappings when debugging remote applications:

```bash
# Map remote paths to local paths
ydebug config-set xdebug.pathMappings '{"remote": "local", "/var/www": "/Users/dev/project"}'
```

### Team Configuration Sharing

Create a shared team configuration:

1. Create `ydebug.config.json` in your project root
2. Add common team settings
3. Commit to version control
4. Team members can override with local `.ydebug.json`

Example team configuration:
```json
{
  "xdebug": {
    "host": "dev-server.local",
    "pathMappings": {
      "/var/www/html": "./src"
    }
  },
  "breakpoints": {
    "ignorePatterns": ["vendor/*", "node_modules/*", "tests/*"]
  }
}
```

### Configuration Profiles

Switch between different configurations for different environments:

```bash
# Development profile
ydebug config-set xdebug.host localhost
ydebug config-set xdebug.port 9003
ydebug config-set logging.level debug

# Production debugging profile  
ydebug config-set xdebug.host production-server.com
ydebug config-set xdebug.port 9004
ydebug config-set logging.level error
```

### Backup and Restore

Backup your configuration:
```bash
# Backup current config
ydebug config --show > ydebug-backup.json

# Restore configuration
# (manually copy values or recreate .ydebug.json)
```

## Troubleshooting

### Configuration Not Loading

1. Check file locations:
   ```bash
   ydebug config --show
   ```

2. Verify JSON syntax:
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('.ydebug.json', 'utf8')))"
   ```

3. Check file permissions:
   ```bash
   ls -la .ydebug.json
   ```

### Environment Variables Not Working

1. Verify environment variable names (case-sensitive)
2. Check current environment:
   ```bash
   env | grep YDEBUG
   ```

### Configuration Values Not Applied

Remember the precedence order:
1. Command-line arguments (highest)
2. Environment variables  
3. Configuration files
4. Defaults (lowest)

Higher precedence sources override lower ones.

## Best Practices

### Project Configuration
- Use `ydebug.config.json` for team-shared settings
- Use `.ydebug.json` for personal overrides
- Add `.ydebug.json` to `.gitignore` for personal settings

### Security
- Never commit sensitive information (passwords, tokens) to configuration files
- Use environment variables for sensitive configuration
- Restrict file permissions on configuration files containing sensitive data

### Performance
- Use appropriate `maxDepth` and `maxChildren` values to avoid performance issues
- Set reasonable `timeout` values based on your network latency
- Use `ignorePatterns` to exclude vendor and test files from debugging

### Debugging Configuration Issues
- Use `ydebug config --show` to see effective configuration
- Check the "Configuration Sources" section to see which files were loaded
- Use environment variables for temporary configuration changes during testing