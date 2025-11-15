<?php
/***************************************************************
 *  Feature 011: PHP Script Integration - Prototype Test Script
 *
 *  (c) 2025 YDebug Contributors
 *  All rights reserved
 *
 * The GNU General Public License can be found at
 * http://www.gnu.org/copyleft/gpl.html.
 * A copy is found in the text file GPL.txt and important notices to the license
 * from the author is found in LICENSE.txt distributed with these scripts.
 * This script is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * This copyright notice MUST APPEAR in all copies of the script!
 ***************************************************************/

echo "=== YDebug Prototype Test Script ===\n";

// Basic variables for testing - string, integer, array as required
$test_string = "Hello YDebug Prototype!";
$test_integer = 42;
$test_array = [
    'name' => 'YDebug',
    'version' => '1.0.0',
    'features' => ['variable inspection', 'session management', 'server mode']
];

echo "Initializing test variables...\n";
echo "String: $test_string\n";
echo "Integer: $test_integer\n";
echo "Array count: " . count($test_array) . "\n";

// Hardcoded breakpoint location for prototype validation
echo "Triggering breakpoint for debugging...\n";
xdebug_break();

echo "Breakpoint passed - execution continuing...\n";
echo "Test script completed successfully.\n";
echo "=== End of Test Script ===\n";