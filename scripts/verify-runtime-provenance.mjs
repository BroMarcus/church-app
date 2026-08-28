import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const expectedNode = 'v22.23.2';
const expectedNpm = '10.9.8';
const expectedRegistry = 'https://registry.npmjs.org/';
const expectedUserConfig = '/dev/null';
const allowedReleaseEvents = new Set(['pull_request', 'push', 'workflow_dispatch']);
const shaPattern = /^[0-9a-f]{40}$/;
const failures = [];

function fail(message) {
  failures.push(message);
}

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    fail(`cannot run ${command} ${args.join(' ')} (${error?.code || error?.name || 'unknown_error'})`);
    return '';
  }
}

function readNpmConfig(key) {
  try {
    return execFileSync('npm', ['config', 'get', key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    fail(`cannot verify npm config '${key}' (${error?.code || error?.name || 'unknown_error'})`);
    return '';
  }
}

function validSha(value) {
  return typeof value === 'string' && shaPattern.test(value);
}

function verifyCheckoutProvenance() {
  if (process.env.GITHUB_ACTIONS !== 'true') return;

  const eventName = process.env.GITHUB_EVENT_NAME || '';
  if (!allowedReleaseEvents.has(eventName)) {
    fail(`release gate event must be pull_request, push, or workflow_dispatch; found ${eventName || 'unset'}`);
    return;
  }

  const expectedSha = process.env.GITHUB_SHA || '';
  if (!validSha(expectedSha)) {
    fail('GITHUB_SHA must be an exact 40-character commit SHA');
    return;
  }

  const checkedOutSha = run('git', ['rev-parse', 'HEAD']);
  if (checkedOutSha && checkedOutSha !== expectedSha) {
    fail(`checked-out commit must equal GITHUB_SHA; expected ${expectedSha}, found ${checkedOutSha}`);
  }

  const status = run('git', ['status', '--porcelain=v1', '--untracked-files=all']);
  if (status) {
    fail('release gate checkout must be clean before dependency installation');
  }

  if (eventName !== 'pull_request') return;

  const eventPath = process.env.GITHUB_EVENT_PATH || '';
  let event;
  try {
    event = JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch (error) {
    fail(`cannot read GitHub pull-request event payload (${error?.code || error?.name || 'unknown_error'})`);
    return;
  }

  const prNumber = event?.pull_request?.number;
  const headSha = event?.pull_request?.head?.sha || '';
  const baseRef = event?.pull_request?.base?.ref || '';
  if (!Number.isInteger(prNumber) || prNumber < 1 || !validSha(headSha) || !baseRef) {
    fail('pull-request event must provide a valid PR number, exact head SHA, and base branch');
    return;
  }

  const expectedRef = `refs/pull/${prNumber}/merge`;
  if (process.env.GITHUB_REF !== expectedRef) {
    fail(`pull-request release gate must execute the GitHub merge ref ${expectedRef}; found ${process.env.GITHUB_REF || 'unset'}`);
  }
  if (process.env.GITHUB_BASE_REF !== baseRef) {
    fail(`GITHUB_BASE_REF must match the pull-request base branch ${baseRef}; found ${process.env.GITHUB_BASE_REF || 'unset'}`);
  }

  // actions/checkout intentionally uses a shallow clone by default. Reading the HEAD commit
  // object itself preserves parent headers even when parent commit objects are not present.
  // GitHub may refresh the synthetic merge against a newer base-tip SHA than the base SHA
  // serialized in the triggering PR payload, so the authoritative tested base snapshot is the
  // first parent of GITHUB_SHA. The exact PR head must remain the second parent.
  const commitObject = run('git', ['cat-file', '-p', 'HEAD']);
  const parents = commitObject
    .split('\n')
    .filter((line) => line.startsWith('parent '))
    .map((line) => line.slice('parent '.length).trim());
  if (parents.length !== 2 || !parents.every(validSha)) {
    fail(`pull-request checkout must be GitHub's two-parent test merge; found ${parents.length} valid parent(s)`);
    return;
  }

  const [baseSnapshotSha, testedHeadSha] = parents;
  if (testedHeadSha !== headSha) {
    fail(`pull-request test merge second parent must equal event head SHA ${headSha}; found ${testedHeadSha}`);
  }
  if (baseSnapshotSha === headSha) {
    fail('pull-request test merge base snapshot must be distinct from the PR head');
  }
}

if (process.version !== expectedNode) {
  fail(`Node runtime must be ${expectedNode}; found ${process.version}`);
}

let npmVersion = '';
try {
  npmVersion = execFileSync('npm', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  fail(`cannot verify npm runtime (${error?.code || error?.name || 'unknown_error'})`);
}

if (npmVersion && npmVersion !== expectedNpm) {
  fail(`npm runtime must be ${expectedNpm}; found ${npmVersion}`);
}

const npmRegistry = readNpmConfig('registry');
if (npmRegistry && npmRegistry !== expectedRegistry) {
  fail(`npm registry must be ${expectedRegistry}; found ${npmRegistry}`);
}

const npmUserConfig = readNpmConfig('userconfig');
if (npmUserConfig && npmUserConfig !== expectedUserConfig) {
  fail(`npm userconfig must be ${expectedUserConfig}; found ${npmUserConfig}`);
}

if (process.env.NPM_CONFIG_REGISTRY !== expectedRegistry) {
  fail(`NPM_CONFIG_REGISTRY must be ${expectedRegistry}; found ${process.env.NPM_CONFIG_REGISTRY || 'unset'}`);
}
if (process.env.NPM_CONFIG_USERCONFIG !== expectedUserConfig) {
  fail(`NPM_CONFIG_USERCONFIG must be ${expectedUserConfig}; found ${process.env.NPM_CONFIG_USERCONFIG || 'unset'}`);
}

if (process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_OS !== 'Linux') {
  fail(`release gate must run on GitHub-hosted Linux; found ${process.env.RUNNER_OS || 'unknown'}`);
}

verifyCheckoutProvenance();

if (failures.length) {
  console.error('Runtime provenance guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'Production HOLD requires the release gate to use the reviewed npm registry/user-config boundary and Node/npm toolchain, plus the exact GitHub checkout and pull-request merge state represented by the workflow event.',
  );
  process.exit(1);
}

console.log(
  `Runtime provenance guard passed: Node ${expectedNode}, npm ${expectedNpm}, registry ${expectedRegistry}, userconfig ${expectedUserConfig}, and exact checkout provenance verified.`,
);
