import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.env.KINGDOM_NETWORK_PACKAGE_SCRIPT_ROOT || process.cwd());
const packagePath = path.join(root, 'package.json');
const failures = [];

const requiredScripts = {
  test: 'node --test tests/*.test.mjs',
  lint: 'eslint .',
  build: 'next build',
};

const forbiddenLifecycleScripts = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepare',
  'prepublish',
  'prepublishOnly',
  'publish',
  'postpublish',
  'prepack',
  'postpack',
  'pretest',
  'posttest',
  'prelint',
  'postlint',
  'prebuild',
  'postbuild',
]);

let manifest;
try {
  manifest = JSON.parse(await readFile(packagePath, 'utf8'));
} catch (error) {
  console.error(`Release package-script guard failed: cannot read package.json (${error?.code || error?.name || 'unknown_error'})`);
  process.exit(1);
}

if (!manifest.scripts || typeof manifest.scripts !== 'object' || Array.isArray(manifest.scripts)) {
  failures.push('package.json scripts must be an object');
} else {
  for (const [name, expected] of Object.entries(requiredScripts)) {
    if (manifest.scripts[name] !== expected) {
      failures.push(`package.json scripts.${name} must remain exactly '${expected}'`);
    }
  }

  for (const name of forbiddenLifecycleScripts) {
    if (Object.prototype.hasOwnProperty.call(manifest.scripts, name)) {
      failures.push(`package.json scripts.${name} is not allowed in the protected release path`);
    }
  }
}

if (failures.length) {
  console.error('Release package-script guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'Production HOLD requires test/lint/build to remain the reviewed canonical commands and forbids npm lifecycle hooks that could execute extra commands before or after protected release stages.',
  );
  process.exit(1);
}

console.log(
  'Release package-script guard passed: test/lint/build match the reviewed commands and protected npm lifecycle hooks are absent.',
);
