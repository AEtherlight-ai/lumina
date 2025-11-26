#!/usr/bin/env node
/**
 * Version Bump Script for ÆtherLight
 *
 * Synchronizes version across all packages and updates dependencies
 *
 * Usage:
 *   node scripts/bump-version.js patch   # 1.0.0 -> 1.0.1
 *   node scripts/bump-version.js minor   # 1.0.0 -> 1.1.0
 *   node scripts/bump-version.js major   # 1.0.0 -> 2.0.0
 *   node scripts/bump-version.js 1.2.3   # Set specific version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGES = [
  'vscode-lumina',
  'packages/aetherlight-sdk',
  'packages/aetherlight-analyzer',
  'packages/aetherlight-node'
];

const MAIN_PACKAGE = 'vscode-lumina';

// Desktop app files that need version sync
const DESKTOP_TAURI_CONF = 'products/lumina-desktop/src-tauri/tauri.conf.json';
const DESKTOP_CARGO_TOML = 'products/lumina-desktop/src-tauri/Cargo.toml';

function getVersion(packagePath) {
  const pkgPath = path.join(process.cwd(), packagePath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

function setVersion(packagePath, newVersion) {
  const pkgPath = path.join(process.cwd(), packagePath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;

  // Update internal dependencies (skip file: references for bundling)
  if (pkg.dependencies) {
    if (pkg.dependencies['aetherlight-analyzer'] && !pkg.dependencies['aetherlight-analyzer'].startsWith('file:')) {
      pkg.dependencies['aetherlight-analyzer'] = `^${newVersion}`;
    }
    if (pkg.dependencies['aetherlight-node'] && !pkg.dependencies['aetherlight-node'].startsWith('file:')) {
      pkg.dependencies['aetherlight-node'] = `^${newVersion}`;
    }
    if (pkg.dependencies['aetherlight-sdk'] && !pkg.dependencies['aetherlight-sdk'].startsWith('file:')) {
      pkg.dependencies['aetherlight-sdk'] = `^${newVersion}`;
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ ${packagePath}: ${pkg.version} -> ${newVersion}`);
}

function bumpSemver(version, type) {
  const parts = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      throw new Error(`Invalid bump type: ${type}`);
  }
}

/**
 * Update tauri.conf.json version
 */
function updateTauriConf(newVersion) {
  const confPath = path.join(process.cwd(), DESKTOP_TAURI_CONF);
  if (!fs.existsSync(confPath)) {
    console.log(`⚠️  Skipping ${DESKTOP_TAURI_CONF} (file not found)`);
    return;
  }

  const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
  const oldVersion = conf.version;
  conf.version = newVersion;
  fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n');
  console.log(`✅ tauri.conf.json: ${oldVersion} -> ${newVersion}`);
}

/**
 * Update Cargo.toml version using regex (preserves formatting)
 */
function updateCargoToml(newVersion) {
  const cargoPath = path.join(process.cwd(), DESKTOP_CARGO_TOML);
  if (!fs.existsSync(cargoPath)) {
    console.log(`⚠️  Skipping ${DESKTOP_CARGO_TOML} (file not found)`);
    return;
  }

  let content = fs.readFileSync(cargoPath, 'utf8');
  const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m);
  const oldVersion = versionMatch ? versionMatch[1] : 'unknown';

  // Replace version in [package] section
  content = content.replace(
    /^(version\s*=\s*)"[^"]+"/m,
    `$1"${newVersion}"`
  );

  fs.writeFileSync(cargoPath, content);
  console.log(`✅ Cargo.toml: ${oldVersion} -> ${newVersion}`);
}

function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error('❌ Usage: node scripts/bump-version.js <major|minor|patch|version>');
    process.exit(1);
  }

  // Get current version from main package
  const currentVersion = getVersion(MAIN_PACKAGE);
  console.log(`📦 Current version: ${currentVersion}`);

  // Calculate new version
  let newVersion;
  if (['major', 'minor', 'patch'].includes(arg)) {
    newVersion = bumpSemver(currentVersion, arg);
  } else if (/^\d+\.\d+\.\d+$/.test(arg)) {
    newVersion = arg;
  } else {
    console.error('❌ Invalid version or bump type');
    process.exit(1);
  }

  console.log(`🚀 New version: ${newVersion}\n`);

  // Update all npm packages
  PACKAGES.forEach(pkg => {
    setVersion(pkg, newVersion);
  });

  // Update desktop app versions
  console.log('\n📱 Updating desktop app versions...');
  updateTauriConf(newVersion);
  updateCargoToml(newVersion);

  console.log('\n✅ All packages updated!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review changes: git diff');
  console.log('   2. Commit: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
  console.log('   3. Tag: git tag v' + newVersion);
  console.log('   4. Push: git push origin master --tags');
  console.log('   5. GitHub Actions will auto-publish to npm and VS Code Marketplace');
}

main();
