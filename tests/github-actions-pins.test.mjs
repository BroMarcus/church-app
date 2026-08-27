import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const guardScript = path.resolve(repoRoot, 'scripts/verify-github-actions-pins.mjs');
const checkoutSha = '11d5960a326750d5838078e36cf38b85af677262';
const setupNodeSha = '49933ea5288caeca8642d1e84afbd3f7d6820020';

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

test('actions pin guard accepts approved full commit SHAs and local actions', async () => {
  const root = await makeFixture(`steps:\n  - uses: actions/checkout@${checkoutSha}\n  - uses: actions/setup-node@${setupNodeSha}\n  - uses: ./\.github/actions/local\n`);
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /both approved and pinned/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('actions pin guard rejects mutable version tags even for approved actions', async () => {
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

test('actions pin guard rejects unapproved external action repositories even when SHA-pinned', async () => {
  const root = await makeFixture(`steps:\n  - uses: third-party/safe-looking-action@${checkoutSha}\n`);
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /external action repository is not approved/);
      assert.match(error.stderr, /third-party\/safe-looking-action/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('actions pin guard rejects branch references and missing refs', async () => {
  const root = await makeFixture('steps:\n  - uses: actions/checkout@main\n  - uses: actions/setup-node\n');
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /actions\/checkout@main/);
      assert.match(error.stderr, /actions\/setup-node/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('actions pin guard rejects external Docker actions even with an immutable digest', async () => {
  const digest = 'a'.repeat(64);
  const root = await makeFixture(`steps:\n  - uses: docker://alpine@sha256:${digest}\n`);
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /external Docker actions are not approved/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('build workflow does not persist checkout credentials into later steps', async () => {
  const workflow = await readFile(path.join(repoRoot, '.github', 'workflows', 'build.yml'), 'utf8');
  assert.match(
    workflow,
    /uses:\s*actions\/checkout@[0-9a-f]{40}[^\n]*\n\s*with:\s*\n\s*persist-credentials:\s*false/i,
  );
});

test('build and test steps run without status-write permission', async () => {
  const workflow = await readFile(path.join(repoRoot, '.github', 'workflows', 'build.yml'), 'utf8');
  const [beforePublisher, publisher = ''] = workflow.split(/\n\s{2}publish-statuses:\s*\n/);

  assert.match(beforePublisher, /permissions:\s*\n\s{2}contents:\s*read\s*\n/i);
  assert.doesNotMatch(beforePublisher, /statuses:\s*write/i);

  assert.match(publisher, /if:\s*always\(\)\s*&&\s*github\.event_name\s*==\s*'push'/i);
  assert.match(publisher, /needs:\s*build/i);
  assert.match(publisher, /permissions:\s*\n\s{6}contents:\s*read\s*\n\s{6}statuses:\s*write/i);
});

test('status publisher consumes build outputs instead of rerunning trusted build steps', async () => {
  const workflow = await readFile(path.join(repoRoot, '.github', 'workflows', 'build.yml'), 'utf8');
  const [buildSection, publisher = ''] = workflow.split(/\n\s{2}publish-statuses:\s*\n/);

  assert.match(buildSection, /outputs:\s*[\s\S]*action_pins:\s*\$\{\{\s*steps\.action_pins\.outcome\s*\}\}/i);
  assert.match(buildSection, /production_hold:\s*\$\{\{\s*steps\.production_hold\.outcome\s*\}\}/i);
  assert.match(publisher, /ACTION_PINS:\s*\$\{\{\s*needs\.build\.outputs\.action_pins\s*\}\}/i);
  assert.match(publisher, /PRODUCTION_HOLD:\s*\$\{\{\s*needs\.build\.outputs\.production_hold\s*\}\}/i);
  assert.doesNotMatch(publisher, /npm\s+(ci|test|run\s+(lint|build))/i);
});
