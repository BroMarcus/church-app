import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const guardPath = path.join(repoRoot, 'scripts', 'verify-runtime-provenance.mjs');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'build.yml');

test('runtime provenance guard pins reviewed Node, npm, registry, user config, and exact GitHub checkout provenance', async () => {
  const guard = await readFile(guardPath, 'utf8');
  assert.match(guard, /const expectedNode = 'v22\.23\.2';/);
  assert.match(guard, /const expectedNpm = '10\.9\.8';/);
  assert.match(guard, /const expectedRegistry = 'https:\/\/registry\.npmjs\.org\/';/);
  assert.match(guard, /const expectedUserConfig = '\/dev\/null';/);
  assert.match(guard, /execFileSync\('npm', \['--version'\]/);
  assert.match(guard, /readNpmConfig\('registry'\)/);
  assert.match(guard, /readNpmConfig\('userconfig'\)/);
  assert.match(guard, /process\.env\.NPM_CONFIG_REGISTRY !== expectedRegistry/);
  assert.match(guard, /process\.env\.NPM_CONFIG_USERCONFIG !== expectedUserConfig/);
  assert.match(guard, /RUNNER_OS !== 'Linux'/);
  assert.match(guard, /allowedReleaseEvents = new Set\(\['pull_request', 'push', 'workflow_dispatch'\]\)/);
  assert.match(guard, /checked-out commit must equal GITHUB_SHA/);
  assert.match(guard, /release gate checkout must be clean before dependency installation/);
  assert.match(guard, /expectedRef = `refs\/pull\/\$\{prNumber\}\/merge`/);
  assert.match(guard, /GITHUB_BASE_REF must match the pull-request base branch/);
  assert.match(guard, /run\('git', \['cat-file', '-p', 'HEAD'\]\)/);
  assert.match(guard, /actions\/checkout intentionally uses a shallow clone by default/);
  assert.match(guard, /GitHub may refresh the synthetic merge against a newer base-tip SHA/);
  assert.match(guard, /pull-request checkout must be GitHub's two-parent test merge/);
  assert.match(guard, /second parent must equal event head SHA/);
  assert.match(guard, /base snapshot must be distinct from the PR head/);
  assert.doesNotMatch(guard, /first parent must equal event base SHA/);
  assert.match(guard, /reviewed npm registry\/user-config boundary/);
  assert.match(guard, /exact GitHub checkout and pull-request merge state represented by the workflow event/);
});

test('release workflow executes runtime provenance before dependency installation with immutable npm config', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const runtimeIndex = workflow.indexOf('Runtime provenance guard');
  const installIndex = workflow.indexOf('Install dependencies');
  assert.ok(runtimeIndex >= 0, 'runtime provenance step must exist');
  assert.ok(installIndex > runtimeIndex, 'runtime provenance must run before dependency install');
  assert.match(workflow, /node-version:\s*22\.23\.2\s*$/m);
  assert.match(workflow, /^\s{4}runs-on:\s*ubuntu-24\.04\s*$/m);
  assert.equal((workflow.match(/NPM_CONFIG_REGISTRY:/g) || []).length, 1, 'registry may only be defined at the build-job boundary');
  assert.equal((workflow.match(/NPM_CONFIG_USERCONFIG:/g) || []).length, 1, 'userconfig may only be defined at the build-job boundary');
});

test(
  'runtime provenance positively verifies the actual GitHub checkout used by this release run',
  { skip: process.env.GITHUB_ACTIONS !== 'true' },
  () => {
    const result = spawnSync(process.execPath, [guardPath], {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.match(result.stdout, /exact checkout provenance verified/);
  },
);

test(
  'runtime provenance fails closed when claimed workflow SHA does not match the tested checkout',
  { skip: process.env.GITHUB_ACTIONS !== 'true' },
  () => {
    const result = spawnSync(process.execPath, [guardPath], {
      cwd: repoRoot,
      env: { ...process.env, GITHUB_SHA: '0'.repeat(40) },
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0, 'mismatched checkout provenance must fail');
    assert.match(result.stderr, /checked-out commit must equal GITHUB_SHA/);
  },
);
