import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'build.yml');
const guardPath = path.join(repoRoot, 'scripts', 'verify-github-release-gate-structure.mjs');

const tracked = [
  ['action_pins', 'ACTION_PINS'],
  ['workflow_permissions', 'WORKFLOW_PERMISSIONS'],
  ['workflow_triggers', 'WORKFLOW_TRIGGERS'],
  ['release_structure', 'RELEASE_STRUCTURE'],
  ['production_hold', 'PRODUCTION_HOLD'],
  ['dependency_sources', 'DEPENDENCY_SOURCES'],
  ['install', 'INSTALL'],
  ['tests', 'TESTS'],
  ['lint', 'LINT'],
  ['build', 'BUILD'],
];

test('release workflow keeps a canonical PR-visible gate, trusted runners, deterministic runtime, and bounded jobs', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const runnerLines = workflow.match(/^\s{4}runs-on:\s*ubuntu-latest\s*$/gm) || [];
  assert.equal(runnerLines.length, 2, 'build and status publisher must use the approved GitHub-hosted runner class');
  assert.match(workflow, /^\s{4}name:\s*kingdom-network\/release-gate\s*$/m);
  assert.doesNotMatch(workflow, /\bself-hosted\b|runs-on:\s*\$\{\{|runs-on:\s*\[/i);
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.match(workflow, /node-version:\s*22\s*$/m);
  assert.match(workflow, /timeout-minutes:\s*15/);
  assert.match(workflow, /publish-statuses:[\s\S]*?timeout-minutes:\s*5/);
  assert.match(workflow, /run:\s*npm ci --ignore-scripts --no-audit --no-fund\s*$/m);
  assert.doesNotMatch(workflow, /run:\s*npm (?:install|i)(?:\s|$)/m);
  assert.match(workflow, /run:\s*node scripts\/verify-dependency-sources\.mjs\s*$/m);
});

test('every intentionally fail-open release step feeds the final fail-closed gate, visible assertion, and publisher', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const publishJob = workflow.slice(workflow.indexOf('\n  publish-statuses:'));

  assert.match(publishJob, /^\n  publish-statuses:[\s\S]*?^    needs:\s*build\s*$/m);
  assert.match(
    publishJob,
    /^    if:\s*always\(\)\s*&&\s*github\.event_name\s*==\s*['"]push['"]\s*$/m,
  );

  for (const [id, envName] of tracked) {
    assert.match(workflow, new RegExp(`id:\\s*${id}\\b`));
    assert.match(
      workflow,
      new RegExp(`^\\s{6}${id}:\\s*\\$\\{\\{\\s*steps\\.${id}\\.outcome\\s*\\}\\}\\s*$`, 'm'),
    );
    assert.match(
      workflow,
      new RegExp(`^\\s{10}${envName}:\\s*\\$\\{\\{\\s*steps\\.${id}\\.outcome\\s*\\}\\}\\s*$`, 'm'),
    );
    assert.match(
      publishJob,
      new RegExp(`^\\s{6}${envName}:\\s*\\$\\{\\{\\s*needs\\.build\\.outputs\\.${id}\\s*\\}\\}\\s*$`, 'm'),
    );

    const successComparison = new RegExp(`\\[ \\"\\$${envName}\\" = success \\]`);
    assert.match(workflow, successComparison);

    const assertionBlock = new RegExp(
      `- name:\\s*Assert ${id} outcome\\n` +
        `\\s*if:\\s*always\\(\\)\\n` +
        `\\s*env:\\n` +
        `\\s*OUTCOME:\\s*\\$\\{\\{\\s*steps\\.${id}\\.outcome\\s*\\}\\}\\n` +
        `\\s*run:\\s*test "\\$OUTCOME" = success`,
      'm',
    );
    assert.match(workflow, assertionBlock);
  }

  assert.match(workflow, /- name:\s*Enforce release gate\n\s*id:\s*release_gate\n\s*if:\s*always\(\)/);
  assert.match(
    workflow,
    /^\s{6}release_gate:\s*\$\{\{\s*steps\.release_gate\.outcome\s*\}\}\s*$/m,
  );
  assert.match(
    publishJob,
    /^\s{6}RELEASE_GATE:\s*\$\{\{\s*needs\.build\.outputs\.release_gate\s*\}\}\s*$/m,
  );
  assert.match(publishJob, /if \[ "\$RELEASE_GATE" = success \]; then/);
  assert.match(publishJob, /context='kingdom-network\/release-gate'/);
});

test('release structure guard protects canonical check naming, visible stage failures, final provenance, runner trust, and publisher isolation', async () => {
  const guard = await readFile(guardPath, 'utf8');
  assert.match(guard, /canonical kingdom-network\/release-gate PR check name/);
  assert.match(guard, /approved GitHub-hosted ubuntu-latest runner class/);
  assert.match(guard, /self-hosted, expression-selected, or runner-matrix execution/);
  assert.match(guard, /untracked continue-on-error step/);
  assert.match(guard, /DEPENDENCY_SOURCES/);
  assert.match(guard, /missing visible failure assertion for tracked step/);
  assert.match(guard, /must read the exact steps\./);
  assert.match(guard, /must fail visibly unless OUTCOME=success/);
  assert.match(guard, /may never continue on error/);
  assert.match(guard, /Enforce release gate may never continue on error/);
  assert.match(guard, /Enforce release gate must use id 'release_gate'/);
  assert.match(guard, /build job must expose release_gate from steps\.release_gate\.outcome/);
  assert.match(guard, /build job must expose output/);
  assert.match(guard, /publish-statuses must depend directly on the build job/);
  assert.match(guard, /publish-statuses must remain push-only/);
  assert.match(guard, /publish-statuses must receive RELEASE_GATE from needs\.build\.outputs\.release_gate/);
  assert.match(guard, /publish-statuses overall result must come from the exact final RELEASE_GATE outcome/);
  assert.match(guard, /canonical kingdom-network\/release-gate context/);
  assert.match(guard, /publish-statuses must not checkout code or execute npm install\/test\/build commands/);
  assert.match(guard, /timeout-minutes between 1 and 20/);
  assert.match(guard, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(guard, /stage failures are individually visible/);
  assert.match(guard, /PR-visible under the canonical required-check name/);
  assert.match(guard, /exact final enforcement outcome/);
});
