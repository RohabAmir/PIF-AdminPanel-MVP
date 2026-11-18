import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { diagnostics: false, tsconfig: { allowJs: true } }] },
  // sanitize-html's parser stack ships ESM only; let ts-jest transpile it for Jest.
  transformIgnorePatterns: [
    'node_modules/(?!(htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)',
  ],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/global-setup.ts',
  setupFiles: ['<rootDir>/setup-env.ts'],
  testTimeout: 60_000,
};

export default config;
