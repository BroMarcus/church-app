import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.env.KINGDOM_NETWORK_WORKFLOW_ROOT || process.cwd());
const workflowsDir = path.join(root, '.github', 'workflows');
const failures = [];
const dangerousTriggers = new Set(['pull_request_target', 'workflow_run', 'repository_dispatch']);

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

    if (char === '#' && !singleQuoted && !doubleQuoted) {
      return line.slice(0, index);
    }
  }

  return line;
}

function normalizeYamlKey(value) {
  return value.trim().replace(/^['"]|['"]$/g, '').trim().toLowerCase();
}

function parseInlineEvents(value) {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map(normalizeYamlKey)
      .filter(Boolean);
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const events = [];
    for (const match of trimmed.matchAll(/(?:^|[,\s{])(['"]?[a-zA-Z_][\w-]*['"]?)\s*:/g)) {
      events.push(normalizeYamlKey(match[1]));
    }
    return events;
  }

  return [normalizeYamlKey(trimmed)];
}

function workflowEvents(content) {
  const lines = content.split(/\r?\n/).map(stripYamlComment);
  const events = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const onMatch = line.match(/^\s*(?:on|['"]on['"])\s*:\s*(.*?)\s*$/i);
    if (!onMatch) continue;

    const inline = onMatch[1];
    if (inline) {
      for (const event of parseInlineEvents(inline)) events.add(event);
      continue;
    }

    const block = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor];
      if (!candidate.trim()) continue;
      if (/^\S/.test(candidate)) break;
      block.push(candidate);
    }

    const keyLines = block
      .map((candidate) => {
        const match = candidate.match(/^(\s+)(['"]?[a-zA-Z_][\w-]*['"]?)\s*:/);
        if (!match) return null;
        return { indent: match[1].length, key: normalizeYamlKey(match[2]) };
      })
      .filter(Boolean);

    if (!keyLines.length) continue;
    const eventIndent = Math.min(...keyLines.map(({ indent }) => indent));
    for (const { indent, key } of keyLines) {
      if (indent === eventIndent) events.add(key);
    }
  }

  return events;
}

function hasSecretReference(content) {
  return /\$\{\{\s*secrets\s*(?:\.|\[)/i.test(content);
}

function hasEnvironmentBinding(content) {
  return /(^|\n)\s{2,}environment\s*:/i.test(content);
}

function containsUntrustedPrExpression(value) {
  return /\$\{\{\s*(?:github\.event\.pull_request(?:\.|\[)|github\.head_ref\b)/i.test(value);
}

function untrustedPrShellInterpolations(content) {
  const lines = content.split(/\r?\n/);
  const findings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const runMatch = line.match(/^(\s*)(?:-\s*)?run\s*:\s*(.*)$/i);
    if (!runMatch) continue;

    const runIndent = runMatch[1].length;
    const value = runMatch[2].trim();

    if (value && value !== '|' && value !== '>' && value !== '|-' && value !== '>-') {
      if (containsUntrustedPrExpression(value)) findings.push(index + 1);
      continue;
    }

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor];
      if (!candidate.trim()) continue;
      const candidateIndent = candidate.match(/^\s*/)?.[0].length ?? 0;
      if (candidateIndent <= runIndent) break;
      if (containsUntrustedPrExpression(candidate)) findings.push(cursor + 1);
    }
  }

  return findings;
}

for (const file of await workflowFiles(workflowsDir)) {
  const relative = path.relative(root, file);
  const content = await readFile(file, 'utf8');
  const events = workflowEvents(content);

  for (const trigger of dangerousTriggers) {
    if (events.has(trigger)) {
      failures.push(`${relative} uses privileged trigger ${trigger}`);
    }
  }

  if (!events.has('pull_request')) continue;

  if (hasSecretReference(content)) {
    failures.push(`${relative} references secrets from a pull_request workflow`);
  }

  if (hasEnvironmentBinding(content)) {
    failures.push(
      `${relative} binds a GitHub Environment from a pull_request workflow; PR CI must not gain environment secrets or deployment authority`,
    );
  }

  for (const lineNumber of untrustedPrShellInterpolations(content)) {
    failures.push(
      `${relative}:${lineNumber} interpolates untrusted pull-request metadata directly into a shell run step; pass it through an env variable or avoid shell interpolation`,
    );
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
    'While Production HOLD is active, PR CI must be read-only and must not use privileged triggers, repository/environment secrets, GitHub Environments, or untrusted PR metadata interpolated directly into shell run steps.',
  );
  process.exit(1);
}

console.log(
  'GitHub workflow trigger guard passed: pull-request CI is read-only and no privileged triggers, PR secrets, GitHub Environment bindings, or direct untrusted PR-metadata shell interpolation were found.',
);
