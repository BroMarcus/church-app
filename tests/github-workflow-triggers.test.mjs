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
const guardScript = path.join(repoRoot, 'scripts', 'verify-github-workflow-triggers.mjs');

async function fixture(workflow) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kingdom-network-workflow-triggers-'));
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

const safePullRequestWorkflow = `name: Test\non:\n  pull_request:\n    branches: [main]\npermissions:\n  contents: read\njobs:\n  build:\n    runs-on: ubuntu-latest\n`;

test('workflow trigger guard allows read-only pull_request CI', async () => {
  const root = await fixture(safePullRequestWorkflow);
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /pull-request CI is read-only/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const trigger of ['pull_request_target', 'workflow_run', 'repository_dispatch']) {
  test(`workflow trigger guard rejects ${trigger}`, async () => {
    const root = await fixture(`name: Test\non:\n  ${trigger}:\npermissions:\n  contents: read\n`);
    try {
      await assert.rejects(runGuard(root), (error) => {
        assert.match(error.stderr, new RegExp(trigger, 'i'));
        return true;
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('workflow trigger guard rejects secrets in pull_request CI', async () => {
  const root = await fixture(`${safePullRequestWorkflow}    steps:\n      - run: echo \"${'${{ secrets.DEPLOY_TOKEN }}'}\"\n`);
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /references secrets/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow trigger guard requires explicit top-level contents read for pull_request CI', async () => {
  const root = await fixture('name: Test\non:\n  pull_request:\njobs:\n  build:\n    runs-on: ubuntu-latest\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /top-level permissions with contents: read/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow trigger guard permits workflow_dispatch without pull-request secrets', async () => {
  const root = await fixture('name: Test\non:\n  workflow_dispatch:\npermissions:\n  contents: read\n');
  try {
    await runGuard(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
