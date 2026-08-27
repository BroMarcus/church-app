import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const guardPath = path.join(repoRoot, 'scripts', 'verify-runtime-provenance.mjs');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'build.yml');

test('runtime provenance guard pins the reviewed Node and npm versions', async () => {
  const guard = await readFile(guardPath, 'utf8');
  assert.match(guard, /const expectedNode = 'v22\.23\.2';/);
  assert.match(guard, /const expectedNpm = '10\.9\.8';/);
  assert.match(guard, /execFileSync\('npm', \['--version'\]/);
  assert.match(guard, /RUNNER_OS !== 'Linux'/);
  assert.match(guard, /Production HOLD requires the release gate to use the reviewed Node\/npm toolchain/);
});

test('release workflow executes runtime provenance before dependency installation', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const runtimeIndex = workflow.indexOf('Runtime provenance guard');
  const installIndex = workflow.indexOf('Install dependencies');
  assert.ok(runtimeIndex >= 0, 'runtime provenance step must exist');
  assert.ok(installIndex > runtimeIndex, 'runtime provenance must run before dependency install');
  assert.match(workflow, /node-version:\s*22\.23\.2\s*$/m);
  assert.match(workflow, /^\s{4}runs-on:\s*ubuntu-24\.04\s*$/m);
});
