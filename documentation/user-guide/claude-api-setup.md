# Claude API Setup Guide

This guide walks you through the initial setup of the Anthropic Claude API integration with YDebug. Follow these steps to get Claude API working for the first time.

## Prerequisites

- YDebug installed and configured
- Internet connection for API requests
- Email address for Anthropic account creation

## Step 1: Create Anthropic Account

### New Users

1. Visit [https://console.anthropic.com](https://console.anthropic.com)
2. Click "Sign Up" and create a new account
3. Verify your email address
4. Complete any required verification steps
5. Set up billing information (required for API access)

### Existing Users

1. Log in to [Anthropic Console](https://console.anthropic.com)
2. Verify your account has API access enabled
3. Ensure billing information is current

## Step 2: Generate Your First API Key

1. In the Anthropic Console, navigate to "API Keys"
2. Click "Create Key" or "New API Key"
3. Enter a descriptive name: "YDebug Integration"
4. Copy the generated API key **immediately** (shown only once)
5. Store the key temporarily in a secure location

**Important:** Never share or commit this key to version control.

## Step 3: Configure API Key (Choose One Method)

### Method A: Environment Variable (Recommended)

This is the most secure method for storing your API key.

**Linux/macOS:**
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

**Windows Command Prompt:**
```cmd
set ANTHROPIC_API_KEY=your-api-key-here
```

**Windows PowerShell:**
```powershell
$env:ANTHROPIC_API_KEY="your-api-key-here"
```

**Make it Permanent:**
Add the export command to your shell profile:
- **Bash:** `~/.bashrc` or `~/.bash_profile`
- **Zsh:** `~/.zshrc`
- **Fish:** `~/.config/fish/config.fish`

### Method B: YDebug Configuration

Store the key in YDebug's configuration (less secure):

```bash
ydebug config-set ai.claude.apiKey your-api-key-here
```

**Security Warning:** This stores the key in plain text. Only use this method if environment variables aren't available.

## Step 4: Enable AI Features

Activate Claude API integration in YDebug:

```bash
ydebug config-set ai.enabled true
```

## Step 5: Verify Setup

Test that everything is working:

```bash
ydebug ai-test
```

**Expected Success Output:**
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

## Step 6: Test Full Communication

Verify end-to-end functionality:

```bash
ydebug ai-test --message
```

You should see a response from Claude confirming the integration works.

## Troubleshooting Setup Issues

### API Key Not Recognized

```bash
# Verify environment variable is set
echo $ANTHROPIC_API_KEY

# Or check configuration
ydebug config-get ai.claude.apiKey
```

### Authentication Failed

1. Verify the API key was copied completely
2. Check your Anthropic account billing status
3. Ensure your account has Claude API access

### Connection Issues

```bash
# Test with verbose output for details
ydebug ai-test --verbose

# Check internet connectivity
ping api.anthropic.com
```

## Security Best Practices

- **Use environment variables** for API keys in production
- **Enable two-factor authentication** on your Anthropic account
- **Set up billing alerts** to monitor usage
- **Rotate API keys regularly** (every 90 days recommended)
- **Never commit API keys** to version control

## Configuration File Location

YDebug stores configuration in these locations (in order of priority):

1. **Project:** `.ydebug.json` (current directory)
2. **User:** `~/.config/ydebug/config.json`
3. **Legacy:** `~/.ydebug.json`

## What's Next

Now that Claude API is set up:

1. **Learn Daily Usage:** See [Claude API Usage Guide](claude-api-usage.md) for commands and workflows
2. **Customize Settings:** Review [Configuration Reference](claude-api-configuration.md) for advanced options
3. **Need Help:** Check [Troubleshooting Guide](claude-api-troubleshooting.md) for error solutions

## Quick Reference

**Test Connection:**
```bash
ydebug ai-test
```

**Check Configuration:**
```bash
ydebug config --show | grep -A 10 "ai:"
```

**Enable AI Features:**
```bash
ydebug config-set ai.enabled true
```

Your Claude API integration is now ready for use!