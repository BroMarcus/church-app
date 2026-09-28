import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const guardScript = path.join(repoRoot, 'scripts', 'verify-production-hold.mjs');

async function fixture(scriptSource = 'console.log("safe helper");\n') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kingdom-network-production-hold-'));
  await mkdir(path.join(root, '.github', 'workflows'), { recursive: true });
  await mkdir(path.join(root, 'scripts', 'nested'), { recursive: true });
  await writeFile(path.join(root, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { build: 'next build' } }));
  await writeFile(path.join(root, '.github', 'workflows', 'build.yml'), 'name: safe\n');
  await writeFile(path.join(root, 'scripts', 'nested', 'helper.sh'), scriptSource);
  return root;
}

async function runGuard(root) {
  return execFileAsync(process.execPath, [guardScript], {
    env: { ...process.env, KINGDOM_NETWORK_HOLD_ROOT: root },
  });
}

test('production HOLD guard accepts safe nested executable scripts', async () => {
  const root = await fixture();
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /production-deploy commands were found in workflows, package scripts, or executable scripts/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('production HOLD guard rejects a hidden nested Vercel production deploy helper', async () => {
  const root = await fixture('vercel deploy --prod\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /scripts[\\/]nested[\\/]helper\.sh contains a production-deploy command/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('production HOLD guard rejects a hidden nested Vercel promote helper', async () => {
  const root = await fixture('vercel promote https://example.invalid\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /scripts[\\/]nested[\\/]helper\.sh contains a production-deploy command/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
