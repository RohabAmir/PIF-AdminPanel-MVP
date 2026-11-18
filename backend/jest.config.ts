import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { diagnostics: false, tsconfig: { allowJs: true } }] },
  // sanitize-html's parser stack ships ESM only; let ts-jest transpile it for Jest.
  transformIgnorePatterns: ['node_modules/(?!(htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)'],
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.ts'],
  coverageDirectory: '../coverage',
};

export default config;
