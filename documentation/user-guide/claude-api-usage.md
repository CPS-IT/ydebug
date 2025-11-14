# Claude API Usage Guide

This guide covers day-to-day usage of the Claude API integration in YDebug. Learn essential commands, workflows, and practical examples for using AI-powered debugging features.

## Prerequisites

- Claude API configured (see [Setup Guide](claude-api-setup.md) if not done)
- YDebug working with your PHP project

## Essential Commands

### Health Check

Start each debugging session by verifying Claude API status:

```bash
ydebug ai-test
```

**When to use:**
- Before starting debugging sessions
- After system restarts
- When experiencing connectivity issues

### Full Communication Test

Test end-to-end functionality:

```bash
ydebug ai-test --message
```

**When to use:**
- After configuration changes
- When troubleshooting response issues
- To verify API quota availability

### Detailed Diagnostics

Get comprehensive error information:

```bash
ydebug ai-test --verbose
```

**When to use:**
- Debugging connection problems
- Investigating performance issues
- Before reporting bugs

## Daily Workflows

### Morning Setup Check

Verify everything is working before you start coding:

```bash
# Quick health check
ydebug ai-test

# If issues are found:
ydebug ai-test --verbose
```

### Configuration Changes

After modifying Claude API settings:

```bash
# Test new configuration
ydebug ai-test --message

# Verify settings took effect
ydebug config --show | grep -A 10 "ai:"
```

### Pre-debugging Session

Before starting an important debugging session:

```bash
# Ensure API is available
ydebug ai-test

# Check rate limit status
echo "Rate limit status shown in test output above"
```

## Understanding Output

### Successful Test Output

```
Testing Claude API connection...
Model: claude-sonnet-4-5
Max Tokens: 4000
Timeout: 30000ms
Rate Limit: 60 requests/minute

Claude API connection test successful!

Client Status:
  Initialized: true
  Has API Key: true
  Can Make Request: true
  Current Requests: 1/60
```

**Key Information:**
- **Model**: Currently configured Claude model
- **Max Tokens**: Token limit per request
- **Rate Limit**: Requests allowed per minute
- **Current Requests**: Usage in current minute

### Rate Limited Output

```
Client Status:
  Initialized: true
  Has API Key: true
  Can Make Request: false
  Current Requests: 60/60
  Next Available: 15s
```

**Action needed:** Wait 15 seconds before making requests.

### Communication Test Output

```
Sending test message...
Claude Response: Claude API test successful
```

**Confirms:** Full communication pipeline is working.

## Common Usage Patterns

### Quick Health Check

```bash
#!/bin/bash
# Save as: check-claude.sh

if ydebug ai-test > /dev/null 2>&1; then
  echo "Claude API: OK"
else
  echo "Claude API: FAILED"
  ydebug ai-test --verbose
fi
```

### Configuration Verification

```bash
# Check current AI settings
ydebug config --show | grep -A 15 "ai:"

# Test specific configuration
ydebug ai-test --message
```

### Rate Limit Monitoring

```bash
# Monitor usage throughout the day
ydebug ai-test | grep "Current Requests"
```

## AI Features (Current and Planned)

### Currently Available

- **Connection Testing**: Verify API connectivity
- **Status Monitoring**: Check rate limits and quotas
- **Configuration Validation**: Ensure settings are correct
- **Error Diagnostics**: Detailed error information

### In Development

- **Code Analysis**: Real-time variable state analysis
- **Debugging Assistant**: Step-by-step guidance
- **Pattern Recognition**: Common bug identification
- **Performance Insights**: Optimization suggestions

### Planned Features

```bash
# Future AI debugging commands (not yet available)
ydebug debug --with-ai               # AI-enhanced debugging session
ydebug analyze current-state         # Analyze current execution state
ydebug ask "Why is this null?"        # Natural language queries
ydebug suggest optimizations         # Performance recommendations
```

## Performance Management

### Response Time Expectations

- **Connection test**: 1-3 seconds
- **Message test**: 2-5 seconds
- **Future analysis**: 5-15 seconds

### Optimizing Performance

**For faster responses:**
```bash
# Use faster model for simple tasks
ydebug config-set ai.claude.model claude-haiku-4-5
```

**For better analysis quality:**
```bash
# Use more capable model
ydebug config-set ai.claude.model claude-opus-4-1
```

**For cost optimization:**
```bash
# Reduce token limits
ydebug config-set ai.claude.maxTokens 2000
```

### Rate Limit Management

**Monitor current usage:**
```bash
ydebug ai-test | grep "Current Requests"
```

**Adjust rate limiting:**
```bash
# Conservative (slower but safer)
ydebug config-set ai.claude.rateLimitRpm 30

# Aggressive (faster but may hit limits)
ydebug config-set ai.claude.rateLimitRpm 100
```

## Integration Examples

### IDE Integration

Add Claude API health check to your IDE startup:

```bash
# Add to your shell profile or IDE startup script
alias debug-start='ydebug ai-test && echo "Ready for AI-powered debugging"'
```

### Automated Health Monitoring

```bash
#!/bin/bash
# monitor-claude.sh - Run every 30 minutes

if ! ydebug ai-test > /dev/null 2>&1; then
  echo "Claude API down - check configuration" | mail -s "YDebug Alert" admin@yourcompany.com
fi
```

### Project Setup Script

```bash
#!/bin/bash
# project-setup.sh

echo "Setting up YDebug with Claude API..."
ydebug ai-test

if [ $? -eq 0 ]; then
  echo "Claude API ready for debugging!"
  # Continue with project setup
else
  echo "Please configure Claude API first"
  echo "See: https://docs.ydebug.com/claude-api-setup"
fi
```

## Usage Best Practices

### Daily Habits

1. **Start with test**: Always run `ydebug ai-test` first
2. **Monitor quotas**: Check usage regularly to avoid surprises
3. **Use verbose mode**: When something seems wrong
4. **Check rate limits**: Before intensive debugging sessions

### Troubleshooting Workflow

1. **Quick test**: `ydebug ai-test`
2. **If failed**: `ydebug ai-test --verbose`
3. **Check config**: `ydebug config --show | grep -A 10 "ai:"`
4. **Verify API key**: `echo $ANTHROPIC_API_KEY | wc -c`

### Performance Tips

1. **Choose right model**: Balance speed, quality, and cost
2. **Monitor response times**: Adjust timeouts if needed
3. **Respect rate limits**: Don't exceed configured limits
4. **Use caching**: Future versions will cache common analyses

## Quick Reference

**Essential Commands:**
```bash
ydebug ai-test                    # Health check
ydebug ai-test --message          # Full communication test
ydebug ai-test --verbose          # Detailed diagnostics
```

**Configuration Check:**
```bash
ydebug config --show | grep -A 10 "ai:"  # View current settings
ydebug config-get ai.claude.model       # Check specific setting
```

**Common Settings:**
```bash
ydebug config-set ai.enabled true                    # Enable AI
ydebug config-set ai.claude.model claude-sonnet-4-5  # Set model
ydebug config-set ai.claude.rateLimitRpm 60         # Set rate limit
```

## Getting Help

- **Configuration Issues**: [Configuration Reference](claude-api-configuration.md)
- **Errors and Problems**: [Troubleshooting Guide](claude-api-troubleshooting.md)
- **Initial Setup**: [Setup Guide](claude-api-setup.md)

**Remember**: The `--verbose` flag is your friend when debugging Claude API issues!