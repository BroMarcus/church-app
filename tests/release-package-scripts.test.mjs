import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const guard = path.resolve('scripts/verify-release-package-scripts.mjs');
const canonicalScripts = {
  dev: 'next dev',
  build: 'next build',
  start: 'next start',
  lint: 'eslint .',
  test: 'node --test tests/*.test.mjs',
};

async function runGuard(scripts) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kn-package-scripts-'));
  try {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts }, null, 2));
    return spawnSync(process.execPath, [guard], {
      cwd: process.cwd(),
      env: { ...process.env, KINGDOM_NETWORK_PACKAGE_SCRIPT_ROOT: root },
      encoding: 'utf8',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('accepts the reviewed canonical release scripts', async () => {
  const result = await runGuard(canonicalScripts);
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, value] of [
  ['pretest', 'node steal-before-tests.mjs'],
  ['postlint', 'node after-lint.mjs'],
  ['prebuild', 'node before-build.mjs'],
  ['postbuild', 'node after-build.mjs'],
  ['prepare', 'node prepare.mjs'],
  ['postinstall', 'node postinstall.mjs'],
]) {
  test(`rejects protected lifecycle hook ${name}`, async () => {
    const result = await runGuard({ ...canonicalScripts, [name]: value });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`scripts\\.${name}`));
  });
}

test('rejects a changed build command', async () => {
  const result = await runGuard({ ...canonicalScripts, build: 'node custom-build.mjs && next build' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /scripts\.build must remain exactly/);
});

test('rejects a changed test command', async () => {
  const result = await runGuard({ ...canonicalScripts, test: 'node custom-tests.mjs' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /scripts\.test must remain exactly/);
});
