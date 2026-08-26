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
const repoRoot = path.resolve(testDir, '..');
const guardScript = path.join(repoRoot, 'scripts', 'verify-github-workflow-permissions.mjs');

async function fixture(workflow) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kingdom-network-workflow-permissions-'));
  const dir = path.join(root, '.github', 'workflows');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'test.yml'), workflow, 'utf8');
  return root;
}

async function runGuard(root) {
  return execFileAsync(process.execPath, [guardScript], {
    env: { ...process.env, KINGDOM_NETWORK_WORKFLOW_ROOT: root },
  });
}

test('workflow permission guard allows read-only workflows', async () => {
  const root = await fixture('permissions:\n  contents: read\njobs:\n  build:\n    runs-on: ubuntu-latest\n');
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /no unexpected write permissions found/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow permission guard allows narrowly scoped status publishing', async () => {
  const root = await fixture('permissions:\n  contents: read\njobs:\n  publish-statuses:\n    permissions:\n      contents: read\n      statuses: write\n');
  try {
    await runGuard(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow permission guard rejects write-all', async () => {
  const root = await fixture('permissions: write-all\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /permissions: write-all/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow permission guard rejects unexpected write scopes', async () => {
  const root = await fixture('permissions:\n  contents: write\n  pull-requests: write\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /contents: write/i);
      assert.match(error.stderr, /pull-requests: write/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
