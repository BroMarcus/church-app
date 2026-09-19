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

function stripYamlComment(line) {
  let singleQuoted = false;
  let doubleQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];

    if (char === "'" && !doubleQuoted) {
      singleQuoted = !singleQuoted;
      continue;
    }
    if (char === '"' && !singleQuoted && previous !== '\\') {
      doubleQuoted = !doubleQuoted;
      continue;
    }
    if (char === '#' && !singleQuoted && !doubleQuoted) return line.slice(0, index);
  }

  return line;
}

function normalizeScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, '').trim().toLowerCase();
}

function inlinePermissionEntries(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return [];

  const entries = [];
  for (const match of trimmed.matchAll(
    /(?:^|[,\s{])(['"]?[a-z0-9-]+['"]?)\s*:\s*(['"]?(?:read|write|none)['"]?)(?=\s*[,}])/gi,
  )) {
    entries.push({
      scope: normalizeScalar(match[1]),
      access: normalizeScalar(match[2]),
    });
  }
  return entries;
}

for (const file of await workflowFiles(workflowsDir)) {
  const relative = path.relative(root, file);
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let statusWriteCount = 0;

  lines.forEach((rawLine, index) => {
    const line = stripYamlComment(rawLine);
    const permissionsMatch = line.match(/^\s*permissions:\s*(.*?)\s*$/i);
    if (permissionsMatch) {
      const value = normalizeScalar(permissionsMatch[1]);
      if (value === 'write-all') {
        failures.push(`${relative}:${index + 1} uses permissions: write-all`);
      }

      for (const { scope, access } of inlinePermissionEntries(permissionsMatch[1])) {
        if (access !== 'write') continue;
        if (!allowedWriteScopes.has(scope)) {
          failures.push(`${relative}:${index + 1} grants unexpected ${scope}: write permission inline`);
          continue;
        }
        if (scope === 'statuses') statusWriteCount += 1;
      }
    }

    const writePermission = line.match(/^\s*([a-z0-9-]+):\s*write\s*$/i);
    if (!writePermission) return;

    const scope = writePermission[1].toLowerCase();
    if (!allowedWriteScopes.has(scope)) {
      failures.push(`${relative}:${index + 1} grants unexpected ${writePermission[1]}: write permission`);
      return;
    }

    if (scope === 'statuses') statusWriteCount += 1;
  });

  if (statusWriteCount > 1) {
    failures.push(`${relative} grants statuses: write more than once`);
  }

  if (statusWriteCount === 1) {
    const hasDedicatedPublisher = /(^|\n)  publish-statuses:\s*(?:#.*)?\n/i.test(content);
    const isPushOnlyPublisher = /(^|\n)    if:\s*always\(\)\s*&&\s*github\.event_name\s*==\s*['"]push['"]\s*(?:#.*)?\n/i.test(
      content,
    );
    const publisherHasBlockStatusWrite = /(^|\n)  publish-statuses:[\s\S]*?\n    permissions:\s*\n(?:      [^\n]+\n)*?      statuses:\s*write\s*(?:#.*)?(?:\n|$)/i.test(
      content,
    );
    const publisherHasInlineStatusWrite = /(^|\n)  publish-statuses:[\s\S]*?\n    permissions:\s*\{[^\n}]*\bstatuses\s*:\s*write\b[^\n}]*\}\s*(?:#.*)?(?:\n|$)/i.test(
      content,
    );

    if (
      !hasDedicatedPublisher ||
      !isPushOnlyPublisher ||
      (!publisherHasBlockStatusWrite && !publisherHasInlineStatusWrite)
    ) {
      failures.push(
        `${relative} may grant statuses: write only inside the dedicated push-only publish-statuses job`,
      );
    }
  }
}

if (failures.length) {
  console.error('GitHub workflow permission guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'Only the dedicated push-only publish-statuses job may hold statuses: write while Production HOLD is active.',
  );
  process.exit(1);
}

console.log(
  'GitHub workflow permission guard passed: block and inline permissions are read-only except for isolated push-only status publishing.',
);
