<?php
/**
 * YDebug Breakpoint Test
 * This script will pause at a specific line where variables are in scope
 */

// Set up all variables in scope
$message = "YDebug Server Mode SUCCESS!";
$number = 42;
$pi = 3.14159;
$is_active = true;
$empty_value = null;

$data_array = [
    'user' => [
        'name' => 'John Doe',
        'age' => 30,
        'active' => true
    ],
    'products' => ['laptop', 'mouse', 'keyboard'],
    'prices' => [999.99, 25.50, 89.00]
];

$user_object = new stdClass();
$user_object->name = "YDebug User";
$user_object->id = 12345;
$user_object->active = true;

echo "🚀 YDebug Breakpoint Test\n";
echo "Variables are now in scope...\n";

// TRIGGER BREAKPOINT HERE - This will pause execution
// YDebug server will inspect variables at this exact point
if (function_exists('xdebug_break')) {
    echo "📍 Triggering breakpoint - YDebug should inspect variables now...\n";
    xdebug_break();  // This pauses execution for inspection
} else {
    echo "⚠️ xdebug_break() not available, using sleep instead\n";
    echo "Variables are in scope for 30 seconds...\n";
    sleep(30);
}

echo "✅ Breakpoint test completed\n";
echo "You should have seen all the local variables above!\n";
?>