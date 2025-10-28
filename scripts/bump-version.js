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

function getVersion(packagePath) {
  const pkgPath = path.join(process.cwd(), packagePath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

function setVersion(packagePath, newVersion) {
  const pkgPath = path.join(process.cwd(), packagePath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;

  // Update internal dependencies
  if (pkg.dependencies) {
    if (pkg.dependencies['aetherlight-analyzer']) {
      pkg.dependencies['aetherlight-analyzer'] = `^${newVersion}`;
    }
    if (pkg.dependencies['aetherlight-node']) {
      pkg.dependencies['aetherlight-node'] = `^${newVersion}`;
    }
    if (pkg.dependencies['aetherlight-sdk']) {
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

  // Update all packages
  PACKAGES.forEach(pkg => {
    setVersion(pkg, newVersion);
  });

  console.log('\n✅ All packages updated!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review changes: git diff');
  console.log('   2. Commit: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
  console.log('   3. Tag: git tag v' + newVersion);
  console.log('   4. Push: git push origin master --tags');
  console.log('   5. GitHub Actions will auto-publish to npm and VS Code Marketplace');
}

main();
