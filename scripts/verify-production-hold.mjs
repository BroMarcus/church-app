import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.KINGDOM_NETWORK_HOLD_ROOT
  ? path.resolve(process.env.KINGDOM_NETWORK_HOLD_ROOT)
  : path.resolve(scriptDir, '..');

const failures = [];
const executableExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.sh', '.bash', '.zsh', '.ps1']);

async function readText(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

async function verifyVercelConfig() {
  let config;
  try {
    config = JSON.parse(await readText('vercel.json'));
  } catch (error) {
    fail(`vercel.json must exist and contain valid JSON (${error instanceof Error ? error.message : 'unknown error'})`);
    return;
  }

  if (config?.git?.deploymentEnabled !== false) {
    fail('vercel.json must keep git.deploymentEnabled=false while production deployment is on HOLD');
  }
}

function findProductionDeployCommands(source, label) {
  const blockedPatterns = [
    /\bvercel(?:\s+deploy)?\b[^\n]*\s--prod(?:\s|$)/i,
    /\bvercel\s+promote\b/i,
    /\bVERCEL_TARGET\s*[:=]\s*["']?production\b/i,
    /\btarget\s*:\s*production\b/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(source)) {
      fail(`${label} contains a production-deploy command/configuration while deployment is on HOLD`);
      return;
    }
  }
}

async function verifyWorkflows() {
  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  let entries;
  try {
    entries = await readdir(workflowsDir, { withFileTypes: true });
  } catch (error) {
    fail(`.github/workflows must remain readable (${error instanceof Error ? error.message : 'unknown error'})`);
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
    const relativePath = path.join('.github', 'workflows', entry.name);
    findProductionDeployCommands(await readText(relativePath), relativePath);
  }
}

async function verifyPackageScripts() {
  let packageJson;
  try {
    packageJson = JSON.parse(await readText('package.json'));
  } catch (error) {
    fail(`package.json must contain valid JSON (${error instanceof Error ? error.message : 'unknown error'})`);
    return;
  }

  const scripts = packageJson?.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command === 'string') {
      findProductionDeployCommands(command, `package.json script "${name}"`);
    }
  }
}

async function verifyExecutableScripts() {
  const scriptsRoot = path.join(repoRoot, 'scripts');
  let rootEntries;
  try {
    rootEntries = await readdir(scriptsRoot, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    fail(`scripts directory must remain readable (${error instanceof Error ? error.message : 'unknown error'})`);
    return;
  }

  const pending = rootEntries.map((entry) => ({ entry, directory: scriptsRoot, relativeDirectory: 'scripts' }));
  while (pending.length) {
    const { entry, directory, relativeDirectory } = pending.pop();
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      const children = await readdir(absolutePath, { withFileTypes: true });
      for (const child of children) pending.push({ entry: child, directory: absolutePath, relativeDirectory: relativePath });
      continue;
    }
    if (!entry.isFile() || !executableExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    findProductionDeployCommands(await readFile(absolutePath, 'utf8'), relativePath);
  }
}

await Promise.all([
  verifyVercelConfig(),
  verifyWorkflows(),
  verifyPackageScripts(),
  verifyExecutableScripts(),
]);

if (failures.length > 0) {
  console.error('Production HOLD guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production HOLD guard passed: Vercel Git deployment is disabled and no production-deploy commands were found in workflows, package scripts, or executable scripts.');
