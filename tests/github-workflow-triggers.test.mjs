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

async function expectGuardFailure(workflow, pattern) {
  const root = await fixture(workflow);
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, pattern);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
  test(`workflow trigger guard rejects block trigger ${trigger}`, async () => {
    await expectGuardFailure(
      `name: Test\non:\n  ${trigger}:\npermissions:\n  contents: read\n`,
      new RegExp(trigger, 'i'),
    );
  });

  test(`workflow trigger guard rejects inline trigger ${trigger}`, async () => {
    await expectGuardFailure(
      `name: Test\non: [${trigger}, workflow_dispatch]\npermissions:\n  contents: read\n`,
      new RegExp(trigger, 'i'),
    );
  });

  test(`workflow trigger guard rejects scalar trigger ${trigger}`, async () => {
    await expectGuardFailure(
      `name: Test\non: ${trigger}\npermissions:\n  contents: read\n`,
      new RegExp(trigger, 'i'),
    );
  });
}

test('workflow trigger guard recognizes inline pull_request and still enforces read-only permissions', async () => {
  await expectGuardFailure(
    'name: Test\non: [pull_request, workflow_dispatch]\njobs:\n  build:\n    runs-on: ubuntu-latest\n',
    /top-level permissions with contents: read/i,
  );
});

test('workflow trigger guard recognizes flow-map pull_request syntax', async () => {
  await expectGuardFailure(
    'name: Test\non: { pull_request: { branches: [main] }, workflow_dispatch: {} }\njobs:\n  build:\n    runs-on: ubuntu-latest\n',
    /top-level permissions with contents: read/i,
  );
});

test('workflow trigger guard rejects dot-style secrets in pull_request CI', async () => {
  await expectGuardFailure(
    `${safePullRequestWorkflow}    steps:\n      - run: echo \"${'${{ secrets.DEPLOY_TOKEN }}'}\"\n`,
    /references secrets/i,
  );
});

test('workflow trigger guard rejects bracket-style secrets in pull_request CI', async () => {
  await expectGuardFailure(
    `${safePullRequestWorkflow}    steps:\n      - run: echo \"${"${{ secrets['DEPLOY_TOKEN'] }}"}\"\n`,
    /references secrets/i,
  );
});

test('workflow trigger guard rejects GitHub Environment bindings in pull_request CI', async () => {
  await expectGuardFailure(
    `${safePullRequestWorkflow}    environment: production\n    steps:\n      - run: npm test\n`,
    /GitHub Environment/i,
  );
});

test('workflow trigger guard rejects pull-request title interpolated directly into a shell command', async () => {
  await expectGuardFailure(
    `${safePullRequestWorkflow}    steps:\n      - run: echo \"${'${{ github.event.pull_request.title }}'}\"\n`,
    /untrusted pull-request metadata directly into a shell run step/i,
  );
});

test('workflow trigger guard rejects pull-request head branch interpolated in a multiline shell command', async () => {
  await expectGuardFailure(
    `${safePullRequestWorkflow}    steps:\n      - run: |\n          echo \"testing ${'${{ github.head_ref }}'}\"\n          npm test\n`,
    /untrusted pull-request metadata directly into a shell run step/i,
  );
});

test('workflow trigger guard permits untrusted PR text when passed through env instead of expression interpolation in run', async () => {
  const root = await fixture(
    `${safePullRequestWorkflow}    steps:\n      - env:\n          PR_TITLE: ${'${{ github.event.pull_request.title }}'}\n        run: printf '%s\\n' \"$PR_TITLE\"\n`,
  );
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /direct untrusted PR-metadata shell interpolation were found/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow trigger guard requires explicit top-level contents read for pull_request CI', async () => {
  await expectGuardFailure(
    'name: Test\non:\n  pull_request:\njobs:\n  build:\n    runs-on: ubuntu-latest\n',
    /top-level permissions with contents: read/i,
  );
});

test('workflow trigger guard permits workflow_dispatch without pull-request secrets', async () => {
  const root = await fixture('name: Test\non:\n  workflow_dispatch:\npermissions:\n  contents: read\n');
  try {
    await runGuard(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow trigger guard ignores trigger names that appear only in comments', async () => {
  const root = await fixture(
    'name: Test\n# on: [pull_request_target]\non:\n  workflow_dispatch:\npermissions:\n  contents: read\n',
  );
  try {
    await runGuard(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
