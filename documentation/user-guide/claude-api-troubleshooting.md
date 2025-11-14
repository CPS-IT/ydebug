# Claude API Troubleshooting Guide

Comprehensive error diagnosis and resolution guide for Claude API integration issues in YDebug. Use this guide when Claude API features are not working as expected.

**Prerequisites:** Before troubleshooting, ensure Claude API is initially configured. See [Setup Guide](claude-api-setup.md) if needed.

## Emergency Diagnostics

Run these commands immediately when experiencing issues:

```bash
# 1. Test with full error details
ydebug ai-test --verbose

# 2. Verify configuration
ydebug config --show | grep -A 15 "ai:"

# 3. Check environment
echo "API Key set: $(test -n "$ANTHROPIC_API_KEY" && echo 'Yes' || echo 'No')"
echo "API Key length: $(echo $ANTHROPIC_API_KEY | wc -c)"
```

## Common Error Categories

### 1. Authentication and API Key Errors

#### Error: "API key is required"

**Full Error Message:**
```
Claude API Error (MISSING_API_KEY): API key is required. Set ANTHROPIC_API_KEY environment variable or provide in config.
```

**Causes:**
- No API key configured
- Environment variable not set
- Configuration file missing API key

**Solutions:**

1. **Set environment variable (recommended):**
   ```bash
   export ANTHROPIC_API_KEY=your-api-key-here
   ```

2. **Set via configuration:**
   ```bash
   ydebug config-set ai.claude.apiKey your-api-key-here
   ```

3. **Verify API key is set:**
   ```bash
   echo $ANTHROPIC_API_KEY  # Should display your key
   ydebug config-get ai.claude.apiKey  # Should display configured key
   ```

#### Error: "API key appears to be invalid (too short)"

**Full Error Message:**
```
Claude API Error (INVALID_API_KEY): API key appears to be invalid (too short)
```

**Causes:**
- Truncated or partial API key
- Wrong API key format
- Placeholder text instead of real key

**Solutions:**

1. **Verify API key length and format:**
   ```bash
   echo $ANTHROPIC_API_KEY | wc -c  # Should be ~100+ characters
   ```

2. **Check for common mistakes:**
   - Ensure no extra spaces or newlines
   - Verify you copied the complete key
   - Check for placeholder text like "your-key-here"

3. **Regenerate API key:**
   - Visit Anthropic Console
   - Create a new API key
   - Update your configuration

#### Error: "Connection test failed: 401 Unauthorized"

**Full Error Message:**
```
Claude API Error (UNAUTHORIZED): Connection test failed: Invalid API key
```

**Causes:**
- Invalid or expired API key
- API key for wrong service
- Account suspended or restricted

**Solutions:**

1. **Verify API key validity:**
   - Log into Anthropic Console
   - Check if key is active and not expired
   - Verify account status and billing

2. **Test with a fresh API key:**
   ```bash
   # Generate new key in Anthropic Console
   export ANTHROPIC_API_KEY=new-api-key-here
   ydebug ai-test
   ```

3. **Check account status:**
   - Ensure account is in good standing
   - Verify billing information
   - Check for any restrictions or suspensions

#### Error: "Connection test failed: 403 Forbidden"

**Full Error Message:**
```
Claude API Error (FORBIDDEN): Connection test failed: Access denied
```

**Causes:**
- API key lacks required permissions
- Account doesn't have Claude API access
- Billing or quota issues

**Solutions:**

1. **Check API permissions:**
   - Verify Claude API is enabled on your account
   - Ensure API key has Claude model access
   - Check service availability in your region

2. **Verify billing and quotas:**
   - Check account has available credits
   - Verify billing method is active
   - Review usage limits and quotas

### 2. Rate Limiting and Quota Errors

#### Error: "Rate limit exceeded"

**Full Error Message:**
```
Claude API Error (RATE_LIMITED): Rate limit exceeded. Try again in 45 seconds.
```

**Causes:**
- Exceeded requests per minute limit
- API quota exhausted
- Concurrent request limits reached

**Solutions:**

1. **Wait and retry:**
   ```bash
   # Wait the specified time, then test
   sleep 45
   ydebug ai-test
   ```

2. **Reduce rate limiting:**
   ```bash
   # Lower the client-side rate limit
   ydebug config-set ai.claude.rateLimitRpm 30
   ```

3. **Check account quotas:**
   - Review usage in Anthropic Console
   - Check remaining credits/quota
   - Consider upgrading plan if needed

#### Error: "Request failed after X attempts: 429 Too Many Requests"

**Full Error Message:**
```
Claude API Error (REQUEST_FAILED): Request failed after 3 attempts: 429 Too Many Requests
```

**Causes:**
- Persistent rate limiting
- Server-side rate limits exceeded
- Account quota issues

**Solutions:**

1. **Increase retry delays:**
   ```bash
   ydebug config-set ai.claude.maxRetries 5
   ```

