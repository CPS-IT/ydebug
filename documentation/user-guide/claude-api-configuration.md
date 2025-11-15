# Claude API Configuration Reference

Comprehensive reference for all Claude API configuration options in YDebug. This guide covers advanced settings, customization options, and configuration strategies for different environments.

**Prerequisites:** Claude API must be set up first. See [Setup Guide](claude-api-setup.md) for initial configuration.

## Configuration Architecture

Claude API settings are organized under the `ai.claude` section in your YDebug configuration. Settings can be configured via CLI commands, configuration files, or environment variables.

## Precedence Rules

Configuration values are resolved in this order (highest to lowest priority):

1. **Command-line arguments** (where applicable)
2. **Environment variables** (prefixed with `YDEBUG_` or `ANTHROPIC_`)
3. **Project configuration files** (`.ydebug.json`, `ydebug.config.json`)
4. **User configuration files** (`~/.config/ydebug/config.json`, `~/.ydebug.json`)
5. **Default values**

## Core AI Settings

### `ai.enabled`

**Type:** Boolean  
**Default:** `true`  
**Description:** Master switch for all AI features in YDebug.

```bash
# Enable AI features
ydebug config-set ai.enabled true

# Disable AI features
ydebug config-set ai.enabled false
```

**Environment Variable:** `YDEBUG_AI_ENABLED`

### `ai.maxContextLines`

**Type:** Integer  
**Default:** `100`  
**Range:** `10-1000`  
**Description:** Maximum number of source code lines to include in AI analysis context.

```bash
# Set context lines
ydebug config-set ai.maxContextLines 200
```

**Use Cases:**
- **Small projects:** 50-100 lines
- **Medium projects:** 100-200 lines  
- **Large projects:** 200-500 lines
- **Deep analysis:** 500-1000 lines (impacts API costs)

### `ai.analysisDepth`

**Type:** String  
**Default:** `"medium"`  
**Options:** `"basic"`, `"medium"`, `"detailed"`  
**Description:** Controls the depth of AI analysis performed.

```bash
# Set analysis depth
ydebug config-set ai.analysisDepth detailed
```

**Analysis Levels:**
- **basic:** Quick overview and simple suggestions
- **medium:** Balanced analysis with context and recommendations
- **detailed:** Comprehensive analysis including patterns and optimization

### `ai.includeStackTrace`

**Type:** Boolean  
**Default:** `true`  
**Description:** Include stack trace information in AI analysis context.

```bash
# Include stack traces
ydebug config-set ai.includeStackTrace true
```

## Claude-Specific Settings

### `ai.claude.apiKey`

**Type:** String  
**Default:** `null`  
**Description:** Your Anthropic API key for Claude access.

```bash
# Set API key via config (not recommended for security)
ydebug config-set ai.claude.apiKey your-api-key-here
```

**Environment Variable:** `ANTHROPIC_API_KEY` (recommended)

**Security Note:** Always use the environment variable for API keys rather than storing in configuration files.

### `ai.claude.model`

**Type:** String  
**Default:** `"claude-sonnet-4-5"`  
**Description:** Claude model to use for API requests.

```bash
# Set Claude model
ydebug config-set ai.claude.model claude-sonnet-4-5
```

**Available Models (as of November 2025):**
- `claude-sonnet-4-5` (recommended) - Best balance of performance, capability, and cost
- `claude-haiku-4-5` - Fastest and most economical for simple tasks
- `claude-opus-4-1` - Most capable for complex reasoning tasks
- `claude-sonnet-4-0` - Legacy model (still supported)

**Model Aliases:**
- `claude-sonnet-4-5-20250929` (full version of claude-sonnet-4-5)
- `claude-haiku-4-5-20251001` (full version of claude-haiku-4-5)
- `claude-opus-4-1-20250805` (full version of claude-opus-4-1)
- `claude-sonnet-4-20250514` (full version of claude-sonnet-4-0)

