module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'lcov', 'text'],
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!tests/**'],
  moduleNameMapper: {
    '@typed-macro/shared': '<rootDir>/packages/shared/src',
    '@typed-macro/core': '<rootDir>/packages/core/src',
    '@typed-macro/runtime': '<rootDir>/packages/runtime/src',
    '@typed-macro/test-utils': '<rootDir>/packages/test-utils/src',
    'vite-plugin-macro': '<rootDir>/packages/wrapper-vite/src',
    // 'webpack-macro-loader': '<rootDir>/packages/wrapper-webpack/src',
  },
  testMatch: ['<rootDir>/packages/**/__tests__/**/*spec.ts'],
}
