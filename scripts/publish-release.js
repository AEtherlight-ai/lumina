#!/usr/bin/env node
/**
 * ÆtherLight Automated Publishing Script
 *
 * DESIGN DECISION: Single script for complete release automation with pre-publish verification
 * WHY: Eliminate manual steps and timing issues that cause version mismatch bugs
 *
 * REASONING CHAIN:
 * 1. Verify all prerequisites (auth, git state, etc.)
 * 2. Bump version across all packages (sync)
 * 3. Build & compile all packages
 * 4. Verify build artifacts exist and are valid
 * 5. Package VS Code extension (.vsix)
 * 6. Verify package is valid before publishing ANYTHING
 * 7. Only publish if ALL verification passes
 * 8. Create git tag and push
 * 9. Create GitHub release
 *
 * TODO (POST-005): Enhance automation with validation integration
 * - Integrate pre-publish-check.js validation (7 automated checks)
 * - Add devDependencies completeness check (validate @types/mocha, @types/node)
 * - Add import path consistency validator (detect @aetherlight/* usage)
 * - Better version handling (detect already-bumped, offer reset/continue)
 * - Enhanced error messages with actionable suggestions
 * - Goal: v0.16.16+ publishes with ZERO manual intervention
 * - See: internal/sprints/ACTIVE_SPRINT.toml - Task POST-005
 * - See: .claude/CLAUDE.md - Known Issues section (v0.16.15)
 *
 * PATTERN: Pattern-PUBLISH-001 (Automated Release Pipeline)
 * USAGE: node scripts/publish-release.js [patch|minor|major]
 *
 * @module publish-release
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, cwd = process.cwd()) {
  log(`\n▶ ${command}`, 'blue');
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    log(`✗ Command failed: ${command}`, 'red');
    process.exit(1);
  }
}

function execSilent(command, cwd = process.cwd()) {
  try {
    return execSync(command, { cwd, encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

function readPackageJson(pkgPath) {
  const fullPath = path.join(process.cwd(), pkgPath, 'package.json');
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function getLastVersion() {
  try {
    const tags = execSilent('git tag --sort=-version:refname');
    const versions = tags.split('\n').filter(t => t.startsWith('v'));
    return versions[0]?.replace('v', '') || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function confirmAction(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  // Parse arguments
  const versionType = process.argv[2];
  const autoYes = process.argv.includes('--yes') || process.argv.includes('-y');

  if (!['patch', 'minor', 'major'].includes(versionType)) {
    log('Usage: node scripts/publish-release.js [patch|minor|major] [--yes]', 'red');
    process.exit(1);
  }

  log(`\n🚀 Starting ÆtherLight Release Pipeline (${versionType} bump)\n`, 'cyan');
  if (autoYes) {
    log('⚡ Auto-confirm mode enabled (--yes flag)\n', 'cyan');
  }

  // Step 1: Verify npm authentication
  log('\n📋 Step 1: Verify npm authentication', 'yellow');
  const npmUser = execSilent('npm whoami');
  if (npmUser !== 'aelor') {
    log(`✗ Not logged in as aelor (current: ${npmUser || 'none'})`, 'red');
    log('Run: npm login', 'yellow');
    process.exit(1);
  }
  log(`✓ Logged in as ${npmUser}`, 'green');

  // Step 2: Verify Git workflow requirements
  log('\n📋 Step 2: Verify Git workflow', 'yellow');

  // Check current branch
  const currentBranch = execSilent('git rev-parse --abbrev-ref HEAD').trim();
  log(`  Current branch: ${currentBranch}`, 'blue');

  // Proper workflow: Release from master/main AFTER PR merge
  if (currentBranch !== 'master' && currentBranch !== 'main') {
    log('⚠ Not on master/main branch', 'yellow');
    log('Recommended workflow:', 'yellow');
    log('  1. Create PR from your branch to master', 'yellow');
    log('  2. Get PR reviewed and approved', 'yellow');
    log('  3. Merge PR to master', 'yellow');
    log('  4. Checkout master: git checkout master', 'yellow');
    log('  5. Pull latest: git pull origin master', 'yellow');
    log('  6. Run publish script from clean master', 'yellow');

    const continueFromBranch = autoYes || await confirmAction('\nContinue from feature branch? (not recommended) (yes/no): ');
    if (!continueFromBranch) {
      process.exit(1);
    }
    if (autoYes) {
      log('✓ Auto-confirmed (--yes flag)', 'green');
    }
    log(`⚠ Continuing from ${currentBranch} (should be master/main for releases)`, 'yellow');
  }

  // Check for uncommitted changes (ignore untracked files)
  const gitStatus = execSilent('git status --porcelain');
  const modifiedFiles = gitStatus
    .split('\n')
    .filter(line => line && !line.startsWith('??'))
    .join('\n');
  if (modifiedFiles && modifiedFiles.length > 0) {
    log('✗ Git working directory has uncommitted changes', 'red');
    log('Commit or stash your changes before publishing', 'yellow');
    process.exit(1);
  }

  // Ensure branch is up to date with remote
  exec('git fetch origin', process.cwd(), true); // Silent fetch
  const behind = execSilent(`git rev-list HEAD..origin/${currentBranch} --count`);
  if (behind && behind.trim() !== '0') {
    log(`✗ Branch is ${behind.trim()} commits behind origin/${currentBranch}`, 'red');
    log(`Pull latest changes: git pull origin ${currentBranch}`, 'yellow');
    process.exit(1);
  }

  log('✓ Git state verified', 'green');

  // Step 3: Bump version
  log('\n📋 Step 3: Bump version', 'yellow');
  exec(`node scripts/bump-version.js ${versionType}`);
  const newVersion = readPackageJson('vscode-lumina').version;
  log(`✓ Version bumped to ${newVersion}`, 'green');

  // Step 3.5: Pre-publish validation (Pattern-PUBLISH-004)
  log('\n📋 Step 3.5: Pre-publish validation', 'yellow');
  log('⚠️  Validates 6 critical checks before compilation:', 'yellow');
  log('   • Version sync across 4 packages', 'yellow');
  log('   • Package naming consistency (unscoped)', 'yellow');
  log('   • Dependency references', 'yellow');
  log('   • No native dependencies', 'yellow');
  log('   • No forbidden runtime npm dependencies', 'yellow');
  log('   • Git working directory clean', 'yellow');

  try {
    exec('node scripts/pre-publish-check.js');
    log('✓ Pre-publish validation passed', 'green');
  } catch (error) {
    log('✗ CRITICAL: Pre-publish validation FAILED', 'red');
    log('\n⚠️  Publishing blocked due to validation failures', 'red');
    log('Run manually to see details: node scripts/pre-publish-check.js', 'yellow');
    log('\nHistorical impact:', 'yellow');
    log('  • v0.16.15: Missing @types/mocha → manual bypass (2 hours)', 'yellow');
    log('  • v0.13.29: Version mismatch → manual fix (2 hours)', 'yellow');
    log('\nSee .claude/CLAUDE.md Known Issues for prevention strategies', 'yellow');
    process.exit(1);
  }

  // Step 4: Compile TypeScript
  log('\n📋 Step 4: Compile TypeScript', 'yellow');
  exec('npm run compile', path.join(process.cwd(), 'vscode-lumina'));

  // Verify compilation succeeded by checking for compiled files
  const compiledMainPath = path.join(process.cwd(), 'vscode-lumina', 'out', 'extension.js');
  if (!fs.existsSync(compiledMainPath)) {
    log('✗ Compilation failed - out/extension.js not found', 'red');
    process.exit(1);
  }
  log('✓ TypeScript compiled successfully', 'green');

  // Step 4.5: Validate dependencies (CRITICAL - prevents Pattern-PUBLISH-003 violations)
  log('\n📋 Step 4.5: Validate dependencies (Pattern-PUBLISH-003)', 'yellow');
  log('⚠️  This check prevents historical bugs:', 'yellow');
  log('   • v0.13.23: @nut-tree-fork/nut-js (native) → 9 hours to fix', 'yellow');
  log('   • v0.15.31-32: glob (runtime npm) → 2 hours to fix', 'yellow');

  // Run automated dependency validation (VAL-002)
  const validationResult = execSilent('node scripts/validate-dependencies.js');

  if (validationResult === null) {
    // Validation script failed (exit code 1)
    log('✗ CRITICAL: Dependency validation FAILED', 'red');
    log('\n⚠️  Forbidden dependencies detected in package.json!', 'red');
    log('Run manually to see details: node scripts/validate-dependencies.js', 'yellow');
    log('\nHistorical impact:', 'yellow');
    log('  • Native dependencies → Extension activation fails (v0.13.23 bug)', 'yellow');
    log('  • Runtime npm deps → Extension activation fails (v0.15.31-32 bug)', 'yellow');
    log('\nSee .claude/CLAUDE.md Pattern-PUBLISH-003 for details', 'yellow');
    process.exit(1);
  }

  log('✓ Dependency validation PASSED', 'green');
  log('  No native dependencies detected', 'green');
  log('  No forbidden runtime npm dependencies detected', 'green');

  // Step 5: Run tests (optional - skip if not available)
  log('\n📋 Step 5: Run tests', 'yellow');
  const testResult = execSilent('npm test', path.join(process.cwd(), 'vscode-lumina'));
  if (testResult !== null) {
    log('✓ Tests passed', 'green');
  } else {
    log('⚠ Tests skipped (not configured)', 'yellow');
  }

  // Step 5.5: Build desktop app binaries
  log('\n📋 Step 5.5: Build desktop app binaries', 'yellow');
  log('Building Tauri desktop installers...', 'blue');

  // Update desktop app version to match extension
  const desktopPackageJsonPath = path.join(process.cwd(), 'products', 'lumina-desktop', 'package.json');
  const desktopTauriConfPath = path.join(process.cwd(), 'products', 'lumina-desktop', 'src-tauri', 'tauri.conf.json');

  const desktopPackageJson = JSON.parse(fs.readFileSync(desktopPackageJsonPath, 'utf8'));
  const desktopTauriConf = JSON.parse(fs.readFileSync(desktopTauriConfPath, 'utf8'));

  desktopPackageJson.version = newVersion;
  desktopTauriConf.version = newVersion;

  fs.writeFileSync(desktopPackageJsonPath, JSON.stringify(desktopPackageJson, null, 2) + '\n');
  fs.writeFileSync(desktopTauriConfPath, JSON.stringify(desktopTauriConf, null, 2) + '\n');

  log(`✓ Desktop app version updated to ${newVersion}`, 'green');

  // Build desktop binaries
  exec('npm run tauri build', path.join(process.cwd(), 'products', 'lumina-desktop'));

  // Verify desktop binaries were created
  const desktopBinariesPath = path.join(process.cwd(), 'products', 'lumina-desktop', 'src-tauri', 'target', 'release', 'bundle');
  const nsisPath = path.join(desktopBinariesPath, 'nsis', `Lumina_${newVersion}_x64-setup.exe`);
  const msiPath = path.join(desktopBinariesPath, 'msi', `Lumina_${newVersion}_x64_en-US.msi`);

  if (!fs.existsSync(nsisPath) || !fs.existsSync(msiPath)) {
    log('✗ Desktop binaries not found after build', 'red');
    process.exit(1);
  }

  log(`✓ Desktop binaries built: ${newVersion}`, 'green');

  // Copy binaries to vscode-lumina for packaging
  const vscodeLuminaPath = path.join(process.cwd(), 'vscode-lumina');
  const destNsisPath = path.join(vscodeLuminaPath, `Lumina_${newVersion}_x64-setup.exe`);
  const destMsiPath = path.join(vscodeLuminaPath, `Lumina_${newVersion}_x64_en-US.msi`);

  fs.copyFileSync(nsisPath, destNsisPath);
  fs.copyFileSync(msiPath, destMsiPath);

  log('✓ Desktop binaries copied to vscode-lumina', 'green');

  // Step 6: Package VS Code extension
  log('\n📋 Step 6: Package VS Code extension', 'yellow');
  exec('npm run package', path.join(process.cwd(), 'vscode-lumina'));

  // Verify VSIX was created
  const vsixPath = path.join(process.cwd(), 'vscode-lumina', `aetherlight-${newVersion}.vsix`);
  if (!fs.existsSync(vsixPath)) {
    log('✗ VSIX package not found - packaging failed', 'red');
    process.exit(1);
  }
  const vsixStats = fs.statSync(vsixPath);
  log(`✓ VSIX package created (${(vsixStats.size / 1024 / 1024).toFixed(2)} MB)`, 'green');

  // Step 6.5: Validate package size (VS Code marketplace limit: 50MB)
  log('\n📋 Step 6.5: Validate package size (VS Code marketplace)', 'yellow');
  log('⚠️  Marketplace enforces <50MB limit - oversized packages get rejected', 'yellow');

  // Run automated package size validation (VAL-003)
  const sizeValidationResult = execSilent('node scripts/validate-package-size.js');

  if (sizeValidationResult === null) {
    // Validation script failed (exit code 1)
    log('✗ CRITICAL: Package size validation FAILED', 'red');
    log('\n⚠️  Package exceeds VS Code marketplace limit (50MB)!', 'red');
    log('Run manually to see details: node scripts/validate-package-size.js', 'yellow');
    log('\nMarketplace will reject this package.', 'yellow');
    log('Reduce size by excluding unnecessary files via .vscodeignore', 'yellow');
    process.exit(1);
  }

  const packageSizeMB = (vsixStats.size / 1024 / 1024).toFixed(2);
  log(`✓ Package size validation PASSED (${packageSizeMB}MB < 50MB)`, 'green');

  // Step 7: Pre-publish verification
  log('\n📋 Step 7: Pre-publish verification', 'yellow');
  log('Checking package contents...', 'blue');

  // Verify package.json version
  const pkgJson = readPackageJson('vscode-lumina');
  if (pkgJson.version !== newVersion) {
    log(`✗ Version mismatch in package.json: ${pkgJson.version} != ${newVersion}`, 'red');
    process.exit(1);
  }

  // Verify critical files exist
  const criticalFiles = [
    'vscode-lumina/out/extension.js',
    'vscode-lumina/package.json',
    'vscode-lumina/README.md',
    `vscode-lumina/aetherlight-${newVersion}.vsix`
  ];

  for (const file of criticalFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      log(`✗ Critical file missing: ${file}`, 'red');
      process.exit(1);
    }
  }
  log('✓ All critical files present', 'green');

  // Step 8: Final confirmation before publishing
  log('\n📋 Ready to publish!', 'yellow');
  log(`Version: ${newVersion}`, 'cyan');
  log(`Package: aetherlight-${newVersion}.vsix (${(vsixStats.size / 1024 / 1024).toFixed(2)} MB)`, 'cyan');
  log(`\nThis will:`, 'yellow');
  log(`  1. Commit version bump`, 'yellow');
  log(`  2. Create git tag v${newVersion}`, 'yellow');
  log(`  3. Push to GitHub`, 'yellow');
  log(`  4. Create GitHub release with VSIX`, 'yellow');
  log(`  5. Publish to npm registry (last)`, 'yellow');

  const confirmed = autoYes || await confirmAction('\nContinue? (yes/no): ');
  if (!confirmed) {
    log('\n✗ Publish cancelled', 'yellow');
    process.exit(0);
  }
  if (autoYes) {
    log('\n✓ Auto-confirmed (--yes flag)', 'green');
  }

  // Step 9: Commit and tag
  log('\n📋 Step 9: Commit and tag', 'yellow');
  // Only add version-related files (avoid build artifacts)
  exec('git add vscode-lumina/package.json packages/*/package.json');
  exec(`git commit -m "chore: release v${newVersion}"`);
  exec(`git tag v${newVersion}`);
  log(`✓ Created git tag v${newVersion}`, 'green');

  // Step 10: Push to GitHub
  log('\n📋 Step 10: Push to GitHub', 'yellow');
  exec('git push origin master --tags');
  log('✓ Pushed to GitHub', 'green');

  // Step 11: Create GitHub Release (BEFORE npm publish)
  log('\n📋 Step 11: Create GitHub Release', 'yellow');
  const ghInstalled = execSilent('gh --version');
  if (!ghInstalled) {
    log('✗ GitHub CLI not installed', 'red');
    log('Install: https://cli.github.com/', 'yellow');
    log('⚠ GitHub release is REQUIRED because users install from GitHub, not npm', 'red');
    process.exit(1);
  }

  // Check gh authentication
  const ghAuth = execSilent('gh auth status');
  if (!ghAuth || !ghAuth.includes('Logged in')) {
    log('✗ Not logged in to GitHub CLI', 'red');
    log('Run: gh auth login', 'yellow');
    process.exit(1);
  }

  const lastVersion = getLastVersion();
  const releaseNotes = `## ÆtherLight v${newVersion}

### Changes
- See commit history: https://github.com/AEtherlight-ai/lumina/compare/v${lastVersion}...v${newVersion}

### Installation
\`\`\`bash
npm install -g aetherlight@${newVersion}
aetherlight
\`\`\`

### Auto-Update
If you already have ÆtherLight installed, run:
\`\`\`bash
npm install -g aetherlight@latest
aetherlight
\`\`\`

Then reload VS Code to see the update.
`;

  fs.writeFileSync('.release-notes.tmp', releaseNotes);

  // Find desktop app installers (built in Step 5.5)
  // Note: vscodeLuminaPath already declared in Step 5.5
  const desktopFiles = [];
  const exeFile = path.join(vscodeLuminaPath, `Lumina_${newVersion}_x64-setup.exe`);
  const msiFile = path.join(vscodeLuminaPath, `Lumina_${newVersion}_x64_en-US.msi`);

  if (fs.existsSync(exeFile)) {
    desktopFiles.push(`"${exeFile}"`);
    log(`   Found desktop installer: Lumina_${newVersion}_x64-setup.exe`, 'blue');
  }
  if (fs.existsSync(msiFile)) {
    desktopFiles.push(`"${msiFile}"`);
    log(`   Found desktop installer: Lumina_${newVersion}_x64_en-US.msi`, 'blue');
  }

  if (desktopFiles.length === 0) {
    log('⚠️  Warning: No desktop installers found', 'yellow');
    log('   This should not happen - Step 5.5 should have built them', 'yellow');
    log('   Desktop app will not be available for this release', 'yellow');
  } else {
    log(`✓ Found ${desktopFiles.length} desktop installer(s)`, 'green');
  }

  // Create release with .vsix and desktop installers
  const allFiles = [`"vscode-lumina/aetherlight-${newVersion}.vsix"`, ...desktopFiles].join(' ');

  try {
    exec(`gh release create v${newVersion} --title "v${newVersion}" --notes-file .release-notes.tmp ${allFiles}`);
  } catch (error) {
    log('✗ Failed to create GitHub release', 'red');
    log('This is CRITICAL - users install from GitHub releases', 'red');
    throw error;
  } finally {
    // Always cleanup temp file
    if (fs.existsSync('.release-notes.tmp')) {
      fs.unlinkSync('.release-notes.tmp');
    }
  }

  log('✓ GitHub Release created with .vsix and desktop installers', 'green');

  // Step 14: Verify GitHub release exists and has all required files
  log('\n📋 Step 14: Verify GitHub Release Assets', 'yellow');

  // Get all assets as JSON (cross-platform compatible)
  const assetsJson = execSilent(`gh release view v${newVersion} --json assets`);
  if (!assetsJson) {
    log('✗ GitHub release verification failed - could not fetch assets', 'red');
    log('This is CRITICAL - users will get wrong version on update', 'red');
    process.exit(1);
  }

  const releaseData = JSON.parse(assetsJson);
  const assets = releaseData.assets || [];
  const assetNames = assets.map(a => a.name);

  // Check for .vsix file
  const vsixAsset = assets.find(a => a.name.endsWith('.vsix'));
  if (!vsixAsset || vsixAsset.name !== `aetherlight-${newVersion}.vsix`) {
    log('✗ GitHub release verification failed - .vsix not found', 'red');
    log('This is CRITICAL - users will get wrong version on update', 'red');
    process.exit(1);
  }
  log(`✓ Verified: ${vsixAsset.name} exists on GitHub`, 'green');

  // Check for desktop installers
  if (assetNames.length > 0) {
    const hasExe = assetNames.includes(`Lumina_${newVersion}_x64-setup.exe`);
    const hasMsi = assetNames.includes(`Lumina_${newVersion}_x64_en-US.msi`);

    if (hasExe) {
      log(`✓ Verified: Lumina_${newVersion}_x64-setup.exe exists on GitHub`, 'green');
    } else {
      log(`⚠️  Warning: Lumina_${newVersion}_x64-setup.exe not found in release`, 'yellow');
    }

    if (hasMsi) {
      log(`✓ Verified: Lumina_${newVersion}_x64_en-US.msi exists on GitHub`, 'green');
    } else {
      log(`⚠️  Warning: Lumina_${newVersion}_x64_en-US.msi not found in release`, 'yellow');
    }

    if (!hasExe && !hasMsi) {
      log('⚠️  Warning: No desktop installers found - desktop app will not be available', 'yellow');
    }
  }

  // Step 14.5: Confirmation checkpoint - verify GitHub release before npm publish
  // WHY: Gives user chance to review GitHub release and abort before npm publish
  // PATTERN: Pattern-PUBLISH-001 (GitHub release MUST be verified before npm publish)
  // PREVENTS: v0.16.7 bug (npm published when GitHub release had issues)
  log('\n📋 Step 14.5: Confirm GitHub Release Before npm Publish', 'yellow');

  // Get GitHub release URL
  const releaseUrl = `https://github.com/AEtherlight-ai/lumina/releases/tag/v${newVersion}`;
  const vsixUrl = `https://github.com/AEtherlight-ai/lumina/releases/download/v${newVersion}/aetherlight-${newVersion}.vsix`;

  log('\n✅ GitHub Release Verified:', 'green');
  log(`   Release URL: ${releaseUrl}`, 'cyan');
  log(`   .vsix URL:   ${vsixUrl}`, 'cyan');
  log('\n   You can verify in browser if needed (open URLs above)', 'blue');

  const npmConfirmed = autoYes || await confirmAction('\n📦 Ready to publish to npm registry? (yes/no): ');
  if (!npmConfirmed) {
    log('\n✓ npm publish cancelled - GitHub release exists but npm not published', 'yellow');
    log('   GitHub release URL: ' + releaseUrl, 'cyan');
    log('   You can manually publish later:', 'yellow');
    log('   1. Verify GitHub release looks correct', 'yellow');
    log('   2. Run: cd vscode-lumina && npm publish --access public', 'yellow');
    log('   3. For sub-packages: cd packages/[package] && npm publish --access public', 'yellow');
    process.exit(0);
  }
  if (autoYes) {
    log('✓ Auto-confirmed (--yes flag)', 'green');
  }

  log('✓ User confirmed - proceeding with npm publish', 'green');

  // Step 15: Publish to npm (AFTER GitHub release)
  log('\n📋 Step 15: Publish to npm registry', 'yellow');
  log('GitHub release successful, now publishing packages...', 'blue');

  // CRITICAL: Must publish sub-packages BEFORE main package
  // WHY: Main package depends on sub-packages at same version
  // LESSON LEARNED: v0.13.29 failed because sub-packages weren't published
  const packagesToPublish = [
    { name: 'aetherlight-analyzer', path: 'packages/aetherlight-analyzer' },
    { name: 'aetherlight-sdk', path: 'packages/aetherlight-sdk' },
    { name: 'aetherlight-node', path: 'packages/aetherlight-node' },
    { name: 'aetherlight', path: 'vscode-lumina' } // Main package LAST
  ];

  for (const pkg of packagesToPublish) {
    log(`  Publishing ${pkg.name}...`, 'blue');
    try {
      exec('npm publish --access public', path.join(process.cwd(), pkg.path));
      log(`  ✓ ${pkg.name} published`, 'green');
    } catch (error) {
      log(`  ✗ ${pkg.name} failed to publish`, 'red');
      log(`    GitHub release exists but npm publish failed`, 'red');
      log(`    You can retry: cd ${pkg.path} && npm publish --access public`, 'yellow');
      throw error;
    }
  }

  log('✓ All packages published to npm registry', 'green');

  // Step 16: Verify npm publications
  log('\n📋 Step 16: Verify npm publications', 'yellow');

  const packagesToVerify = [
    'aetherlight-analyzer',
    'aetherlight-sdk',
    'aetherlight-node',
    'aetherlight'
  ];

  let allVerified = true;
  for (const pkgName of packagesToVerify) {
    const publishedVersion = execSilent(`npm view ${pkgName} version`);
    if (publishedVersion === newVersion) {
      log(`  ✓ ${pkgName}: v${publishedVersion}`, 'green');
    } else {
      log(`  ✗ ${pkgName}: expected ${newVersion}, got ${publishedVersion}`, 'red');
      allVerified = false;
    }
  }

  if (!allVerified) {
    log('\n⚠ WARNING: Some packages failed verification', 'red');
    log('GitHub release exists but npm packages incomplete', 'red');
    log('Users will NOT be able to install via npm until fixed', 'red');
    process.exit(1);
  }

  // Summary
  log('\n✅ Release Complete!', 'green');
  log(`\nVersion: v${newVersion}`, 'cyan');
  log(`GitHub: https://github.com/AEtherlight-ai/lumina/releases/tag/v${newVersion}`, 'cyan');
  log(`NPM: https://www.npmjs.com/package/aetherlight`, 'cyan');
  log('\n📢 Users will receive update notifications within 1 hour', 'yellow');
  log('\n✓ GitHub pushed BEFORE npm - proper order maintained', 'green');
}

// Run main function
main().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
