# Analyze Command User Guide

The `ydebug analyze` command provides AI-powered analysis of debugging contexts and variable states using Claude API. This feature helps developers understand potential issues, performance bottlenecks, and logic errors in their PHP applications.

**IMPORTANT: This is a DEMO feature** that currently works with sample context data to demonstrate AI analysis capabilities.

## Requirements

- ANTHROPIC_API_KEY environment variable must be set
- Active internet connection for Claude API access

## Basic Usage

### Quick Demo

Run with sample context (no additional setup required):

```bash
ydebug analyze
```

This will analyze a sample PHP debugging context with pre-defined variables and provide AI insights.

### Specify Analysis Type

```bash
ydebug analyze --type errorAnalysis
ydebug analyze --type performanceAnalysis
ydebug analyze --type logicAnalysis
```

## Command Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--type <type>` | `-t` | Analysis type | variableAnalysis |
| `--file <file>` | `-f` | PHP file to analyze | - |
| `--line <line>` | `-l` | Line number for context | - |
| `--context <data>` | `-c` | Context data (JSON or file) | - |
| `--variables <data>` | - | Variables data (JSON or file) | - |
| `--expected-behavior <desc>` | - | Expected behavior description | - |
| `--max-tokens <tokens>` | - | Maximum AI response tokens | 2000 |
| `--json` | `-j` | Output in JSON format | false |
| `--verbose` | `-v` | Show detailed output | false |

## Analysis Types

### 1. Variable Analysis (Default)

Analyzes variable states to identify unusual values, potential logic errors, or unexpected data.

```bash
ydebug analyze --type variableAnalysis
```

**Focus Areas:**
- Unusual variable values or types
- Potential logic errors
- Missing or unexpected data
- Performance concerns
- Security considerations

### 2. Error Analysis

Helps identify root causes and potential solutions for errors.

```bash
ydebug analyze --type errorAnalysis
```

**Focus Areas:**
- Root cause analysis
- Common error patterns
- Problematic variable states
- Actionable fix suggestions
- Prevention strategies

### 3. Performance Analysis

Identifies potential performance bottlenecks and optimization opportunities.

```bash
ydebug analyze --type performanceAnalysis
```

**Focus Areas:**
- Inefficient algorithms or patterns
- Resource-heavy operations
- Memory usage concerns
- Database query optimization
- Caching opportunities

### 4. Logic Analysis

Examines code logic for potential errors, edge cases, or unexpected behavior.

```bash
ydebug analyze --type logicAnalysis --expected-behavior "Should return array of active users"
```

**Focus Areas:**
- Logic flow issues
- Edge case handling
- Conditional statement problems
- Loop behavior analysis
- Data validation concerns

## Input Methods

### 1. Sample Context (Demo Mode)

No additional input required - uses built-in sample data:

```bash
ydebug analyze
```

Sample includes:
- PHP file: example-script.php
- Line: 25
- Function: processUserData
- Variables: `$user_id`, `$user_data`, `$validation_errors`, `$processed_count`

### 2. File and Line Context

Analyze a specific file and line (requires context from debugging session):

```bash
ydebug analyze --file /path/to/script.php --line 42
```

### 3. JSON Context String

Provide context as JSON string:

```bash
ydebug analyze --context '{"filename":"test.php","line":25,"variables":[{"name":"$user","type":"array","value":{"id":123,"name":"John"}}]}'
```

### 4. Context from File

Load context from JSON file:

```bash
ydebug analyze --context /path/to/context.json
```

### 5. Variables Data

Provide variables separately:

```bash
ydebug analyze --variables '[{"name":"$count","type":"int","value":0},{"name":"$errors","type":"array","value":[]}]'
```

Or from file:

```bash
ydebug analyze --variables /path/to/variables.json
```

## Context Data Format

### JSON Structure

```json
{
  "filename": "script.php",
  "line": 25,
  "function": "processData",
  "variables": [
    {
      "name": "$variable_name",
      "type": "int|string|array|object|bool",
      "value": "actual_value"
    }
  ],
  "execution": {
    "status": "break|running|stopped",
    "reason": "breakpoint|step|error",
    "breakpoint": "breakpoint_identifier"
  },
  "error": {
    "message": "Error description",
    "type": "ErrorType",
    "code": 123
  }
}
```

### Variable Types

Supported variable types:
- `int` - Integer values
- `string` - String values
- `array` - PHP arrays
- `object` - PHP objects
- `bool`/`boolean` - Boolean values
- `float` - Floating point numbers
- `null` - Null values

## Output Formats

### Standard Output

Default human-readable format:

```
AI Analysis Complete

Analysis Type: variableAnalysis
Model: claude-3-5-sonnet-20241022
Timestamp: 2024-11-15T10:30:00.000Z

Context Analyzed:
   File: example-script.php
   Line: 25
   Function: processUserData

AI Insights:
================
[!] Key finding: Variable $processed_count is initialized to 0 but never incremented
[+] Recommendation: Add increment logic in processing loop
[-] Note: User data structure looks valid and well-formed
    The validation_errors array is empty, indicating no validation issues
```

### JSON Output

Machine-readable format for integration:

```bash
ydebug analyze --json
```

```json
{
  "type": "variableAnalysis",
  "context": {
    "filename": "example-script.php",
    "line": 25,
    "function": "processUserData",
    "variables": "...",
    "context": "..."
  },
  "insights": "Analysis text...",
  "timestamp": "2024-11-15T10:30:00.000Z",
  "model": "claude-3-5-sonnet-20241022"
}
```

## Usage Examples

### Basic Demo Analysis

```bash
# Quick demo with sample data
ydebug analyze

# Verbose output to see full context
ydebug analyze --verbose

# JSON output for processing
ydebug analyze --json
```

