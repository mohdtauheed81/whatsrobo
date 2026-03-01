module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/services/worker/**',   // worker runs separately
    '!src/jobs/**'               // cron jobs run separately
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  setupFilesAfterFramework: [],
  setupFiles: ['./tests/setup.js']
};
