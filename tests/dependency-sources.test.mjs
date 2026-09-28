import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const guardScript = path.join(repoRoot, 'scripts', 'verify-dependency-sources.mjs');

async function fixture({
  spec = '^1.2.3',
  resolved = 'https://registry.npmjs.org/example/-/example-1.2.3.tgz',
  integrity = 'sha512-QUJDRA==',
  packageManager = 'npm@10.9.8',
  nodeEngine = '22.x',
} = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kingdom-network-dependency-sources-'));
  const manifest = {
    name: 'fixture',
    version: '1.0.0',
    packageManager,
    engines: { node: nodeEngine },
    dependencies: { example: spec },
  };
  const lock = {
    name: 'fixture',
    version: '1.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: 'fixture', version: '1.0.0', dependencies: { example: spec } },
      'node_modules/example': { version: '1.2.3', resolved, integrity },
    },
  };
  await writeFile(path.join(root, 'package.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(root, 'package-lock.json'), JSON.stringify(lock, null, 2));
  return root;
}

async function runGuard(root) {
  return execFileAsync(process.execPath, [guardScript], {
    env: { ...process.env, KINGDOM_NETWORK_DEPENDENCY_ROOT: root },
  });
}

test('dependency source guard accepts pinned npm plus bounded registry dependency with sha512 lock integrity', async () => {
  const root = await fixture();
  try {
    const result = await runGuard(root);
    assert.match(result.stdout, /npm@10\.9\.8 is pinned/i);
    assert.match(result.stdout, /provenance guard passed/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency source guard rejects missing or drifted packageManager pin', async () => {
  for (const packageManager of [undefined, 'npm@10.9.7', 'npm@latest', 'pnpm@10.0.0']) {
    const root = await fixture({ packageManager });
    try {
      if (packageManager === undefined) {
        const manifestPath = path.join(root, 'package.json');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        delete manifest.packageManager;
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      }
      await assert.rejects(runGuard(root), (error) => {
        assert.match(error.stderr, /packageManager must be exactly 'npm@10\.9\.8'/i);
        return true;
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('dependency source guard rejects Node engine drift from the supported major line', async () => {
  const root = await fixture({ nodeEngine: '>=20.9.0' });
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /engines\.node must remain '22\.x'/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const spec of [
  'git+https://github.com/example/example.git#main',
  'github:example/example',
  'https://example.com/example.tgz',
  'file:../example',
  'link:../example',
  'workspace:*',
  'npm:other-package@1.2.3',
  'latest',
  '*',
]) {
  test(`dependency source guard rejects direct source ${spec}`, async () => {
    const root = await fixture({ spec });
    try {
      await assert.rejects(runGuard(root), (error) => {
        assert.match(error.stderr, /forbidden|mutable|unbounded/i);
        return true;
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('dependency source guard rejects repository-local npm configuration overrides', async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, '.npmrc'), 'registry=https://packages.example.invalid/\n');
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /\.npmrc is not allowed/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency source guard rejects even empty repository-local npm config so install behavior cannot drift later', async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, '.npmrc'), '');
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /\.npmrc is not allowed/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency source guard rejects npm-shrinkwrap because it can override the reviewed package-lock', async () => {
  const root = await fixture();
  try {
    const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
    await writeFile(path.join(root, 'npm-shrinkwrap.json'), JSON.stringify(lock, null, 2));
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /npm-shrinkwrap\.json is not allowed/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency source guard rejects non-npm registry tarball source', async () => {
  const root = await fixture({ resolved: 'https://example.com/example-1.2.3.tgz' });
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /resolves outside/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency source guard rejects missing sha512 integrity', async () => {
  const root = await fixture({ integrity: 'sha1-QUJDRA==' });
  try {
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /sha512 integrity/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency source guard rejects package-lock drift from package.json', async () => {
  const root = await fixture();
  try {
    const lockPath = path.join(root, 'package-lock.json');
    const lock = JSON.parse(await readFile(lockPath, 'utf8'));
    lock.packages[''].dependencies.example = '^9.9.9';
    await writeFile(lockPath, JSON.stringify(lock, null, 2));
    await assert.rejects(runGuard(root), (error) => {
      assert.match(error.stderr, /must exactly match package\.json/i);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
