module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/coverage/'],

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', '/coverage/'],

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

  // Test timeout - increased for integration tests
  testTimeout: 20000,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Run tests in band to avoid race conditions
  maxWorkers: 1,

  // Collect coverage from source files
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
  ],

  // Global test setup
  globalSetup: undefined,
  globalTeardown: undefined,

  // Handle unhandled promise rejections
  testEnvironmentOptions: {},
};
