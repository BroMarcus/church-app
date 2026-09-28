import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const codeownersPath = path.join(repoRoot, '.github', 'CODEOWNERS');

const requiredOwnedPaths = [
  '/.github/CODEOWNERS @BroMarcus',
  '/.github/workflows/ @BroMarcus',
  '/vercel.json @BroMarcus',
  '/package.json @BroMarcus',
  '/package-lock.json @BroMarcus',
  '/scripts/verify-*.mjs @BroMarcus',
  '/tests/github-*.test.mjs @BroMarcus',
  '/tests/codeowners-sensitive-paths.test.mjs @BroMarcus',
  '/supabase/ @BroMarcus',
  '/proxy.ts @BroMarcus',
  '/src/lib/supabase/ @BroMarcus',
  '/src/app/auth/ @BroMarcus',
  '/src/app/account/ @BroMarcus',
  '/src/app/guide/ @BroMarcus',
  '/src/app/church/ @BroMarcus',
];

const sensitiveTargets = [
  'proxy.ts',
  'src/lib/supabase',
  'src/app/auth',
  'src/app/account',
  'src/app/guide',
  'src/app/church',
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('CODEOWNERS routes current Kingdom Network sensitive surfaces to the repository owner', async () => {
  const codeowners = await readFile(codeownersPath, 'utf8');
  for (const line of requiredOwnedPaths) {
    assert.match(codeowners, new RegExp(`^${escapeRegExp(line)}\\s*$`, 'm'), `missing CODEOWNERS rule: ${line}`);
  }
});

test('CODEOWNERS sensitive path rules point at paths that actually exist', async () => {
  for (const target of sensitiveTargets) {
    await assert.doesNotReject(access(path.join(repoRoot, target)), `CODEOWNERS target does not exist: ${target}`);
  }
});

test('CODEOWNERS does not retain stale pre-src auth or middleware paths', async () => {
  const codeowners = await readFile(codeownersPath, 'utf8');
  assert.doesNotMatch(codeowners, /^\/app\/auth\/\s+/m);
  assert.doesNotMatch(codeowners, /^\/middleware\.ts\s+/m);
});
