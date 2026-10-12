const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

void test('Prisma adapter resolves the patched MariaDB connector, including nested dependency', () => {
  const adapterRequire = createRequire(require.resolve('@prisma/adapter-mariadb'));
  const driverEntry = adapterRequire.resolve('mariadb');
  let directory = path.dirname(driverEntry);
  while (!existsSync(path.join(directory, 'package.json')) && path.dirname(directory) !== directory) directory = path.dirname(directory);
  const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  assert.equal(manifest.name, 'mariadb');
  const [major, minor, patch] = manifest.version.split('.').map(Number);
  assert.ok(major > 3 || (major === 3 && (minor > 5 || (minor === 5 && patch >= 4))), 'Use the patched 3.5.4+ connector rather than vulnerable adapter-pinned 3.4.5.');
  assert.equal(driverEntry, require.resolve('mariadb'));
});
