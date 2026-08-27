import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.env.KINGDOM_NETWORK_WORKFLOW_ROOT || process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');
const requiredTrackedSteps = [
  ['action_pins', 'ACTION_PINS'],
  ['workflow_permissions', 'WORKFLOW_PERMISSIONS'],
  ['workflow_triggers', 'WORKFLOW_TRIGGERS'],
  ['release_structure', 'RELEASE_STRUCTURE'],
  ['production_hold', 'PRODUCTION_HOLD'],
  ['dependency_sources', 'DEPENDENCY_SOURCES'],
  ['install', 'INSTALL'],
  ['vulnerability_audit', 'VULNERABILITY_AUDIT'],
  ['tests', 'TESTS'],
  ['lint', 'LINT'],
  ['build', 'BUILD'],
];

function fail(message) {
  console.error(`Kingdom Network release-gate structure guard failed: ${message}`);
  process.exitCode = 1;
}

function extractJob(source, jobName, nextJobName = null) {
  const start = source.indexOf(`\n  ${jobName}:`);
  if (start < 0) return '';
  const end = nextJobName ? source.indexOf(`\n  ${nextJobName}:`, start + 1) : -1;
  return source.slice(start, end < 0 ? source.length : end);
}

function stepBlocks(jobSource) {
  const lines = jobSource.split('\n');
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (/^      - name:/.test(line)) {
      if (current.length) blocks.push(current.join('\n'));
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join('\n'));
  return blocks;
}

let entries;
try {
  entries = await readdir(workflowDir, { withFileTypes: true });
} catch (error) {
  fail(`cannot read ${workflowDir}: ${error?.code || error?.name || 'unknown_error'}`);
  process.exit();
}

const workflowFiles = entries
  .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
  .map((entry) => path.join(workflowDir, entry.name));

