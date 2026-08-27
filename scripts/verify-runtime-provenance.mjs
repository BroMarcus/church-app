import { execFileSync } from 'node:child_process';
import process from 'node:process';

const expectedNode = 'v22.23.2';
const expectedNpm = '10.9.8';
const failures = [];

function fail(message) {
  failures.push(message);
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

if (process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_OS !== 'Linux') {
  fail(`release gate must run on GitHub-hosted Linux; found ${process.env.RUNNER_OS || 'unknown'}`);
}

if (failures.length) {
  console.error('Runtime provenance guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'Production HOLD requires the release gate to use the reviewed Node/npm toolchain rather than a mutable major-version runtime.',
  );
  process.exit(1);
}

console.log(`Runtime provenance guard passed: Node ${expectedNode} and npm ${expectedNpm}.`);
