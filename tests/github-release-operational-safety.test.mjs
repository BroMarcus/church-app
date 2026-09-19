import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'build.yml');

function jobBlock(workflow, jobName, nextJobName) {
  const start = workflow.indexOf(`  ${jobName}:`);
  assert.ok(start >= 0, `${jobName} job must exist`);
  const end = nextJobName ? workflow.indexOf(`  ${nextJobName}:`, start + 1) : workflow.length;
  assert.ok(end > start, `${jobName} job boundary must be readable`);
  return workflow.slice(start, end);
}

test('release workflow keeps bounded execution and cancels superseded runs', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /concurrency:\s*\n\s+group:\s*kingdom-network-build-\$\{\{ github\.ref \}\}\s*\n\s+cancel-in-progress:\s*true/);

  const build = jobBlock(workflow, 'build', 'publish-statuses');
  const publisher = jobBlock(workflow, 'publish-statuses');
  assert.match(build, /timeout-minutes:\s*15\b/);
  assert.match(publisher, /timeout-minutes:\s*5\b/);
});

test('release build stays read-only and status write remains isolated to push-only publisher', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const build = jobBlock(workflow, 'build', 'publish-statuses');
  const publisher = jobBlock(workflow, 'publish-statuses');

  assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/m);
  assert.doesNotMatch(build, /statuses:\s*write/);
  assert.doesNotMatch(build, /contents:\s*write/);
  assert.match(publisher, /if:\s*always\(\)\s*&&\s*github\.event_name\s*==\s*'push'/);
  assert.match(publisher, /permissions:\s*\n\s+contents:\s*read\s*\n\s+statuses:\s*write/);
  assert.doesNotMatch(publisher, /pull_request_target/);
});

test('release workflow cannot silently become a deployment workflow', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.doesNotMatch(workflow, /^\s*environment:\s*/m);
  assert.doesNotMatch(workflow, /\bvercel\s+(?:deploy|promote|alias)\b/i);
  assert.doesNotMatch(workflow, /\bnpx\s+vercel\b/i);
  assert.doesNotMatch(workflow, /\bgh\s+release\s+create\b/i);
  assert.doesNotMatch(workflow, /\bnpm\s+publish\b/i);
});
