import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'build.yml');
const githubStatusDescriptionLimit = 140;

test('canonical release status uses bounded static descriptions so failure publishing cannot fail on GitHub limits', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const publishStart = workflow.indexOf('\n  publish-statuses:');
  assert.ok(publishStart >= 0, 'publish-statuses job must exist');
  const publishJob = workflow.slice(publishStart);

  const success = publishJob.match(/description='([^']*release gate passed[^']*)'/)?.[1];
  const failure = publishJob.match(/description='([^']*release gate failed[^']*)'/)?.[1];

  assert.ok(success, 'publisher must use a static success description');
  assert.ok(failure, 'publisher must use a static failure description');
  assert.ok(success.length <= githubStatusDescriptionLimit, 'success description must fit GitHub status limit');
  assert.ok(failure.length <= githubStatusDescriptionLimit, 'failure description must fit GitHub status limit');

  assert.doesNotMatch(
    publishJob,
    /description="[^"\n]*\$\{?(?:ACTION_PINS|WORKFLOW_PERMISSIONS|WORKFLOW_TRIGGERS|RELEASE_STRUCTURE|PRODUCTION_HOLD|DEPENDENCY_SOURCES|RUNTIME_PROVENANCE|PACKAGE_SCRIPTS|INSTALL|VULNERABILITY_AUDIT|TESTS|LINT|BUILD)/,
    'canonical status description must not expand stage outcomes into an unbounded API field',
  );
  assert.match(publishJob, /-f target_url="\$RUN_URL"/, 'workflow details should remain available through the run URL');
});
