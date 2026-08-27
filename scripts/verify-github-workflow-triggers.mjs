import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.env.KINGDOM_NETWORK_WORKFLOW_ROOT || process.cwd());
const workflowsDir = path.join(root, '.github', 'workflows');
const failures = [];

const dangerousTriggers = [
  ['pull_request_target', /(^|\n)\s*pull_request_target\s*:/i],
  ['workflow_run', /(^|\n)\s*workflow_run\s*:/i],
  ['repository_dispatch', /(^|\n)\s*repository_dispatch\s*:/i],
];

async function workflowFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

for (const file of await workflowFiles(workflowsDir)) {
  const relative = path.relative(root, file);
  const content = await readFile(file, 'utf8');

  for (const [name, pattern] of dangerousTriggers) {
    if (pattern.test(content)) {
      failures.push(`${relative} uses privileged trigger ${name}`);
    }
  }

  const isPullRequestWorkflow = /(^|\n)\s*pull_request\s*:/i.test(content);
  if (!isPullRequestWorkflow) continue;

  if (/\$\{\{\s*secrets\./i.test(content)) {
    failures.push(`${relative} references secrets from a pull_request workflow`);
  }

  const explicitReadOnly = /(^|\n)permissions:\s*\n(?:[ \t]+[^\n]+\n)*?[ \t]+contents:\s*read\s*(?:#.*)?(?:\n|$)/i.test(
    content,
  );
  if (!explicitReadOnly) {
    failures.push(`${relative} must declare top-level permissions with contents: read for pull_request`);
  }
}

if (failures.length) {
  console.error('GitHub workflow trigger guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'While Production HOLD is active, PR CI must be read-only and must not use privileged event triggers or repository secrets.',
  );
  process.exit(1);
}

console.log(
  'GitHub workflow trigger guard passed: pull-request CI is read-only and no privileged triggers or PR secrets were found.',
);