### Specific Analysis Types

```bash
# Performance analysis with sample data
ydebug analyze --type performanceAnalysis

# Logic analysis with expected behavior
ydebug analyze --type logicAnalysis --expected-behavior "Function should validate user input and return sanitized data"

# Error analysis (works best with error context)
ydebug analyze --type errorAnalysis --context '{"error":{"message":"Division by zero","type":"DivisionByZeroError"}}'
```

### File-Based Analysis

```bash
# Analyze specific file location
ydebug analyze --file /var/www/app.php --line 125

# Load context from file
ydebug analyze --context debug-context.json

# Load variables from file
ydebug analyze --variables variables.json --file app.php --line 50
```

### Advanced Options

```bash
# Limit AI response length
ydebug analyze --max-tokens 1000

# Combine multiple inputs
ydebug analyze --type performanceAnalysis --file script.php --line 100 --variables vars.json --verbose
```

## Environment Setup

### Set Anthropic API Key

```bash
# Set for current session
export ANTHROPIC_API_KEY=your_api_key_here

# Add to shell profile for persistence
echo 'export ANTHROPIC_API_KEY=your_api_key_here' >> ~/.bashrc
source ~/.bashrc
```

### Verify Setup

```bash
# Test Claude API connection
ydebug ai-test

# Test analyze command with demo data
ydebug analyze --verbose
```

## Configuration

The analyze command uses the YDebug configuration system. You can customize AI settings:

```bash
# Set custom model
ydebug config-set ai.model claude-3-5-sonnet-20241022

# Set default max tokens
ydebug config-set ai.maxTokens 1500

# Set API timeout
ydebug config-set ai.timeout 30000

# View AI configuration
ydebug config-get ai
```

## Sample Context Files

### context.json

```json
{
  "filename": "user-processor.php",
  "line": 45,
  "function": "validateUserData",
  "variables": [
    {
      "name": "$input",
      "type": "array",
      "value": {
        "username": "",
        "email": "invalid-email",
        "age": -5
      }
    },
    {
      "name": "$errors",
      "type": "array",
      "value": [
        "Username cannot be empty",
        "Invalid email format",
        "Age must be positive"
      ]
    }
  ],
  "execution": {
    "status": "break",
    "reason": "breakpoint",
    "breakpoint": "validation_breakpoint"
  }
}
```

### variables.json

```json
[
  {
    "name": "$database_query_count",
    "type": "int",
    "value": 47
  },
  {
    "name": "$memory_usage",
    "type": "string",
    "value": "15.2 MB"
  },
  {
    "name": "$cache_hits",
    "type": "int",
    "value": 3
  },
  {
    "name": "$cache_misses",
    "type": "int",
    "value": 44
  }
]
```

## Troubleshooting

### Common Issues

**Error: "ANTHROPIC_API_KEY environment variable is required"**
- Set the environment variable with your Anthropic API key
- Verify with: `echo $ANTHROPIC_API_KEY`

**Error: "No debugging context provided"**
- The analyze command needs context data to work
- Use sample mode: `ydebug analyze` (no options)
- Provide context: `ydebug analyze --context '{"filename":"test.php"}'`

**Error: "Failed to parse context data"**
- Ensure JSON is valid when using --context or --variables
- Use file paths for complex JSON data
- Check file permissions if loading from files

**Warning: "Failed to extract session context"**
- This is normal - session context extraction is not yet implemented
- Use explicit context data or sample mode

### Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
# Enable debug logging
ydebug config-set logging.level debug

# Run analyze with verbose output
ydebug analyze --verbose

# Check configuration
ydebug config --show
```

## Integration Examples

### Shell Scripts

```bash
#!/bin/bash
# analyze-debug-session.sh

CONTEXT_FILE="/tmp/debug-context.json"
OUTPUT_FILE="/tmp/analysis-results.json"

# Generate context from debugging session (pseudo-code)
extract_debug_context > "$CONTEXT_FILE"

# Run AI analysis
ydebug analyze --context "$CONTEXT_FILE" --json > "$OUTPUT_FILE"

# Process results
if [ $? -eq 0 ]; then
    echo "Analysis completed successfully"
    cat "$OUTPUT_FILE" | jq '.insights'
else
    echo "Analysis failed"
fi
```

### PHP Integration

```php
<?php
// Generate context and run analysis
$context = [
    'filename' => __FILE__,
    'line' => __LINE__,
    'variables' => [
        ['name' => '$data', 'type' => 'array', 'value' => $data],
        ['name' => '$errors', 'type' => 'array', 'value' => $errors]
    ]
];

file_put_contents('/tmp/context.json', json_encode($context));

$output = shell_exec('ydebug analyze --context /tmp/context.json --json');
$analysis = json_decode($output, true);

if ($analysis) {
    echo "AI Insights: " . $analysis['insights'];
}
```

## Future Enhancements

The analyze command is currently in DEMO mode. Future versions will include:

- Real-time debugging session integration
- Automatic context extraction from active debug sessions
- IDE plugin integration for seamless analysis
- Custom prompt templates and analysis types
- Analysis history and comparison features
- Integration with YDebug's debugging workflow

## Related Commands

- `ydebug ai-test` - Test Claude API connection
- `ydebug config` - Configure AI settings
- `ydebug connect` - Test Xdebug connection
- `ydebug inspect` - Inspect variables in debugging session

## Support

For issues with the analyze command:

1. Verify ANTHROPIC_API_KEY is set correctly
2. Test with `ydebug ai-test`
3. Try sample mode: `ydebug analyze --verbose`
4. Check configuration: `ydebug config --show`
5. Review logs with debug logging enabled
