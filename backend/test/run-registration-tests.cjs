// NestJS 12 is ESM; the existing Jest config emits CommonJS on Node 22.
// Supply ESM options for these tests without changing application/test configuration.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const rootDir = path.resolve(__dirname, '..');
const config = {
  rootDir,
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          isolatedModules: true,
        },
      },
    ],
  },
};
const result = spawnSync(
  process.execPath,
  [
    '--experimental-vm-modules',
    path.join(rootDir, 'node_modules/jest/bin/jest.js'),
    '--runInBand',
    '--config',
    JSON.stringify(config),
  ],
  { cwd: rootDir, stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
