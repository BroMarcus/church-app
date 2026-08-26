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
const guardScript = path.resolve(testDir, '../scripts/verify-github-actions-pins.mjs');
const checkoutSha = '11d5960a326750d5838078e36cf38b85af677262';

async function makeFixture(workflow) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kingdom-network-actions-pins-'));
  await mkdir(path.join(root, '.github', 'workflows'), { recursive: true });
  await writeFile(path.join(root, '.github', 'workflows', 'test.yml'), workflow, 'utf8');
  return root;
}

async function runGuard(root) {
  return execFileAsync(process.execPath, [guardScript], {
    env: { ...process.env, KINGDOM_NETWORK_ACTIONS_ROOT: root },
  });
}

test('actions pin guard accepts full commit SHAs and local actions', async () => {
  const root = await makeFixture(`steps:\n  - uses: actions/checkout@${checkoutSha}\n  - uses: ./\.github/actions/local\n`);
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /every external action is pinned/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('actions pin guard rejects mutable version tags', async () => {
  const root = await makeFixture('steps:\n  - uses: actions/checkout@v4\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /full 40-character commit SHA/);
      assert.match(error.stderr, /actions\/checkout@v4/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('actions pin guard rejects branch references and missing refs', async () => {
  const root = await makeFixture('steps:\n  - uses: owner/action@main\n  - uses: owner/other-action\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /owner\/action@main/);
      assert.match(error.stderr, /owner\/other-action/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('actions pin guard requires Docker actions to use immutable sha256 digests', async () => {
  const root = await makeFixture('steps:\n  - uses: docker://alpine:latest\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /sha256 digest/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
