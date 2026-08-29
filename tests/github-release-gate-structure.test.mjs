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
  ['runtime_provenance', 'RUNTIME_PROVENANCE'],
  ['package_scripts', 'PACKAGE_SCRIPTS'],
  ['install', 'INSTALL'],
  ['vulnerability_audit', 'VULNERABILITY_AUDIT'],
  ['tests', 'TESTS'],
  ['lint', 'LINT'],
  ['build', 'BUILD'],
];

test('release workflow keeps a canonical PR-visible gate, exact GitHub runner/runtime, deterministic npm provenance, bounded jobs, and tracked package/dependency integrity guards', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const runnerLines = workflow.match(/^\s{4}runs-on:\s*ubuntu-24\.04\s*$/gm) || [];
  assert.equal(runnerLines.length, 2, 'build and status publisher must use the exact approved GitHub-hosted runner image');
  assert.match(workflow, /^\s{4}name:\s*kingdom-network\/release-gate\s*$/m);
  assert.doesNotMatch(workflow, /\bself-hosted\b|runs-on:\s*\$\{\{|runs-on:\s*\[/i);
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.match(workflow, /node-version:\s*22\.23\.2\s*$/m);
  assert.match(workflow, /^\s{6}NPM_CONFIG_REGISTRY:\s*https:\/\/registry\.npmjs\.org\/\s*$/m);
  assert.match(workflow, /^\s{6}NPM_CONFIG_USERCONFIG:\s*\/dev\/null\s*$/m);
  assert.match(workflow, /timeout-minutes:\s*15/);
  assert.match(workflow, /publish-statuses:[\s\S]*?timeout-minutes:\s*5/);
  assert.match(workflow, /run:\s*npm ci --ignore-scripts --no-audit --no-fund\s*$/m);
  assert.doesNotMatch(workflow, /run:\s*npm (?:install|i)(?:\s|$)/m);
  assert.match(workflow, /run:\s*node scripts\/verify-dependency-sources\.mjs\s*$/m);
  assert.match(
    workflow,
    /- name:\s*Runtime provenance guard\n\s*id:\s*runtime_provenance\n\s*continue-on-error:\s*true\n\s*run:\s*node scripts\/verify-runtime-provenance\.mjs/,
  );
  assert.match(
    workflow,
    /- name:\s*Release package-script guard\n\s*id:\s*package_scripts\n\s*continue-on-error:\s*true\n\s*run:\s*node scripts\/verify-release-package-scripts\.mjs/,
  );
  assert.ok(
    workflow.indexOf('Runtime provenance guard') < workflow.indexOf('Install dependencies'),
    'runtime provenance must be checked before dependency installation',
  );
  assert.ok(
    workflow.indexOf('Release package-script guard') < workflow.indexOf('Install dependencies'),
    'package-script integrity must be checked before dependency installation',
  );
  assert.match(
    workflow,
    /- name:\s*Production dependency vulnerability audit\n\s*id:\s*vulnerability_audit\n\s*if:\s*steps\.install\.outcome\s*==\s*['"]success['"]\n\s*continue-on-error:\s*true\n\s*run:\s*npm audit --omit=dev --audit-level=high --no-fund/,
  );
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
  assert.match(publishJob, /publish runtime-provenance "\$RUNTIME_PROVENANCE"/);
  assert.match(publishJob, /publish package-scripts "\$PACKAGE_SCRIPTS"/);
  assert.match(publishJob, /publish dependency-audit "\$VULNERABILITY_AUDIT"/);
  assert.match(publishJob, /context='kingdom-network\/release-gate'/);
});

test('release structure guard protects package-script integrity, exact runtime provenance, dependency audit visibility, final provenance, runner trust, and publisher isolation', async () => {
  const guard = await readFile(guardPath, 'utf8');
  assert.match(guard, /canonical kingdom-network\/release-gate PR check name/);
  assert.match(guard, /approved GitHub-hosted ubuntu-24\.04 runner image/);
  assert.match(guard, /exact Node 22\.23\.2/);
  assert.match(guard, /Runtime provenance guard/);
  assert.match(guard, /verify-runtime-provenance\.mjs/);
  assert.match(guard, /Release package-script guard/);
  assert.match(guard, /verify-release-package-scripts\.mjs/);
  assert.match(guard, /package-script guard must run before dependency installation/i);
  assert.match(guard, /must run before dependency installation/);
  assert.match(guard, /self-hosted, expression-selected, or runner-matrix execution/);
  assert.match(guard, /NPM_CONFIG_REGISTRY/);
  assert.match(guard, /registry\.npmjs\.org/);
  assert.match(guard, /NPM_CONFIG_USERCONFIG/);
  assert.match(guard, /untracked continue-on-error step/);
  assert.match(guard, /DEPENDENCY_SOURCES/);
  assert.match(guard, /RUNTIME_PROVENANCE/);
  assert.match(guard, /PACKAGE_SCRIPTS/);
  assert.match(guard, /VULNERABILITY_AUDIT/);
  assert.match(guard, /Production dependency vulnerability audit must use id 'vulnerability_audit'/);
  assert.match(guard, /must block high\/critical production dependency advisories/);
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
  assert.match(guard, /release package-script guard result/);
  assert.match(guard, /canonical kingdom-network\/release-gate context/);
  assert.match(guard, /publish-statuses must not checkout code or execute npm install\/test\/build commands/);
  assert.match(guard, /timeout-minutes between 1 and 20/);
  assert.match(guard, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(guard, /GitHub-hosted Ubuntu runner and Node\/npm toolchain are exact-version pinned/);
  assert.match(guard, /package-script integrity are tracked and visible/);
  assert.match(guard, /production dependency vulnerability scanning and package-script integrity are tracked and visible/);
  assert.match(guard, /npm registry\/user config are pinned/);
  assert.match(guard, /stage failures are individually visible/);
  assert.match(guard, /PR-visible under the canonical required-check name/);
  assert.match(guard, /exact final enforcement outcome/);
});