**Reference:** For the latest model information, see [Anthropic's Model Overview](https://platform.claude.com/docs/en/about-claude/models/overview)

**Model Comparison:**

| Model | Performance | Speed | Cost | Best For |
|-------|-------------|-------|------|---------|
| Haiku 4.5 | Very Good | Very Fast | Low | Simple analysis, quick responses, high-volume tasks |
| Sonnet 4.5 | Excellent | Fast | Medium | General debugging, balanced usage (recommended) |
| Opus 4.1 | Superior | Moderate | High | Complex analysis, critical debugging, advanced reasoning |
| Sonnet 4.0 | Good | Moderate | Medium | Legacy support, maintaining compatibility |

### `ai.claude.maxTokens`

**Type:** Integer  
**Default:** `4000`  
**Range:** `1-100000` (model dependent)  
**Description:** Maximum tokens per Claude API request.

```bash
# Set token limit
ydebug config-set ai.claude.maxTokens 8000
```

**Token Guidelines:**
- **Basic responses:** 1000-2000 tokens
- **Standard analysis:** 4000-6000 tokens
- **Detailed analysis:** 8000-12000 tokens
- **Complex debugging:** 12000+ tokens

**Cost Impact:** Higher token limits increase API costs. Set based on your needs and budget.

### `ai.claude.timeout`

**Type:** Integer  
**Default:** `30000`  
**Unit:** Milliseconds  
**Range:** `5000-300000`  
**Description:** Request timeout for Claude API calls.

```bash
# Set timeout to 60 seconds
ydebug config-set ai.claude.timeout 60000
```

**Recommended Values:**
- **Fast network:** 15000ms (15 seconds)
- **Standard network:** 30000ms (30 seconds)
- **Slow network:** 60000ms (60 seconds)
- **Complex requests:** 120000ms (2 minutes)

### `ai.claude.maxRetries`

**Type:** Integer  
**Default:** `3`  
**Range:** `0-10`  
**Description:** Number of retry attempts for failed API requests.

```bash
# Set retry count
ydebug config-set ai.claude.maxRetries 5
```

**Retry Behavior:**
- Uses exponential backoff (1s, 2s, 4s, 8s, 16s)
- Only retries transient errors (network, 5xx, rate limits)
- Does not retry authentication errors (401, 403)

**Use Cases:**
- **Stable network:** 2-3 retries
- **Unreliable network:** 5-7 retries
- **Critical operations:** 7-10 retries
- **No retries:** 0 (for testing or strict latency requirements)

### `ai.claude.rateLimitRpm`

**Type:** Integer  
**Default:** `60`  
**Unit:** Requests per minute  
**Range:** `1-1000`  
**Description:** Client-side rate limiting for Claude API requests.

```bash
# Set rate limit
ydebug config-set ai.claude.rateLimitRpm 30
```

**Rate Limit Guidelines:**
- **Conservative:** 20-30 RPM (prevents quota issues)
- **Standard:** 60 RPM (default, balanced usage)
- **Aggressive:** 100+ RPM (requires higher API limits)
- **Development:** 10-20 RPM (during testing)

## Complete Configuration Example

### JSON Configuration File

```json
{
  "ai": {
    "enabled": true,
    "maxContextLines": 150,
    "analysisDepth": "medium",
    "includeStackTrace": true,
    "claude": {
      "apiKey": null,
      "model": "claude-sonnet-4-5",
      "maxTokens": 6000,
      "timeout": 45000,
      "maxRetries": 4,
      "rateLimitRpm": 40
    }
  }
}
```

### CLI Configuration Commands

```bash
# Enable AI and set basic options
ydebug config-set ai.enabled true
ydebug config-set ai.maxContextLines 150
ydebug config-set ai.analysisDepth medium
ydebug config-set ai.includeStackTrace true

# Configure Claude-specific settings
ydebug config-set ai.claude.model claude-sonnet-4-5
ydebug config-set ai.claude.maxTokens 6000
ydebug config-set ai.claude.timeout 45000
ydebug config-set ai.claude.maxRetries 4
ydebug config-set ai.claude.rateLimitRpm 40
```

### Environment Variables

```bash
# API key (recommended method)
export ANTHROPIC_API_KEY=your-api-key-here

# Optional overrides
export YDEBUG_AI_ENABLED=true
export YDEBUG_CLAUDE_MODEL=claude-sonnet-4-5
export YDEBUG_CLAUDE_MAX_TOKENS=6000
```

## Use Case Configurations

### Development and Testing

Optimized for cost-effectiveness and quick feedback:

```bash
ydebug config-set ai.claude.model claude-haiku-4-5
ydebug config-set ai.claude.maxTokens 2000
ydebug config-set ai.claude.rateLimitRpm 20
ydebug config-set ai.maxContextLines 50
ydebug config-set ai.analysisDepth basic
```

### Production Debugging

Balanced performance and reliability:

```bash
ydebug config-set ai.claude.model claude-sonnet-4-5
ydebug config-set ai.claude.maxTokens 6000
ydebug config-set ai.claude.rateLimitRpm 60
ydebug config-set ai.maxContextLines 200
ydebug config-set ai.analysisDepth medium
ydebug config-set ai.claude.maxRetries 5
```

### Critical Issue Analysis

Maximum capability for complex problems:

```bash
ydebug config-set ai.claude.model claude-opus-4-1
ydebug config-set ai.claude.maxTokens 12000
ydebug config-set ai.claude.timeout 120000
ydebug config-set ai.maxContextLines 500
ydebug config-set ai.analysisDepth detailed
ydebug config-set ai.claude.maxRetries 7
```

### Low-bandwidth/Slow Network

Optimized for unreliable connections:

```bash
ydebug config-set ai.claude.timeout 90000
ydebug config-set ai.claude.maxRetries 8
ydebug config-set ai.claude.rateLimitRpm 10
ydebug config-set ai.claude.maxTokens 3000
```

## Configuration Validation

### Validate Settings

```bash
# Show complete AI configuration
ydebug config --show | grep -A 15 "ai:"

# Check individual settings
ydebug config-get ai.claude.model
ydebug config-get ai.claude.maxTokens
ydebug config-get ai.claude.rateLimitRpm
```

### Test Configuration Changes

```bash
# Verify configuration works
ydebug ai-test --message

# Get detailed validation info
ydebug ai-test --verbose
```

**Note:** For detailed testing procedures, see [Usage Guide](claude-api-usage.md).

## Performance Tuning

### Optimizing Response Time

For faster responses:
```bash
ydebug config-set ai.claude.model claude-haiku-4-5
ydebug config-set ai.claude.maxTokens 2000
ydebug config-set ai.claude.timeout 15000
ydebug config-set ai.maxContextLines 75
```

### Optimizing Quality

For better analysis quality:
```bash
ydebug config-set ai.claude.model claude-opus-4-1
ydebug config-set ai.claude.maxTokens 8000
ydebug config-set ai.analysisDepth detailed
ydebug config-set ai.maxContextLines 300
```

### Optimizing Cost

For budget-conscious usage:
```bash
ydebug config-set ai.claude.model claude-haiku-4-5
ydebug config-set ai.claude.maxTokens 1500
ydebug config-set ai.claude.rateLimitRpm 20
ydebug config-set ai.maxContextLines 50
ydebug config-set ai.analysisDepth basic
```

## Configuration Troubleshooting

### Quick Fixes for Common Issues

**Rate limiting too aggressive:**
```bash
ydebug config-set ai.claude.rateLimitRpm 30  # Reduce rate
```

**Timeouts occurring:**
```bash
ydebug config-set ai.claude.timeout 60000   # Increase timeout
ydebug config-set ai.claude.maxTokens 3000  # Reduce tokens
```

**Poor response quality:**
```bash
ydebug config-set ai.claude.model claude-opus-4-1    # Better model
ydebug config-set ai.claude.maxTokens 8000           # More tokens
ydebug config-set ai.analysisDepth detailed          # Deeper analysis
```

**For detailed error diagnosis, see [Troubleshooting Guide](claude-api-troubleshooting.md).**

### Configuration Validation

YDebug automatically validates:
- API key format and presence
- Numeric ranges for all settings
- Model names and analysis depth values
- Logical consistency between settings

### Reset to Defaults

```bash
# Complete reset to default configuration
ydebug config-set ai.enabled true
ydebug config-set ai.claude.model claude-sonnet-4-5
ydebug config-set ai.claude.maxTokens 4000
ydebug config-set ai.claude.timeout 30000
ydebug config-set ai.claude.maxRetries 3
ydebug config-set ai.claude.rateLimitRpm 60
ydebug config-set ai.maxContextLines 100
ydebug config-set ai.analysisDepth medium
ydebug config-set ai.includeStackTrace true
```

## Advanced Configuration

### Project-Specific Settings

Create project-specific configuration files:

```bash
# Create local project config
echo '{
  "ai": {
    "maxContextLines": 300,
    "analysisDepth": "detailed"
  }
}' > .ydebug.json
```

### Environment-Specific Profiles

Use different configurations for different environments:

**Development (`.ydebug.dev.json`):**
```json
{
  "ai": {
    "claude": {
      "model": "claude-haiku-4-5",
      "maxTokens": 2000,
      "rateLimitRpm": 30
    }
  }
}
```

**Production (`.ydebug.prod.json`):**
```json
{
  "ai": {
    "claude": {
      "model": "claude-sonnet-4-5",
      "maxTokens": 6000,
      "rateLimitRpm": 60,
      "maxRetries": 5
    }
  }
}
```

Load specific profiles:
```bash
cp .ydebug.dev.json .ydebug.json  # Use development config
cp .ydebug.prod.json .ydebug.json  # Use production config
```

## Migration and Upgrades

When upgrading YDebug or changing API providers:

1. **Backup current configuration:**
   ```bash
   ydebug config --show > ydebug-config-backup.json
   ```

2. **Test new settings:**
   ```bash
   ydebug ai-test --verbose
   ```

3. **Gradually adjust settings:**
   - Start with conservative values
   - Increase limits based on testing results
   - Monitor API usage and costs

## Related Documentation

- **Getting Started:** [Claude API Setup Guide](claude-api-setup.md) - Initial setup and first-time configuration
- **Daily Usage:** [Claude API Usage Guide](claude-api-usage.md) - Commands and workflows
- **Problem Solving:** [Troubleshooting Guide](claude-api-troubleshooting.md) - Error diagnosis and solutions

## Configuration Quick Reference

**View Configuration:**
```bash
ydebug config --show | grep -A 15 "ai:"
```

**Key Settings:**
```bash
ydebug config-set ai.claude.model claude-sonnet-4-5     # Model selection
ydebug config-set ai.claude.maxTokens 4000             # Token limit
ydebug config-set ai.claude.rateLimitRpm 60            # Rate limiting
ydebug config-set ai.claude.timeout 30000              # Request timeout
```

**Test Changes:**
```bash
ydebug ai-test --message
```

This comprehensive reference enables you to fine-tune YDebug's Claude API integration for your specific requirements and environment.
