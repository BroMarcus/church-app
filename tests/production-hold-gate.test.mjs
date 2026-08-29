import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const guardScript = path.resolve(testDir, '../scripts/verify-production-hold.mjs');

async function makeFixture({ deploymentEnabled = false, workflow = 'name: Test\n', scripts = {} } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kingdom-network-hold-'));
  await mkdir(path.join(root, '.github', 'workflows'), { recursive: true });
  await writeFile(
    path.join(root, 'vercel.json'),
    `${JSON.stringify({ git: { deploymentEnabled } }, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(root, 'package.json'),
    `${JSON.stringify({ scripts }, null, 2)}\n`,
    'utf8',
  );
  await writeFile(path.join(root, '.github', 'workflows', 'test.yml'), workflow, 'utf8');
  return root;
}

async function runGuard(root) {
  return execFileAsync(process.execPath, [guardScript], {
    env: { ...process.env, KINGDOM_NETWORK_HOLD_ROOT: root },
  });
}

test('production HOLD guard accepts the intended held configuration', async () => {
  const root = await makeFixture({ scripts: { build: 'next build' } });
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /Production HOLD guard passed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('production HOLD guard rejects re-enabling Vercel Git deployment', async () => {
  const root = await makeFixture({ deploymentEnabled: true });
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /git\.deploymentEnabled=false/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('production HOLD guard rejects production deploy commands in workflows', async () => {
  const root = await makeFixture({ workflow: 'steps:\n  - run: vercel deploy --prod\n' });
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /production-deploy command\/configuration/);
      assert.match(error.stderr, /\.github\/workflows\/test\.yml/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('production HOLD guard rejects production promotion hidden in package scripts', async () => {
  const root = await makeFixture({ scripts: { release: 'vercel promote https://example.vercel.app' } });
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /package\.json script "release"/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
