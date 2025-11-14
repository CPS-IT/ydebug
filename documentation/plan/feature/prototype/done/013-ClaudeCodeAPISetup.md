# Feature 013: Claude Code API Setup

**Status:** COMPLETED  
**Estimated Time:** 3-4 hours  
**Layer:** AI Integration  
**Dependencies:** 005-ConfigurationManagement, 006-BasicLoggingSystem

## Description

Set up Anthropic Claude Code API integration with SDK installation, API key configuration, and basic connection testing.

## Tasks

- [x] Install AI dependencies
  - [x] Install @anthropic-ai/sdk package
  - [x] Add HTTP client dependencies if needed
  - [x] Install any additional AI utilities
- [x] Create AI client setup
  - [x] Create `src/ai/ClaudeClient.js`
  - [x] Implement API client initialization
  - [x] Add API key configuration management
  - [x] Create client connection validation
- [x] Add configuration integration
  - [x] Add Claude API settings to configuration schema
  - [x] Support API key from config file and environment
  - [x] Add model selection configuration
  - [x] Configure request timeout and retry settings
- [x] Implement error handling and rate limiting
  - [x] Add API error handling (rate limits, network issues)
  - [x] Implement request retry logic
  - [x] Create rate limiting to prevent API abuse
  - [x] Add detailed error logging
- [x] Create API connection test
  - [x] Add `ydebug ai test` command
  - [x] Test basic API connectivity
  - [x] Validate API key and permissions
  - [x] Display API status and model information

## Success Criteria

- [x] Claude Code API client initializes successfully
- [x] API key configuration works from multiple sources
- [x] Connection test command validates API access
- [x] Error handling covers common API issues
- [x] Rate limiting prevents API quota problems

## Implementation Details

### Claude Client (`src/ai/ClaudeClient.js`)
- **ClaudeClient class**: Main API client with initialization, connection testing, and message sending
- **ClaudeAPIError class**: Custom error handling for API-specific errors with error codes and retry flags
- **RateLimiter class**: Simple rate limiting to prevent API quota exhaustion (60 requests/minute default)
- **Features**:
  - Automatic retry with exponential backoff for transient failures
  - Comprehensive error handling for common API issues (401, 403, 429, 5xx)
  - Secure API key validation without logging sensitive data
  - Connection testing with minimal API usage

### Configuration Integration (`src/config/ConfigManager.js`)
- **Extended AI section** in DEFAULT_CONFIG with Claude-specific settings:
  - `ai.claude.apiKey`: API key (prioritizes environment variable ANTHROPIC_API_KEY)
  - `ai.claude.model`: Model selection (default: claude-sonnet-4-5)
  - `ai.claude.maxTokens`: Token limit per request (default: 4000)
  - `ai.claude.timeout`: Request timeout (default: 30000ms)
  - `ai.claude.maxRetries`: Retry attempts (default: 3)
  - `ai.claude.rateLimitRpm`: Rate limit requests per minute (default: 60)

### CLI Command (`src/cli/commands/ai.js`)
- **AICommand class**: Implements the `ydebug ai test` command
- **Features**:
  - Connection testing with detailed status information
  - Helpful error messages with setup instructions
  - Optional test message sending with `--message` flag
  - Verbose error output with `--verbose` flag
- **Usage examples**:
  - `ydebug ai test` - Basic connection test
  - `ydebug ai test --message` - Send test message to validate full communication
  - `ydebug ai test --verbose` - Show detailed error information

### Package Dependencies
- **@anthropic-ai/sdk**: Official Anthropic SDK for Claude API integration
- Integrated with existing logging system via `src/utils/Logger.js`

### Validation Results
- **API client initialization**: Successfully validates configuration and creates client
- **Error handling**: Comprehensive coverage for missing API keys, invalid keys, rate limits, and network issues
- **Configuration sources**: Supports API key from environment variables and configuration files
- **CLI integration**: Command properly registered and accessible via main CLI

## Notes

- Keep the API key secure and never log it
- Test with different API key scenarios (invalid, expired, missing)
- Document Claude Code API requirements and setup
- Rate limiting prevents API quota exhaustion
- Error messages provide helpful setup instructions
