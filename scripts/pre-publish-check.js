#!/usr/bin/env node

/**
 * Pre-Publish Validation Script
 *
 * Pattern-PUBLISH-004: Pre-Publish Validation
 *
 * Prevents common publishing mistakes by validating:
 * 1. Version sync across all 4 packages
 * 2. Package naming consistency (unscoped)
 * 3. Dependency references
 * 4. Test status
 * 5. Native dependency check (Pattern-PUBLISH-003)
 * 6. Git state
 *
 * BLOCKS publish if any check fails.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

class ValidationError extends Error {
  constructor(message, fix) {
    super(message);
    this.fix = fix;
  }
}

/**
 * Read package.json
 */
function readPackageJson(pkgPath) {
  const fullPath = path.join(ROOT, pkgPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

/**
 * Check 1: Version Sync
 */
function checkVersionSync() {
  console.log(`${BLUE}📋 Check 1: Version Sync${RESET}`);

  const packages = [
    { name: 'vscode-lumina', path: 'vscode-lumina/package.json' },
    { name: 'aetherlight-analyzer', path: 'packages/aetherlight-analyzer/package.json' },
    { name: 'aetherlight-sdk', path: 'packages/aetherlight-sdk/package.json' },
    { name: 'aetherlight-node', path: 'packages/aetherlight-node/package.json' },
  ];

  const versions = packages.map(pkg => {
    const json = readPackageJson(pkg.path);
    return { name: pkg.name, version: json.version, path: pkg.path };
  });

  const mainVersion = versions[0].version;
  const mismatches = versions.filter(v => v.version !== mainVersion);

  if (mismatches.length > 0) {
    const details = mismatches.map(m => `  - ${m.name}: ${m.version}`).join('\n');
    throw new ValidationError(
      `❌ Version mismatch detected!\n\nExpected: ${mainVersion}\nMismatches:\n${details}`,
      `Run: node scripts/bump-version.js to sync versions`
    );
  }

  console.log(`${GREEN}✓ All packages at version ${mainVersion}${RESET}`);
  return mainVersion;
}

/**
 * Check 2: Package Naming (Unscoped)
 */
function checkPackageNaming() {
  console.log(`${BLUE}📋 Check 2: Package Naming${RESET}`);

  const packages = [
    { path: 'packages/aetherlight-analyzer/package.json', expected: 'aetherlight-analyzer' },
    { path: 'packages/aetherlight-sdk/package.json', expected: 'aetherlight-sdk' },
    { path: 'packages/aetherlight-node/package.json', expected: 'aetherlight-node' },
  ];

  const errors = [];

  for (const pkg of packages) {
    const json = readPackageJson(pkg.path);
    if (json.name !== pkg.expected) {
      errors.push(`  - ${pkg.path}: has "${json.name}", expected "${pkg.expected}"`);
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `❌ Package naming issues detected!\n\nProblems:\n${errors.join('\n')}`,
      `Update package.json files to use unscoped names (no @aetherlight/ prefix)`
    );
  }

  console.log(`${GREEN}✓ All packages use unscoped names${RESET}`);
}

/**
 * Check 3: Dependency References
 */
function checkDependencyReferences() {
  console.log(`${BLUE}📋 Check 3: Dependency References${RESET}`);

  const mainPkg = readPackageJson('vscode-lumina/package.json');
  const deps = mainPkg.dependencies || {};
  const bundled = mainPkg.bundledDependencies || [];

  // Check analyzer is referenced correctly
  if (deps['@aetherlight/analyzer']) {
    throw new ValidationError(
      `❌ Main package references scoped analyzer "@aetherlight/analyzer"`,
      `Update vscode-lumina/package.json dependencies to use "aetherlight-analyzer"`
    );
  }

  if (!deps['aetherlight-analyzer']) {
    throw new ValidationError(
      `❌ Main package missing analyzer dependency`,
      `Add "aetherlight-analyzer": "file:../packages/aetherlight-analyzer/..." to dependencies`
    );
  }

  // Check bundledDependencies
  if (bundled.includes('@aetherlight/analyzer')) {
    throw new ValidationError(
      `❌ Main package bundledDependencies uses scoped name`,
      `Update vscode-lumina/package.json bundledDependencies to use "aetherlight-analyzer"`
    );
  }

  console.log(`${GREEN}✓ Dependency references correct${RESET}`);
}

/**
 * Check 4: Native Dependencies (Pattern-PUBLISH-003)
 */
function checkNativeDependencies() {
  console.log(`${BLUE}📋 Check 4: Native Dependencies (Pattern-PUBLISH-003)${RESET}`);

  const mainPkg = readPackageJson('vscode-lumina/package.json');
  const deps = Object.keys(mainPkg.dependencies || {});

  const forbiddenPatterns = [
    'node-gyp',
    'bindings',
    '@nut-tree-fork',
    'robotjs',
    'node-hid',
    'serialport',
    'ffi-napi',
    'ref-napi',
  ];

  const forbidden = deps.filter(dep =>
    forbiddenPatterns.some(pattern => dep.includes(pattern))
  );

  if (forbidden.length > 0) {
    throw new ValidationError(
      `❌ Native dependencies detected: ${forbidden.join(', ')}`,
      `Remove native dependencies and use VS Code APIs instead (see Pattern-PUBLISH-003)`
    );
  }

  console.log(`${GREEN}✓ No native dependencies${RESET}`);
}

/**
 * Check 5: Runtime npm Dependencies (Pattern-PUBLISH-003)
 */
function checkRuntimeDependencies() {
  console.log(`${BLUE}📋 Check 5: Runtime npm Dependencies${RESET}`);

  const mainPkg = readPackageJson('vscode-lumina/package.json');
  const deps = Object.keys(mainPkg.dependencies || {});

  const whitelist = [
    'aetherlight-analyzer',
    'aetherlight-sdk',
    'aetherlight-node',
    '@iarna/toml',
    'form-data',
    'node-fetch',
    'ws',
  ];

  const forbidden = deps.filter(dep => !whitelist.includes(dep));

  if (forbidden.length > 0) {
    throw new ValidationError(
      `❌ Forbidden runtime dependencies: ${forbidden.join(', ')}`,
      `Remove these dependencies or add to whitelist if needed (see Pattern-PUBLISH-003)`
    );
  }

  console.log(`${GREEN}✓ Only whitelisted dependencies${RESET}`);
}

/**
 * Check 6: Git State
 */
function checkGitState() {
  console.log(`${BLUE}📋 Check 6: Git State${RESET}`);

  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8', cwd: ROOT });

    if (status.trim()) {
      // List uncommitted files
      const files = status.trim().split('\n').slice(0, 10); // Show first 10
      const fileList = files.map(f => `  ${f}`).join('\n');
      const moreFiles = status.split('\n').length > 10 ? `\n  ... and ${status.split('\n').length - 10} more` : '';

      throw new ValidationError(
        `❌ Git working directory not clean!\n\nUncommitted changes:\n${fileList}${moreFiles}`,
        `Commit or stash changes before publishing`
      );
    }

    console.log(`${GREEN}✓ Git working directory clean${RESET}`);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    console.log(`${YELLOW}⚠ Could not check git status (git not available?)${RESET}`);
  }
}

/**
 * Check 7: Analyzer Tests
 */
function checkAnalyzerTests() {
  console.log(`${BLUE}📋 Check 7: Analyzer Tests${RESET}`);

  try {
    console.log('  Running analyzer tests...');
    execSync('npm test', {
      cwd: path.join(ROOT, 'packages/aetherlight-analyzer'),
      stdio: 'pipe',
      encoding: 'utf-8'
    });

    console.log(`${GREEN}✓ All analyzer tests pass${RESET}`);
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    const failedTests = output.match(/Tests:\s+(\d+) failed/);
    const failCount = failedTests ? failedTests[1] : 'unknown';

    throw new ValidationError(
      `❌ Analyzer tests failing (${failCount} failures)`,
      `Fix test failures before publishing: cd packages/aetherlight-analyzer && npm test`
    );
  }
}

/**
 * Main validation
 */
async function main() {
  console.log(`${BLUE}\n🔍 Pre-Publish Validation (Pattern-PUBLISH-004)\n${RESET}`);

  const checks = [
    checkVersionSync,
    checkPackageNaming,
    checkDependencyReferences,
    checkNativeDependencies,
    checkRuntimeDependencies,
    checkGitState,
    checkAnalyzerTests,
  ];

  try {
    for (const check of checks) {
      check();
      console.log('');
    }

    console.log(`${GREEN}✅ All pre-publish checks passed!${RESET}\n`);
    process.exit(0);
  } catch (error) {
    console.log(`\n${RED}${error.message}${RESET}\n`);

    if (error.fix) {
      console.log(`${YELLOW}Fix: ${error.fix}${RESET}\n`);
    }

    console.log(`${RED}❌ Pre-publish validation FAILED - publish blocked${RESET}\n`);
    process.exit(1);
  }
}

main();