2. **Reduce request frequency:**
   ```bash
   ydebug config-set ai.claude.rateLimitRpm 20
   ```

3. **Check for quota exhaustion:**
   - Review billing and usage in Anthropic Console
   - Add credits or upgrade plan if needed

### 3. Network and Connection Errors

#### Error: "Connection test failed: ENOTFOUND"

**Full Error Message:**
```
Claude API Error (CONNECTION_FAILED): Connection test failed: ENOTFOUND api.anthropic.com
```

**Causes:**
- No internet connection
- DNS resolution issues
- Firewall blocking requests
- Proxy configuration problems

**Solutions:**

1. **Check internet connectivity:**
   ```bash
   ping api.anthropic.com
   curl -I https://api.anthropic.com
   ```

2. **Check DNS resolution:**
   ```bash
   nslookup api.anthropic.com
   dig api.anthropic.com
   ```

3. **Firewall and proxy issues:**
   - Check firewall rules for outbound HTTPS
   - Configure proxy settings if needed
   - Test from different network if possible

#### Error: "Connection test failed: ETIMEDOUT"

**Full Error Message:**
```
Claude API Error (CONNECTION_FAILED): Connection test failed: ETIMEDOUT
```

**Causes:**
- Network timeout
- Slow internet connection
- Server overload
- Firewall blocking connection

**Solutions:**

1. **Increase timeout:**
   ```bash
   ydebug config-set ai.claude.timeout 60000  # 60 seconds
   ```

2. **Check network performance:**
   ```bash
   curl -w "Total time: %{time_total}s\n" -s https://api.anthropic.com
   ```

3. **Test with different timeout values:**
   ```bash
   # Try progressively longer timeouts
   ydebug config-set ai.claude.timeout 90000   # 90 seconds
   ydebug ai-test
   ```

### 4. Configuration and Setup Errors

#### Error: "AI integration is disabled in configuration"

**Full Error Message:**
```
AI integration is disabled in configuration
To enable: ydebug config-set ai.enabled true
```

**Causes:**
- AI features disabled in configuration
- First-time setup not complete

**Solutions:**

1. **Enable AI features:**
   ```bash
   ydebug config-set ai.enabled true
   ```

2. **Verify configuration:**
   ```bash
   ydebug config-get ai.enabled  # Should return "true"
   ```

#### Error: "Client initialization failed"

**Full Error Message:**
```
Claude API Error (INIT_FAILED): Client initialization failed: Invalid configuration
```

**Causes:**
- Corrupted configuration file
- Invalid configuration values
- Missing required dependencies

**Solutions:**

1. **Reset configuration:**
   ```bash
   # Reset AI configuration to defaults
   ydebug config-set ai.enabled true
   ydebug config-set ai.claude.model claude-sonnet-4-5
   ydebug config-set ai.claude.maxTokens 4000
   ```

2. **Validate configuration:**
   ```bash
   ydebug config --validate  # If available
   ```

3. **Check for missing dependencies:**
   ```bash
   npm list @anthropic-ai/sdk
   ```

### 5. Model and Request Errors

#### Error: "Invalid response format"

**Full Error Message:**
```
Claude API Error (CONNECTION_FAILED): Connection test failed: Invalid response format
```

**Causes:**
- API response structure changed
- Network interference
- Proxy modifying responses

**Solutions:**

1. **Test with verbose output:**
   ```bash
   ydebug ai-test --verbose
   ```

2. **Check for network interference:**
   - Disable VPN temporarily
   - Try different network connection
   - Check proxy settings

3. **Verify model compatibility:**
   ```bash
   ydebug config-set ai.claude.model claude-sonnet-4-5
   ```

#### Error: "Model not available"

**Full Error Message:**
```
Claude API Error (REQUEST_FAILED): Request failed: Model not available
```

**Causes:**
- Invalid model name
- Model not accessible with current API key
- Model deprecated or unavailable

**Solutions:**

1. **Use supported model:**
   ```bash
   ydebug config-set ai.claude.model claude-sonnet-4-5
   ```

2. **Check account access:**
   - Verify model availability in Anthropic Console
   - Check account tier and permissions

## Diagnostic Procedures

### Complete Diagnostic Checklist

When troubleshooting Claude API issues, follow this systematic approach:

1. **Environment Check:**
   ```bash
   echo "API Key length: $(echo $ANTHROPIC_API_KEY | wc -c)"
   echo "API Key set: $(test -n "$ANTHROPIC_API_KEY" && echo "Yes" || echo "No")"
   ```

2. **Configuration Check:**
   ```bash
   ydebug config --show | grep -A 15 "ai:"
   ```

3. **Network Check:**
   ```bash
   ping -c 3 api.anthropic.com
   curl -I https://api.anthropic.com
   ```

4. **API Test:**
   ```bash
   ydebug ai-test --verbose
   ```

### Advanced Debugging

