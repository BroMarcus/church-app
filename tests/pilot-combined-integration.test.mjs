import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const manifestPath = path.join(process.cwd(), 'docs', 'PILOT_COMBINED_INTEGRATION_MANIFEST.md');
const snapshotPath = path.join(process.cwd(), 'docs', 'PILOT_COMBINED_RELEASE_SNAPSHOT.md');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const snapshot = fs.readFileSync(snapshotPath, 'utf8');

const requiredAuthorityHeads = {
  31: 'e245c419ec63bccf698a8e177ad91113f3df2b52',
  36: '4fca3253c888cf3515d4b23096126c9d871d42f7',
  40: 'ec46c40caf7029cac4e2d54b986a085c43afd95c',
  41: 'f097c2c6ada5308188c95d98dcc8ecf133691e5f',
  44: 'db6cd5db0686b89f584a09b6ef15e14a0164036e',
  49: '4d87205609ac69e5d1c7e4eaba995edc85d95fd9',
  50: 'bbf9ada6e0b32d47ab153b1ae8738cf2a8d97a03',
  51: '430c8726d9c06e16430a5d1a918c0c7d54592eb6',
  52: 'feb88ce48a9e489f971415c934b820c4f7ec3281',
  53: '15b3aaa5420926fdb8d1a0f33ada20dc6d03694a',
};

const requiredSafetyPhrases = [
  'Production deployment remains **HOLD**',
  'do not deploy individual draft PRs',
  'Do not touch Finance/role/RLS objects owned by the Finance workstream',
  'Do not merge V2 PR #46 into the V1 pilot release',
  'use #36 as the auth-flow authority',
  'use #51 as Guide-page authority',
  'use #52 as readiness authority',
  'use #50 as the visual/navigation/Home authority',
  'real-phone English + Spanish proof',
  'duplicate user account is required or encouraged for an existing member',
  'church A can see church B data',
  'setup approval publishes curriculum automatically',
  'a slow/repeated tap creates duplicate consequential records',
  'real-phone evidence was collected against a different site/build than the release candidate',
];

test('combined release snapshot pins the authority PR heads used for reconciliation', () => {
  for (const [pr, sha] of Object.entries(requiredAuthorityHeads)) {
    assert.match(
      snapshot,
      new RegExp(`\\| #${pr} \\|[^\\n]*\\| \\`${sha}\\` \\|`),
      `snapshot must pin PR #${pr} to ${sha}`,
    );
  }
});

test('combined integration manifest preserves non-negotiable release boundaries', () => {
  for (const phrase of requiredSafetyPhrases) {
    assert.ok(manifest.includes(phrase), `missing release safety rule: ${phrase}`);
  }
});

test('combined integration manifest requires exact combined-head validation and human proof', () => {
  assert.match(manifest, /All must pass on the \*\*exact combined head\*\*/);
  assert.match(manifest, /dependency install/);
  assert.match(manifest, /security\/regression suite/);
  assert.match(manifest, /full Next\.js production build/);
  assert.match(manifest, /Run on the exact deployed preview\/build and record PASS\/FAIL in both English and Spanish/);
  assert.match(manifest, /existing account opens newest church join link → joins without creating a duplicate account/i);
  assert.match(manifest, /Forgot password → reset password → sign in; if started from church join, intended join context survives/i);
  assert.match(manifest, /Result opens as an \*\*unpublished\*\* draft in Course Builder/i);
});

test('combined release snapshot requires end-to-end private-invite recovery proof', () => {
  assert.match(snapshot, /\*\*private invitation → existing account\*\* is tested as one continuous path/i);
  assert.match(snapshot, /direct sign-in applies the invitation to the same account/i);
  assert.match(snapshot, /forgot-password recovery preserves the invitation through reset\/sign-in/i);
  assert.match(snapshot, /unconfirmed-email resend\/confirmation returns the same account to finish invitation redemption/i);
  assert.match(snapshot, /must not sign the member out of unrelated devices/i);
  assert.match(snapshot, /real-phone English \+ Spanish proof against one exact deployed PR #55 build/i);
});

test('combined release snapshot records exact-head CI and read-only runtime audit boundaries', () => {
  assert.match(snapshot, /Kingdom Network Build #1413: \*\*SUCCESS\*\*/);
  assert.match(snapshot, /latest 24-hour window: \*\*no runtime errors found\*\*/i);
  assert.match(snapshot, /does \*\*not\*\* replace exact-build phone acceptance/i);
  assert.match(snapshot, /Any new commit on PR #55 creates a new exact head and requires a fresh Kingdom Network Build/i);
});

test('combined release snapshot requires complete auth and public-join success state before consequential continuation', () => {
  assert.match(snapshot, /password sign-in requires a real authenticated user and session/i);
  assert.match(snapshot, /signup requires an Auth user before showing `account created`/i);
  assert.match(snapshot, /public church-link signup now also requires an actual Auth user/i);
  assert.match(snapshot, /modern PKCE callback requires both user and session/i);
  assert.match(snapshot, /token-hash verification path requires both user and session/i);
  assert.match(snapshot, /password update requires Auth to return the updated user/i);
  assert.match(snapshot, /existing-account public church joining requires the RPC `already_member` value to be an actual boolean/i);
  assert.match(snapshot, /Auth success paths must not continue unless the required user\/session state is actually present/i);
});

test('combined release snapshot protects Setup Inbox file-type and duplicate-upload safety', () => {
  assert.match(snapshot, /filename extension is required even when the browser reports a MIME type/i);
  assert.match(snapshot, /browser MIME is present it must match the approved extension/i);
  assert.match(snapshot, /normalized accepted MIME is used for storage metadata/i);
  assert.match(snapshot, /rejects mismatched extension\/MIME combinations before storage writes/i);
  assert.match(snapshot, /uploads remain locked after a confirmed save/i);
});

test('critical integration files contain no unresolved merge-conflict markers', () => {
  const roots = ['src', 'tests', '.github'];
  const marker = /^(<<<<<<<|=======|>>>>>>>)(?: |$)/m;
  const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md']);

  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.has(path.extname(entry.name))) files.push(full);
    }
  };

  for (const root of roots) walk(path.join(process.cwd(), root));
  files.push(manifestPath, snapshotPath);

  const conflicted = files.filter((file) => marker.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(conflicted, [], `unresolved merge conflict markers found in: ${conflicted.join(', ')}`);
});