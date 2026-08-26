import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.env.KINGDOM_NETWORK_WORKFLOW_ROOT || process.cwd());
const workflowsDir = path.join(root, '.github', 'workflows');
const allowedWriteScopes = new Set(['statuses']);
const failures = [];

async function workflowFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

for (const file of await workflowFiles(workflowsDir)) {
  const relative = path.relative(root, file);
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/^\s*permissions:\s*write-all\s*(?:#.*)?$/i.test(line)) {
      failures.push(`${relative}:${index + 1} uses permissions: write-all`);
      return;
    }

    const writePermission = line.match(/^\s*([a-z0-9-]+):\s*write\s*(?:#.*)?$/i);
    if (writePermission && !allowedWriteScopes.has(writePermission[1].toLowerCase())) {
      failures.push(
        `${relative}:${index + 1} grants unexpected ${writePermission[1]}: write permission`,
      );
    }
  });
}

if (failures.length) {
  console.error('GitHub workflow permission guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Only the narrowly-scoped statuses: write permission is allowed while Production HOLD is active.');
  process.exit(1);
}

console.log('GitHub workflow permission guard passed: no unexpected write permissions found.');
