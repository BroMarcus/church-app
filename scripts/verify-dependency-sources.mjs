import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.env.KINGDOM_NETWORK_DEPENDENCY_ROOT || process.cwd());
const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const failures = [];
const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies'];
const forbiddenDirectSource = /^(?:git(?:\+[^:]+)?:|github:|https?:|file:|link:|workspace:|npm:)/i;
const forbiddenTag = /^(?:latest|next|canary|beta|alpha|rc)$/i;
const registryOrigin = 'https://registry.npmjs.org';

function fail(message) {
  failures.push(message);
}

function safeDirectSpec(name, spec, section) {
  if (typeof spec !== 'string' || !spec.trim()) {
    fail(`${section}.${name} must use a non-empty registry version/range`);
    return;
  }

  const trimmed = spec.trim();
  if (forbiddenDirectSource.test(trimmed)) {
    fail(`${section}.${name} uses forbidden non-registry or alias source '${trimmed}'`);
  }
  if (forbiddenTag.test(trimmed)) {
    fail(`${section}.${name} uses mutable dist-tag '${trimmed}'`);
  }
  if (trimmed === '*' || trimmed === 'x' || trimmed === 'X') {
    fail(`${section}.${name} uses an unbounded version '${trimmed}'`);
  }
}

let manifest;
let lock;
try {
  manifest = JSON.parse(await readFile(packagePath, 'utf8'));
} catch (error) {
  console.error(`Dependency source guard failed: cannot read package.json (${error?.code || error?.name || 'unknown_error'})`);
  process.exit(1);
}

try {
  lock = JSON.parse(await readFile(lockPath, 'utf8'));
} catch (error) {
  console.error(`Dependency source guard failed: cannot read package-lock.json (${error?.code || error?.name || 'unknown_error'})`);
  process.exit(1);
}

if (lock.lockfileVersion !== 3) {
  fail(`package-lock.json must use lockfileVersion 3; found ${String(lock.lockfileVersion)}`);
}
if (!lock.packages || typeof lock.packages !== 'object') {
  fail('package-lock.json must contain a packages object');
}

for (const section of dependencySections) {
  const dependencies = manifest[section] || {};
  if (dependencies && typeof dependencies !== 'object') {
    fail(`package.json ${section} must be an object`);
    continue;
  }
  for (const [name, spec] of Object.entries(dependencies)) safeDirectSpec(name, spec, section);
}

const lockRoot = lock.packages?.[''] || {};
for (const section of dependencySections) {
  const manifestDeps = manifest[section] || {};
  const lockDeps = lockRoot[section] || {};
  const names = new Set([...Object.keys(manifestDeps), ...Object.keys(lockDeps)]);
  for (const name of names) {
    if (manifestDeps[name] !== lockDeps[name]) {
      fail(
        `package-lock root ${section}.${name} must exactly match package.json (${String(manifestDeps[name])} != ${String(lockDeps[name])})`,
      );
    }
  }
}

for (const [packageKey, entry] of Object.entries(lock.packages || {})) {
  if (!packageKey || !entry || typeof entry !== 'object') continue;

  if (entry.link === true) {
    fail(`${packageKey} is a local/link dependency`);
  }

  if (entry.resolved === undefined) continue;
  if (typeof entry.resolved !== 'string' || !entry.resolved.trim()) {
    fail(`${packageKey} has an invalid resolved source`);
    continue;
  }

  let resolved;
  try {
    resolved = new URL(entry.resolved);
  } catch {
    fail(`${packageKey} resolved source is not an absolute registry URL`);
    continue;
  }

  if (resolved.origin !== registryOrigin || resolved.protocol !== 'https:') {
    fail(`${packageKey} resolves outside ${registryOrigin}`);
  }
  if (!resolved.pathname.endsWith('.tgz')) {
    fail(`${packageKey} resolved registry source is not a tarball`);
  }
  if (typeof entry.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/=]+$/.test(entry.integrity)) {
    fail(`${packageKey} resolved tarball must have sha512 integrity`);
  }
}

if (failures.length) {
  console.error('Dependency source provenance guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'Production HOLD requires npm dependencies to stay lockfile-pinned to integrity-checked registry.npmjs.org tarballs; Git/URL/local/alias sources and mutable dist-tags are not allowed.',
  );
  process.exit(1);
}

console.log(
  'Dependency source provenance guard passed: direct specs are bounded registry ranges and lockfile packages use integrity-checked registry.npmjs.org tarballs.',
);
