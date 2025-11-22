module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns for integration tests only
  testMatch: [
    '**/tests/integration/**/*.test.js',
    '**/tests/**/*.integration.test.js',
    '**/tests/**/*.e2e.test.js',
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/coverage/'],

  // Coverage settings - disabled for integration tests to focus on functionality
  collectCoverage: false,

  // Module settings
  moduleFileExtensions: ['js', 'json'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Transform settings
  transform: {},

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Increased timeout for integration tests
  testTimeout: 30000,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Run integration tests sequentially to avoid port conflicts
  maxWorkers: 1,

  // Global test setup
  globalSetup: undefined,
  globalTeardown: undefined,

  // Handle unhandled promise rejections
  testEnvironmentOptions: {},

  // Increase timeout for slow operations
  slowTestThreshold: 10,
};
