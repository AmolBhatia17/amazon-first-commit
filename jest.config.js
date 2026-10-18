/**
 * Root Jest config. Tests live in `test/` (outside `src/`), which CRA's
 * `react-scripts test` cannot scan because it hard-pins `roots` to `src`.
 * So `npm test` runs standalone Jest instead, configured to mirror the CRA
 * setup: babel-preset-react-app via babel-jest, jsdom environment.
 */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/**/*.test.js'],
  resetMocks: true,
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { presets: [require.resolve('babel-preset-react-app')] },
    ],
  },
};
