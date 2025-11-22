/**
 * Tool Description Constants
 * Centralized location for MCP tool descriptions to improve maintainability and testing
 */

const TOOL_DESCRIPTIONS = {
  DEBUG_START_SESSION: `Start a debugging session by connecting to Xdebug

WORKFLOW: This is the FIRST step in any debugging session. Call this tool before any other debugging operations.

SETUP REQUIREMENTS:
1. PHP script must be running with Xdebug extension enabled
2. Set XDEBUG_TRIGGER=1 environment variable when running PHP
3. Ensure no other debugger (PhpStorm, VSCode) is connected
4. Default port 9003 should be available

EXAMPLE USAGE:
Basic connection:
  { }

Custom port/timeout:
  { "port": 9004, "timeout": 15000 }

Remote debugging:
  { "host": "192.168.1.100", "port": 9003 }

TYPICAL WORKFLOW:
1. Start PHP script: XDEBUG_TRIGGER=1 php your-script.php
2. Call debug_start_session to connect
3. Use debug_set_breakpoint to add breakpoints
4. Use debug_continue_execution to run until breakpoint
5. Inspect variables and step through code

SUCCESS INDICATORS:
- Returns session ID and status
- Session available for other debugging tools
- PHP execution paused and waiting for commands

TROUBLESHOOTING:
- ECONNREFUSED: Ensure PHP is running with Xdebug and XDEBUG_TRIGGER=1
- ETIMEDOUT: Increase timeout parameter or check network connectivity
- Port conflicts: Try alternative ports 9004, 9005 if 9003 is busy`,

  DEBUG_CONTINUE_EXECUTION: `Continue execution until next breakpoint or script end

WORKFLOW: Resume PHP script execution from current position until it hits a breakpoint or completes.

PREREQUISITES:
- Active debugging session (call debug_start_session first)
- PHP script is paused (at breakpoint or after step command)

BEHAVIOR:
- Resumes execution from current line
- Stops at next breakpoint or when script ends
- Returns execution status and location

EXAMPLE USAGE:
Continue and wait for breakpoint:
  { }

Continue without waiting (fire-and-forget):
  { "waitForBreak": false }

Continue with longer timeout:
  { "timeout": 60000 }

COMMON SCENARIOS:
1. After setting breakpoints: Continue to first breakpoint
2. At breakpoint: Continue to next breakpoint
3. Long-running scripts: Use higher timeout values
4. Performance testing: Use waitForBreak=false for timing

RETURN VALUES:
- "break": Stopped at breakpoint
- "stopping": Script completed normally  
- "running": Still executing (timeout reached)

WORKFLOW INTEGRATION:
Previous: debug_set_breakpoint, debug_step_execution
Next: debug_get_status, variable inspection tools

TROUBLESHOOTING:
- "No active session": Call debug_start_session first
- Timeout reached: Increase timeout or check for infinite loops
- Script ends immediately: Check if breakpoints are properly set`,

  DEBUG_SET_BREAKPOINT: `Set a breakpoint at a specific file and line

WORKFLOW: Define stopping points in PHP code where execution will pause for inspection.

PREREQUISITES:
- Active debugging session (call debug_start_session first)
- Valid PHP file path and line number
- Line contains executable code (not comments or empty lines)

BREAKPOINT TYPES:
- line: Stop at specific line (most common)
- conditional: Stop only if expression evaluates to true
- call: Stop when function is called
- return: Stop when function returns
- exception: Stop when exception is thrown

EXAMPLE USAGE:
Basic line breakpoint:
  { "filename": "/path/to/script.php", "lineno": 25 }

Conditional breakpoint:
  { "filename": "/path/to/script.php", "lineno": 30, "type": "conditional", "expression": "$user_id == 123" }

Temporary breakpoint (auto-remove after hit):
  { "filename": "/path/to/script.php", "lineno": 50, "temporary": true }

BEST PRACTICES:
1. Set breakpoints on executable lines (variable assignments, function calls)
2. Use conditional breakpoints to filter specific cases
3. Place breakpoints BEFORE lines you want to inspect
4. Remove unnecessary breakpoints to improve performance

WORKFLOW INTEGRATION:
Previous: debug_start_session
Next: debug_continue_execution, debug_step_execution

RETURN VALUES:
- breakpointId: Unique identifier for this breakpoint
- Location details: filename, line number, type
- Use breakpointId for debug_remove_breakpoint

TROUBLESHOOTING:
- "No active session": Call debug_start_session first
- Invalid line: Choose line with executable PHP code
- Expression errors: Ensure conditional expressions use valid PHP syntax`,

  DEBUG_EVALUATE_EXPRESSION: `Evaluate a PHP expression in the current debugging context

WORKFLOW: Dynamically execute PHP code to test hypotheses and inspect computed values.

PREREQUISITES:
- Active debugging session
- Execution paused at breakpoint or after step command
- Valid PHP expression syntax

PURPOSE:
- Test variable values and expressions without modifying source code
- Perform calculations with current variable state
- Check function results with current parameters
- Validate assumptions about data state

EXPRESSION TYPES:
- Variable access: $variable, $array['key'], $object->property
- Function calls: strlen($string), count($array), custom_function()
- Calculations: $a + $b, $price * 1.08, round($value, 2)
- Comparisons: $user_id == 123, $status !== 'active'
- Object methods: $user->getName(), $db->query($sql)

EXAMPLE USAGE:
Check variable value:
  { "expression": "$user_id" }

Test calculation:
  { "expression": "$price * $tax_rate" }

Call function:
  { "expression": "count($items)" }

Complex expression:
  { "expression": "$user->isActive() && $user->getRole() === 'admin'" }

Evaluate in different context:
  { "expression": "isset($GLOBALS['config'])", "contextId": 1 }

SAFETY CONSIDERATIONS:
- Expressions are executed in real application context
- Avoid side effects (database writes, file modifications)
- Use read-only operations for safety
- Test expressions carefully to avoid application impact

CONTEXT LEVELS:
- 0 (local): Current function/method scope
- 1 (global): Global variable scope  
- 2 (class): Class property scope (when in class method)

DEBUGGING STRATEGIES:
1. Start with simple variable checks
2. Test calculations step by step
3. Validate function parameters before calling
4. Check object state before method calls
5. Use comparisons to test assumptions

WORKFLOW INTEGRATION:
Previous: debug_inspect_variables (to see available variables)
Use with: Any debugging analysis requiring computed values
Next: Based on results, continue debugging or modify approach

RESULT INTERPRETATION:
- Simple values: Returned directly (strings, numbers, booleans)
- Complex objects: Summary with type and size information
- Arrays: Size and type information (use debug_inspect_object for details)
- Errors: PHP evaluation errors with context

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- Syntax errors: Check PHP expression syntax
- Undefined variables: Variable not in current scope context
- Fatal errors: Expression caused PHP error, check application state`,

  DEBUG_STEP_EXECUTION: `Step through code execution (step over, step into, step out)

WORKFLOW: Execute PHP code one line or instruction at a time for detailed analysis.

PREREQUISITES:
- Active debugging session
- Execution paused (at breakpoint or after previous step)

STEP TYPES:
- over: Execute current line, don't enter function calls
- into: Execute current line, enter function calls to debug inside them
- out: Execute until current function returns, then stop

EXAMPLE USAGE:
Step over current line:
  { }

Step into function call:
  { "stepType": "into" }

Step out of current function:
  { "stepType": "out" }

DETAILED BEHAVIOR:
STEP OVER: Best for staying at current abstraction level
- Executes function calls completely without stopping inside
- Moves to next line in current file/function
- Use when function implementation is trusted

STEP INTO: Best for analyzing function internals
- Enters function calls and stops at first line
- Allows debugging inside called functions
- Use when investigating function behavior

STEP OUT: Best for returning to caller context
- Completes current function execution
- Stops after function returns to caller
- Use when done debugging current function

WORKFLOW PATTERNS:
1. Step over to scan through code quickly
2. Step into when you see suspicious function call
3. Step out when done investigating function
4. Repeat as needed for thorough analysis

RETURN VALUES:
- Current execution location (filename, line number)
- Execution status after step
- Step type performed

TROUBLESHOOTING:
- "No active session": Call debug_start_session first
- Execution ends: Script completed, no more steps possible
- Step into nothing: Line has no function calls to enter`,

  DEBUG_GET_STATUS: `Get current execution status and position

WORKFLOW: Query the current state of PHP script execution in debugging session.

PREREQUISITES:
- Active debugging session

PURPOSE:
- Check where execution is currently paused
- Determine execution state (running, break, stopping)
- Get current file and line information
- Monitor session health

EXECUTION STATES:
- "break": Paused at breakpoint or after step command
- "running": Executing code (between breakpoints)  
- "stopping": Script completed execution
- "stopped": Session ended or disconnected

EXAMPLE USAGE:
Basic status check:
  { }

Include session details:
  { "includeSessionInfo": true }

COMMON USE CASES:
1. Check if execution hit a breakpoint
2. Verify current location before setting new breakpoints
3. Monitor session health and connectivity
4. Determine if script finished execution

RETURN VALUES:
- status: Current execution state
- filename: Current file being executed
- lineno: Current line number
- reason: Why execution is paused (if applicable)
- sessionInfo: Connection details (if requested)

WORKFLOW INTEGRATION:
Use after: debug_continue_execution, debug_step_execution
Use before: Variable inspection, further execution control

INTERPRETATION:
- status "break" + filename/lineno: Ready for inspection
- status "running": Script executing, wait or check again
- status "stopping": Script completed, session ending soon
- No filename/lineno: Execution not at specific location

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- Stale status: Session may have disconnected, restart if needed`,

  DEBUG_STOP_SESSION: `Stop the active debugging session

WORKFLOW: Cleanly terminate debugging connection and free resources.

PREREQUISITES:
- Active debugging session exists

PURPOSE:
- Disconnect from PHP Xdebug session
- Free debugging resources
- Allow PHP script to continue normal execution
- Reset session state for next debugging session

BEHAVIOR:
- Gracefully disconnects from Xdebug
- Removes all breakpoints automatically
- Allows PHP script to resume execution
- Clears session data from memory

EXAMPLE USAGE:
Stop current session:
  { }

Stop specific session:
  { "sessionId": "session_1234567890" }

WHEN TO USE:
1. Finished debugging and want PHP script to continue
2. Need to restart debugging with fresh session
3. Switching to different PHP script or environment
4. Cleaning up after debugging workflow completion
5. Error recovery when session becomes unresponsive

AUTOMATIC CLEANUP:
- Breakpoints removed from target PHP process
- Network connection closed gracefully
- Memory resources freed
- Session registry cleared

WORKFLOW INTEGRATION:
Previous: Any debugging activity
Next: debug_start_session (for new session)

RETURN VALUES:
- sessionId: ID of stopped session
- endTime: When session was terminated
- Confirmation of successful cleanup

POST-STOP BEHAVIOR:
- PHP script continues normal execution
- Other MCP debugging tools will fail until new session started
- Connection resources are available for new sessions

TROUBLESHOOTING:
- "No active session": Session already stopped or never started
- Connection errors: Session may be forcibly disconnected but still cleaned up`,

  DEBUG_LIST_BREAKPOINTS: `List all breakpoints in the current debugging session

WORKFLOW: Review and manage all configured breakpoints in the debugging session.

PREREQUISITES:
- Active debugging session
- Breakpoints previously set with debug_set_breakpoint

PURPOSE:
- Review all configured breakpoints
- Check breakpoint status (enabled/disabled)
- Verify breakpoint locations and conditions
- Manage breakpoint inventory for debugging strategy

BREAKPOINT INFORMATION:
- id: Unique breakpoint identifier
- type: Breakpoint type (line, conditional, call, etc.)
- filename: File where breakpoint is set
- lineno: Line number of breakpoint
- state: enabled or disabled
- temporary: Auto-remove after first hit
- expression: Conditional expression (if applicable)
- hitCount: Number of times breakpoint was hit

EXAMPLE USAGE:
List all breakpoints:
  { }

List only enabled breakpoints:
  { "includeDisabled": false }

COMMON USE CASES:
1. Review breakpoint strategy before execution
2. Verify breakpoints are in expected locations
3. Check which breakpoints are enabled/disabled
4. Identify breakpoints to remove or modify
5. Audit conditional breakpoint expressions

RETURN VALUES:
- breakpoints: Array of breakpoint objects
- total: Total number of breakpoints
- Detailed information for each breakpoint

WORKFLOW INTEGRATION:
Previous: debug_set_breakpoint
Use for: Breakpoint management and strategy review
Next: debug_remove_breakpoint, debug_continue_execution

BREAKPOINT STATES:
- enabled: Will pause execution when hit
- disabled: Ignored during execution (but preserved)
- temporary: Automatically removed after first hit

TROUBLESHOOTING:
- "No active session": Call debug_start_session first
- Empty list: No breakpoints set yet, use debug_set_breakpoint
- Unexpected breakpoints: Previous session may have left breakpoints active`,

  DEBUG_REMOVE_BREAKPOINT: `Remove a breakpoint by ID or location

WORKFLOW: Clean up debugging environment by removing unneeded breakpoints.

PREREQUISITES:
- Active debugging session
- Existing breakpoint to remove

IDENTIFICATION METHODS:
1. By breakpoint ID (from debug_set_breakpoint response)
2. By file location (filename + line number)

EXAMPLE USAGE:
Remove by breakpoint ID:
  { "breakpointId": "bp_123456" }

Remove by location:
  { "filename": "/path/to/script.php", "lineno": 25 }

WHEN TO REMOVE BREAKPOINTS:
1. Finished debugging specific code section
2. Cleanup before setting new breakpoints
3. Performance improvement (fewer breakpoints = faster execution)
4. Strategy change (moving breakpoints to different locations)
5. End of debugging session cleanup

BREAKPOINT MANAGEMENT STRATEGY:
- Remove temporary breakpoints manually if needed sooner
- Clean up conditional breakpoints that are no longer relevant
- Remove breakpoints in frequently called functions for performance
- Keep strategic breakpoints for ongoing investigation

WORKFLOW INTEGRATION:
Previous: debug_list_breakpoints (to find breakpoint ID)
Use with: Breakpoint cleanup and management
Next: debug_continue_execution, debug_set_breakpoint

RETURN VALUES:
- breakpointId: ID of removed breakpoint
- removed: Confirmation of removal
- Location details (if provided)

AUTOMATIC CLEANUP:
- Temporary breakpoints auto-remove after first hit
- All breakpoints removed when session stops
- No manual cleanup needed at session end

TROUBLESHOOTING:
- "No active session": Call debug_start_session first
- "Breakpoint not found": Check debug_list_breakpoints for valid IDs
- Invalid location: Verify filename and line number are correct`,

  DEBUG_INSPECT_VARIABLES: `Inspect variables at the current execution point

WORKFLOW: Examine variable values and state to understand code behavior and identify issues.

PREREQUISITES:
- Active debugging session
- Execution paused at breakpoint or after step command
- Valid scope context for variable inspection

VARIABLE SCOPES:
- local: Variables in current function/method
- global: Global variables accessible everywhere
- class: Class properties and methods (when in class context)
- all: Comprehensive view of all accessible variables

EXAMPLE USAGE:
Inspect local variables:
  { }

Inspect all scopes with limited depth:
  { "scope": "all", "maxDepth": 1 }

Inspect global variables only:
  { "scope": "global", "includePrivate": false }

Inspect previous stack frame:
  { "stackDepth": 1, "scope": "local" }

DEPTH CONTROL:
- maxDepth 0: Show only variable types and basic info
- maxDepth 1: Show one level of object/array contents
- maxDepth 2+: Deep inspection of nested structures
- Higher depths may impact performance with large objects

VARIABLE INFORMATION:
- name: Variable identifier
- type: PHP data type (string, int, array, object, etc.)
- value: Actual variable value (formatted for readability)
- size: Number of elements (for arrays/objects)
- visibility: public, private, protected (for class properties)

DEBUGGING STRATEGIES:
1. Start with local scope to see immediate context
2. Check global scope for application state
3. Inspect class scope for object-oriented debugging
4. Use shallow depth first, then drill down into specific variables
5. Compare variables before/after code execution

WORKFLOW INTEGRATION:
Use at: Breakpoints, after step commands
Previous: debug_continue_execution, debug_step_execution
Next: debug_evaluate_expression, debug_inspect_object

PERFORMANCE CONSIDERATIONS:
- Large objects with high maxDepth may be slow
- Private variable filtering reduces output size
- Local scope is fastest, 'all' scope takes longer

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- Empty results: Execution may not be at variable-accessible location
- Missing variables: Check scope and stack depth parameters`,

  DEBUG_INSPECT_OBJECT: `Inspect a specific object or array in detail

WORKFLOW: Deep dive into object/array structure and properties for detailed analysis.

PREREQUISITES:
- Active debugging session
- Execution paused at breakpoint or step command
- Object or array variable available in current scope

PURPOSE:
- Examine object properties and methods in detail
- Analyze array contents and structure
- Understand object relationships and inheritance
- Debug object state and data flow issues

EXAMPLE USAGE:
Inspect object by name:
  { "variableName": "$user" }

Inspect with custom depth:
  { "variableName": "$config", "maxDepth": 3 }

Inspect array element:
  { "variableName": "$items[0]", "maxDepth": 2 }

OBJECT INFORMATION:
- className: Object class name and inheritance
- properties: All accessible properties with values
- methods: Available methods (public/private/protected)
- size: Number of properties or array elements
- type: Detailed type information

DEPTH CONTROL:
- maxDepth controls how deep to traverse nested objects
- Higher values show more detail but may be slower
- Use appropriate depth for debugging needs

DEBUGGING STRATEGIES:
1. Start with shallow inspection to understand structure
2. Increase depth for problematic areas
3. Focus on specific properties causing issues
4. Check object state at different execution points
5. Compare object state before/after operations

WORKFLOW INTEGRATION:
Previous: debug_inspect_variables (to identify objects of interest)
Use with: debug_evaluate_expression for object method calls
Next: Continue debugging with better understanding of object state

PERFORMANCE CONSIDERATIONS:
- Large objects may take time to serialize
- Deep nesting can impact inspection speed
- Consider object size when setting maxDepth

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- "Variable not found": Check variable name and current scope
- "Object too large": Reduce maxDepth or inspect specific properties`,

  DEBUG_INSPECT_SCOPE: `Inspect variables in a specific scope context

WORKFLOW: Examine variables within a particular scope level for targeted debugging.

PREREQUISITES:
- Active debugging session
- Execution paused at valid scope context
- Understanding of current call stack depth

SCOPE CONTEXTS:
- Local scope: Current function/method variables
- Global scope: Application-wide global variables
- Class scope: Object instance properties and static variables
- Stack frame scopes: Variables at different call stack levels

EXAMPLE USAGE:
Inspect current scope:
  { }

Inspect global scope only:
  { "scopeType": "global" }

Inspect caller's scope:
  { "stackDepth": 1 }

Include private variables:
  { "includePrivate": true, "scopeType": "class" }

SCOPE ANALYSIS:
- Understand variable visibility rules
- Identify variable shadowing issues
- Debug scope-related bugs and unexpected behavior
- Analyze variable lifecycle and persistence

DEBUGGING STRATEGIES:
1. Start with local scope for immediate context
2. Check parent scopes for inherited state
3. Examine global scope for application state
4. Use stack depth to debug call chain issues
5. Compare scopes at different execution points

SCOPE INFORMATION:
- scopeType: The type of scope being inspected
- stackDepth: Current call stack level
- variables: All accessible variables in scope
- scopeId: Unique identifier for scope context

WORKFLOW INTEGRATION:
Previous: debug_get_stack_trace (to understand available scopes)
Use with: debug_inspect_variables for detailed variable analysis
Next: debug_evaluate_expression in specific scope context

PERFORMANCE CONSIDERATIONS:
- Deeper stack levels may be slower to access
- Global scope inspection can be extensive
- Filter by scope type for targeted analysis

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- "Invalid stack depth": Depth exceeds current call stack
- "Scope not accessible": Requested scope not available at current location`,

  DEBUG_GET_STACK_TRACE: `Get current call stack and execution trace

WORKFLOW: Analyze the call chain that led to the current execution point.

PREREQUISITES:
- Active debugging session
- Execution paused (breakpoint or step command)

PURPOSE:
- Understand how execution reached current point
- Identify call hierarchy and function relationships
- Debug recursive functions and deep call chains
- Analyze execution path for performance or logic issues

STACK FRAME INFORMATION:
- level: Stack depth (0 = current frame)
- type: Frame type (file, function, method, eval)
- filename: Source file containing the code
- lineno: Line number in the source file
- function/method: Function or method name
- class: Class name (for object methods)
- arguments: Function parameters and values

EXAMPLE USAGE:
Basic stack trace:
  { }

Detailed trace with arguments:
  { "includeArguments": true, "includeContext": true }

Limited depth trace:
  { "maxDepth": 10, "includeArguments": false }

DEBUGGING STRATEGIES:
1. Trace execution flow to understand call hierarchy
2. Identify recursive function patterns
3. Find where execution deviated from expected path
4. Analyze argument values passed through call chain
5. Locate source of errors in deep call stacks

STACK ANALYSIS:
- Frame 0: Current execution location
- Higher frames: Previous function calls leading here
- Look for unexpected functions in call chain
- Check argument values for data flow issues
- Identify recursion or infinite loop patterns

WORKFLOW INTEGRATION:
Use at: Any pause point in execution
Best with: Variable inspection at different stack levels
Next: debug_inspect_variables with stackDepth parameter

PERFORMANCE CONSIDERATIONS:
- Lower maxDepth improves response time
- includeArguments increases data but provides more context
- includeContext adds extra debugging detail but slower

COMMON PATTERNS:
- Web requests: Controller -> Service -> Model hierarchy
- Recursive functions: Same function repeated at different levels
- Error handling: Exception propagation through stack
- Framework code: Application code mixed with framework calls

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- Empty stack: Execution may be at top level or completed
- Missing functions: Stack truncation due to maxDepth limit`,

  DEBUG_GET_EXECUTION_CONTEXT: `Get comprehensive execution context information

WORKFLOW: Gather complete contextual information about current debugging state.

PREREQUISITES:
- Active debugging session
- Execution paused at breakpoint or step command

PURPOSE:
- Provide comprehensive view of current execution state
- Combine multiple debugging information sources
- Support AI analysis with rich context data
- Enable informed debugging decisions

CONTEXT INFORMATION:
- Current execution location (file, line, function)
- Local and global variable state
- Call stack with argument values
- Breakpoint status and configuration
- Session metadata and timing
- Memory and performance metrics

EXAMPLE USAGE:
Full context:
  { }

Minimal context for performance:
  { "includeVariables": false, "maxStackDepth": 5 }

Context for AI analysis:
  { "includeAnalysis": true, "includeMetrics": true }

CONTEXT COMPONENTS:
- execution: Current location and state
- variables: Variable values and types
- stack: Call stack trace
- breakpoints: Active breakpoint information
- session: Debugging session metadata
- performance: Timing and memory metrics

DEBUGGING STRATEGIES:
1. Use for comprehensive debugging state snapshots
2. Provide to AI analysis tools for context-aware insights
3. Compare context at different execution points
4. Export context for debugging session documentation
5. Share context for collaborative debugging

WORKFLOW INTEGRATION:
Use for: Comprehensive debugging analysis
Previous: Any debugging operation
Next: AI analysis tools, debugging decisions

AI INTEGRATION:
- Rich context enables better AI analysis
- Structured format supports automated processing
- Comprehensive data improves AI recommendations
- Context snapshots enable comparison analysis

PERFORMANCE CONSIDERATIONS:
- Full context gathering may be slower
- Adjust detail level based on debugging needs
- Consider context size for analysis tools
- Cache context for repeated analysis

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- "Context too large": Reduce detail level or scope
- "Analysis unavailable": AI analysis tools may not be configured`,

  // AI Analysis Tools
  DEBUG_ANALYZE_VARIABLES: `AI-powered analysis of variable states and relationships

WORKFLOW: Use AI to understand variable behavior and identify potential issues.

PREREQUISITES:
- Active debugging session with variable data
- AI analysis service configured and available

PURPOSE:
- Identify unusual variable states or values
- Detect potential data flow issues
- Suggest debugging strategies based on variable analysis
- Provide insights into variable relationships and dependencies

ANALYSIS CAPABILITIES:
- Variable type consistency checking
- Value range and boundary analysis
- Object relationship mapping
- Performance impact assessment
- Security vulnerability detection

EXAMPLE USAGE:
Analyze all current variables:
  { }

Analyze specific variable scope:
  { "scope": "local", "includeMetrics": true }

Focus on specific variables:
  { "variableFilter": ["$user", "$config"] }

AI INSIGHTS PROVIDED:
- Anomaly detection in variable states
- Recommendations for further investigation
- Performance optimization suggestions  
- Security considerations and warnings
- Code quality improvements

WORKFLOW INTEGRATION:
Previous: debug_inspect_variables
Use with: Variable inspection and debugging analysis
Next: Apply AI recommendations to debugging strategy

TROUBLESHOOTING:
- "No debugging session": Call debug_start_session first
- "AI analysis unavailable": Check AI service configuration
- "No variables to analyze": Ensure execution is paused with accessible variables`,

  DEBUG_ANALYZE_EXECUTION: `AI-powered analysis of execution flow and performance

WORKFLOW: Use AI to analyze execution patterns and identify optimization opportunities.

PREREQUISITES:
- Active debugging session with execution history
- AI analysis service configured

PURPOSE:
- Analyze execution flow efficiency
- Identify performance bottlenecks
- Detect execution pattern anomalies
- Suggest optimization strategies

ANALYSIS AREAS:
- Function call frequency and duration
- Loop performance and iteration patterns
- Memory allocation and usage patterns
- Error handling effectiveness
- Code path optimization opportunities

EXAMPLE USAGE:
Full execution analysis:
  { }

Performance-focused analysis:
  { "focusArea": "performance", "includeMetrics": true }

AI RECOMMENDATIONS:
- Performance optimization suggestions
- Code refactoring opportunities
- Error handling improvements
- Best practice recommendations

TROUBLESHOOTING:
- "Insufficient execution data": Run more debugging operations first
- "Analysis service error": Check AI service status and configuration`,

  DEBUG_ANALYZE_CONTEXT: `AI-powered comprehensive debugging context analysis

WORKFLOW: Use AI to analyze complete debugging context and provide strategic insights.

PREREQUISITES:
- Active debugging session with rich context data
- Multiple debugging operations completed

PURPOSE:
- Comprehensive debugging strategy analysis
- Root cause analysis suggestions
- Debugging workflow optimization
- Context-aware debugging recommendations

ANALYSIS SCOPE:
- Overall debugging session effectiveness
- Context correlation analysis
- Strategic debugging recommendations
- Workflow efficiency assessment

TROUBLESHOOTING:
- "Insufficient context": Perform more debugging operations first
- "Analysis complexity too high": Reduce context scope or detail level`,

  // Advanced Tools  
  DEBUG_EXPLAIN_BEHAVIOR: `AI-powered explanation of observed code behavior

WORKFLOW: Get AI explanations for complex or unexpected code behavior.

PREREQUISITES:
- Debugging context with code execution data
- AI explanation service available

PURPOSE:
- Understand complex code behavior patterns
- Get explanations for unexpected results
- Learn about code execution flow
- Receive educational insights about debugging findings

TROUBLESHOOTING:
- "Insufficient behavioral data": Execute more debugging operations
- "Explanation service unavailable": Check AI service configuration`,

  DEBUG_IDENTIFY_ISSUES: `AI-powered issue identification and classification

WORKFLOW: Use AI to automatically identify potential issues in code execution.

PREREQUISITES:
- Rich debugging context with execution data
- Issue detection AI service configured

PURPOSE:
- Automatically detect common coding issues
- Classify problems by severity and type
- Provide prioritized issue recommendations
- Suggest resolution strategies

TROUBLESHOOTING:
- "No issues detected": May indicate healthy code or insufficient analysis data
- "Issue detection service error": Verify AI service configuration`,

  DEBUG_SUGGEST_BREAKPOINTS: `AI-powered breakpoint placement recommendations

WORKFLOW: Get AI suggestions for optimal breakpoint placement strategy.

PREREQUISITES:
- Code context and debugging objectives
- AI recommendation service available

PURPOSE:
- Optimize debugging efficiency with strategic breakpoint placement
- Reduce debugging time through targeted breakpoints
- Improve debugging coverage and effectiveness
- Learn effective debugging strategies

TROUBLESHOOTING:
- "Insufficient code context": Provide more detailed debugging objectives
- "Suggestion service unavailable": Check AI service status`
};

module.exports = TOOL_DESCRIPTIONS;