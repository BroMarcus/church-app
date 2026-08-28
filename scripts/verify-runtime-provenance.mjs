import { execFileSync } from 'node:child_process';
import process from 'node:process';

const expectedNode = 'v22.23.2';
const expectedNpm = '10.9.8';
const expectedRegistry = 'https://registry.npmjs.org/';
const expectedUserConfig = '/dev/null';
const failures = [];

function fail(message) {
  failures.push(message);
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

if (failures.length) {
  console.error('Runtime provenance guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'Production HOLD requires the release gate to use the reviewed Node/npm toolchain and the reviewed npm registry/user-config boundary rather than mutable runtime or install configuration.',
  );
  process.exit(1);
}

console.log(
  `Runtime provenance guard passed: Node ${expectedNode}, npm ${expectedNpm}, registry ${expectedRegistry}, userconfig ${expectedUserConfig}.`,
);
