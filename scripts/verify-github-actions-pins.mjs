import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.KINGDOM_NETWORK_ACTIONS_ROOT
  ? path.resolve(process.env.KINGDOM_NETWORK_ACTIONS_ROOT)
  : path.resolve(scriptDir, '..');

const workflowsDir = path.join(repoRoot, '.github', 'workflows');
const failures = [];
const fullCommitSha = /^[0-9a-f]{40}$/i;

function fail(message) {
  failures.push(message);
}

async function inspectWorkflow(fileName) {
  const relativePath = path.join('.github', 'workflows', fileName);
  const source = await readFile(path.join(workflowsDir, fileName), 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/i);
    if (!match) return;

    const reference = match[1].trim();
    if (reference.startsWith('./')) return;

    if (reference.startsWith('docker://')) {
      if (!/@sha256:[0-9a-f]{64}$/i.test(reference)) {
        fail(`${relativePath}:${index + 1} must pin external Docker actions by sha256 digest (${reference})`);
      }
      return;
    }

    const atIndex = reference.lastIndexOf('@');
    const ref = atIndex >= 0 ? reference.slice(atIndex + 1) : '';
    if (atIndex <= 0 || !fullCommitSha.test(ref)) {
      fail(`${relativePath}:${index + 1} must pin external GitHub Actions to a full 40-character commit SHA (${reference})`);
    }
  });
}

let entries;
try {
  entries = await readdir(workflowsDir, { withFileTypes: true });
} catch (error) {
  fail(`.github/workflows must remain readable (${error instanceof Error ? error.message : 'unknown error'})`);
  entries = [];
}

for (const entry of entries) {
  if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
    try {
      await inspectWorkflow(entry.name);
    } catch (error) {
      fail(`Could not inspect .github/workflows/${entry.name} (${error instanceof Error ? error.message : 'unknown error'})`);
    }
  }
}

if (failures.length > 0) {
  console.error('GitHub Actions pin guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('GitHub Actions pin guard passed: every external action is pinned to immutable content.');
