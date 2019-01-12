module.exports = {
  browser: true,
  moduleDirectories: ['<rootDir>/src', '<rootDir>/node_modules'],
  testMatch: ['<rootDir>/src/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: './coverage/',
  setupFiles: ['<rootDir>/node_modules/regenerator-runtime/runtime']

}