let foundReleaseWorkflow = false;
for (const file of workflowFiles) {
  const source = await readFile(file, 'utf8');
  if (!/^name:\s*Kingdom Network Build\s*$/m.test(source)) continue;
  foundReleaseWorkflow = true;

  if (!/^concurrency:\s*$/m.test(source) || !/^\s{2}cancel-in-progress:\s*true\s*$/m.test(source)) {
    fail('Kingdom Network Build must cancel older in-progress runs for the same ref');
  }

  const buildJob = extractJob(source, 'build', 'publish-statuses');
  const publishJob = extractJob(source, 'publish-statuses');
  if (!buildJob) fail('missing build job');
  if (!publishJob) fail('missing isolated publish-statuses job');

  if (!/^\s{4}name:\s*kingdom-network\/release-gate\s*$/m.test(buildJob)) {
    fail('build job must expose the canonical kingdom-network/release-gate PR check name');
  }
  if (!/^\s{4}runs-on:\s*ubuntu-latest\s*$/m.test(buildJob)) {
    fail('build job must remain on the approved GitHub-hosted ubuntu-latest runner class');
  }
  if (!/^\s{4}runs-on:\s*ubuntu-latest\s*$/m.test(publishJob)) {
    fail('publish-statuses must remain on the approved GitHub-hosted ubuntu-latest runner class');
  }
  if (/\bself-hosted\b|runs-on:\s*\$\{\{|runs-on:\s*\[/i.test(`${buildJob}\n${publishJob}`)) {
    fail('release jobs may not use self-hosted, expression-selected, or runner-matrix execution');
  }

  const buildTimeout = Number(buildJob.match(/^\s{4}timeout-minutes:\s*(\d+)\s*$/m)?.[1]);
  if (!Number.isFinite(buildTimeout) || buildTimeout < 1 || buildTimeout > 20) {
    fail('build job must have timeout-minutes between 1 and 20');
  }

  const publishTimeout = Number(publishJob.match(/^\s{4}timeout-minutes:\s*(\d+)\s*$/m)?.[1]);
  if (!Number.isFinite(publishTimeout) || publishTimeout < 1 || publishTimeout > 5) {
    fail('publish-statuses job must have timeout-minutes between 1 and 5');
  }

  if (!/node-version:\s*["']?22["']?\s*$/m.test(buildJob)) {
    fail('setup-node must pin the CI runtime to Node 22');
  }
  if (!/^\s{8}run:\s*npm ci --ignore-scripts --no-audit --no-fund\s*$/m.test(buildJob)) {
    fail('dependency installation must use deterministic npm ci --ignore-scripts --no-audit --no-fund');
  }
  if (/^\s{8}run:\s*npm (?:install|i)(?:\s|$)/m.test(buildJob)) {
    fail('npm install/npm i is not allowed in the release build job');
  }

  const blocks = stepBlocks(buildJob);
  const auditBlock = blocks.find((block) => /^\s{6}- name:\s*Production dependency vulnerability audit\s*$/m.test(block));
  if (!auditBlock) {
    fail('missing Production dependency vulnerability audit step');
  } else {
    if (!/^\s{8}id:\s*vulnerability_audit\s*$/m.test(auditBlock)) {
      fail("Production dependency vulnerability audit must use id 'vulnerability_audit'");
    }
    if (!/^\s{8}if:\s*steps\.install\.outcome\s*==\s*['"]success['"]\s*$/m.test(auditBlock)) {
      fail('Production dependency vulnerability audit must run only after a successful install');
    }
    if (!/^\s{8}run:\s*npm audit --omit=dev --audit-level=high --no-fund\s*$/m.test(auditBlock)) {
      fail('Production dependency vulnerability audit must block high/critical production dependency advisories');
    }
  }

  const allowedContinueIds = new Set(requiredTrackedSteps.map(([id]) => id));
  for (const block of blocks) {
    if (!/^\s{8}continue-on-error:\s*true\s*$/m.test(block)) continue;
    const id = block.match(/^\s{8}id:\s*([A-Za-z0-9_-]+)\s*$/m)?.[1];
    if (!id || !allowedContinueIds.has(id)) {
      fail(`untracked continue-on-error step${id ? ` '${id}'` : ''} is not allowed`);
    }
  }

  const enforceBlock = blocks.find((block) => /^\s{6}- name:\s*Enforce release gate\s*$/m.test(block));
  if (!enforceBlock) {
    fail('missing Enforce release gate step');
  } else {
    if (!/^\s{8}id:\s*release_gate\s*$/m.test(enforceBlock)) {
      fail("Enforce release gate must use id 'release_gate' so its exact outcome can be published");
    }
    if (!/^\s{8}if:\s*always\(\)\s*$/m.test(enforceBlock)) {
      fail('Enforce release gate must run with if: always()');
    }
    if (/^\s{8}continue-on-error:\s*true\s*$/m.test(enforceBlock)) {
      fail('Enforce release gate may never continue on error');
    }
  }

  if (!/^\s{6}release_gate:\s*\$\{\{\s*steps\.release_gate\.outcome\s*\}\}\s*$/m.test(buildJob)) {
    fail('build job must expose release_gate from steps.release_gate.outcome');
  }

  if (!/^\s{4}needs:\s*build\s*$/m.test(publishJob)) {
    fail('publish-statuses must depend directly on the build job');
  }
  if (!/^\s{4}if:\s*always\(\)\s*&&\s*github\.event_name\s*==\s*['"]push['"]\s*$/m.test(publishJob)) {
    fail('publish-statuses must remain push-only');
  }

  for (const [id, envName] of requiredTrackedSteps) {
    const idPattern = new RegExp(`^\\s{8}id:\\s*${id}\\s*$`, 'm');
    if (!idPattern.test(buildJob)) fail(`missing tracked release step id '${id}'`);

    const buildOutputPattern = new RegExp(
      `^\\s{6}${id}:\\s*\\$\\{\\{\\s*steps\\.${id}\\.outcome\\s*\\}\\}\\s*$`,
      'm',
    );
    if (!buildOutputPattern.test(buildJob)) {
      fail(`build job must expose output '${id}' from steps.${id}.outcome`);
    }

    const envPattern = new RegExp(`^\\s{10}${envName}:\\s*\\$\\{\\{\\s*steps\\.${id}\\.outcome\\s*\\}\\}\\s*$`, 'm');
    if (!envPattern.test(enforceBlock || '')) {
      fail(`Enforce release gate must receive ${envName} from steps.${id}.outcome`);
    }

    const comparisonPattern = new RegExp(`\\[ \\"\\$${envName}\\" = success \\]`);
    if (!comparisonPattern.test(enforceBlock || '')) {
      fail(`Enforce release gate must require ${envName}=success`);
    }

    const assertionNamePattern = new RegExp(`^\\s{6}- name:\\s*Assert ${id} outcome\\s*$`, 'm');
    const assertionBlock = blocks.find((block) => assertionNamePattern.test(block));
    if (!assertionBlock) {
      fail(`missing visible failure assertion for tracked step '${id}'`);
    } else {
      if (!/^\s{8}if:\s*always\(\)\s*$/m.test(assertionBlock)) {
        fail(`Assert ${id} outcome must run with if: always()`);
      }
      const assertionEnvPattern = new RegExp(
        `^\\s{10}OUTCOME:\\s*\\$\\{\\{\\s*steps\\.${id}\\.outcome\\s*\\}\\}\\s*$`,
        'm',
      );
      if (!assertionEnvPattern.test(assertionBlock)) {
        fail(`Assert ${id} outcome must read the exact steps.${id}.outcome value`);
      }
      if (!/^\s{8}run:\s*test\s+"\$OUTCOME"\s*=\s*success\s*$/m.test(assertionBlock)) {
        fail(`Assert ${id} outcome must fail visibly unless OUTCOME=success`);
      }
      if (/^\s{8}continue-on-error:\s*true\s*$/m.test(assertionBlock)) {
        fail(`Assert ${id} outcome may never continue on error`);
      }
    }

    const publishEnvPattern = new RegExp(
      `^\\s{6}${envName}:\\s*\\$\\{\\{\\s*needs\\.build\\.outputs\\.${id}\\s*\\}\\}\\s*$`,
      'm',
    );
    if (!publishEnvPattern.test(publishJob)) {
      fail(`publish-statuses must receive ${envName} from needs.build.outputs.${id}`);
    }
  }

  if (!/^\s{6}RELEASE_GATE:\s*\$\{\{\s*needs\.build\.outputs\.release_gate\s*\}\}\s*$/m.test(publishJob)) {
    fail('publish-statuses must receive RELEASE_GATE from needs.build.outputs.release_gate');
  }
  if (!/if \[ "\$RELEASE_GATE" = success \]; then/.test(publishJob)) {
    fail('publish-statuses overall result must come from the exact final RELEASE_GATE outcome');
  }
  if (!/context='kingdom-network\/release-gate'/.test(publishJob)) {
    fail('publish-statuses must publish the canonical kingdom-network/release-gate context');
  }

  if (/actions\/checkout@/i.test(publishJob) || /\bnpm\s+(?:ci|install|i|test|run)\b/.test(publishJob)) {
    fail('publish-statuses must not checkout code or execute npm install/test/build commands');
  }
}

if (!foundReleaseWorkflow) fail('could not find workflow named Kingdom Network Build');

if (!process.exitCode) {
  console.log('Kingdom Network release-gate structure is fail-closed, production dependency vulnerability scanning is tracked and visible, stage failures are individually visible, PR-visible under the canonical required-check name, GitHub-hosted, deterministic, lifecycle-script-free during install, time-bounded, and the canonical release status is tied to the exact final enforcement outcome.');
}
