module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns for unit tests only
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.spec.js',
  ],

  // Exclude integration and e2e tests
  testPathIgnorePatterns: [
    '/node_modules/', 
    '/coverage/',
    '<rootDir>/tests/integration/',
  ],

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

  // Shorter timeout for fast unit tests
  testTimeout: 5000,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Allow parallel execution for unit tests
  maxWorkers: '50%',

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