#### Enable Debug Logging

Get detailed logs for troubleshooting:

```bash
# Enable debug logging
ydebug config-set logging.level debug

# Run test with detailed logs
ydebug ai-test --verbose

# Check log output
ydebug config-get logging.file  # If file logging enabled
```

#### Manual API Test

Test Claude API directly using curl:

```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

Expected response:
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "Hello!"}],
  ...
}
```

#### Environment Isolation

Test in a clean environment:

```bash
# Create test environment
export TEST_API_KEY="$ANTHROPIC_API_KEY"
unset ANTHROPIC_API_KEY

# Test configuration-based setup
ydebug config-set ai.claude.apiKey "$TEST_API_KEY"
ydebug ai-test

# Restore environment
export ANTHROPIC_API_KEY="$TEST_API_KEY"
ydebug config-set ai.claude.apiKey null
```

## Error Prevention

### Best Practices

1. **API Key Management:**
   - Use environment variables for API keys
   - Never commit API keys to version control
   - Rotate API keys regularly
   - Monitor API key usage

2. **Configuration Management:**
   - Keep configurations in version control (without secrets)
   - Use different configs for different environments
   - Validate configuration changes
   - Document custom settings

3. **Network Reliability:**
   - Configure appropriate timeouts
   - Use retry mechanisms
   - Monitor network performance
   - Have fallback strategies

4. **Quota Management:**
   - Monitor API usage regularly
   - Set up billing alerts
   - Use rate limiting effectively
   - Plan for quota increases

### Monitoring and Alerts

Set up monitoring to prevent issues:

1. **Usage Monitoring:**
   ```bash
   # Check current status regularly
   ydebug ai-test | grep "Current Requests"
   ```

2. **Configuration Validation:**
   ```bash
   # Validate configuration daily/weekly
   ydebug ai-test --message
   ```

3. **Automated Testing:**
   ```bash
   #!/bin/bash
   # health-check.sh
   if ! ydebug ai-test; then
     echo "Claude API health check failed" >&2
     exit 1
   fi
   ```

## Getting Help

### Support Resources

**YDebug Documentation:**
- **Setup Issues:** [Claude API Setup Guide](claude-api-setup.md)
- **Configuration Problems:** [Configuration Reference](claude-api-configuration.md) 
- **Usage Questions:** [Usage Guide](claude-api-usage.md)

**External Resources:**
- **Anthropic Console:** [https://console.anthropic.com](https://console.anthropic.com) - Check account status, billing, API keys
- **API Status:** [https://status.anthropic.com](https://status.anthropic.com) - Check for service outages
- **API Documentation:** [https://docs.anthropic.com](https://docs.anthropic.com) - Official API reference

### Reporting Issues

When reporting Claude API issues, include:

1. **Error Information:**
   ```bash
   # Collect error details
   ydebug ai-test --verbose 2>&1 > debug-output.txt
   ```

2. **Configuration:**
   ```bash
   # Sanitize and include configuration (remove API key)
   ydebug config --show | grep -A 15 "ai:" | sed 's/"apiKey": ".*"/"apiKey": "[REDACTED]"/'
   ```

3. **Environment:**
   ```bash
   # System information
   echo "OS: $(uname -a)"
   echo "Node: $(node --version)"
   echo "YDebug: $(ydebug --version)"
   ```

4. **Steps to Reproduce:**
   - Exact commands that trigger the error
   - Expected vs. actual behavior
   - Any workarounds found

### Emergency Recovery

If Claude API is completely non-functional:

1. **Disable AI temporarily:**
   ```bash
   ydebug config-set ai.enabled false
   ```

2. **Reset to defaults:**
   ```bash
   ydebug config-set ai.claude.model claude-sonnet-4-5
   ydebug config-set ai.claude.maxTokens 4000
   ydebug config-set ai.claude.timeout 30000
   ydebug config-set ai.claude.maxRetries 3
   ydebug config-set ai.claude.rateLimitRpm 60
   ```

3. **Test step by step:**
   ```bash
   # Re-enable and test incrementally
   ydebug config-set ai.enabled true
   ydebug ai-test
   ```

## Troubleshooting Quick Reference

**Immediate Actions:**
```bash
ydebug ai-test --verbose    # Get detailed error info
ydebug config --show        # Check configuration
echo $ANTHROPIC_API_KEY     # Verify API key
```

**Common Fixes:**
```bash
# API key issues
export ANTHROPIC_API_KEY=your-key-here

# Rate limiting
ydebug config-set ai.claude.rateLimitRpm 30

# Timeout issues  
ydebug config-set ai.claude.timeout 60000

# Reset to defaults
ydebug config-set ai.claude.model claude-sonnet-4-5
```

**When All Else Fails:**
```bash
# Temporarily disable AI to continue debugging
ydebug config-set ai.enabled false
```

This guide should help you quickly diagnose and resolve most Claude API integration issues.