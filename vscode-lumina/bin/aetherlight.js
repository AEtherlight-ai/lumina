#!/usr/bin/env node

/**
 * ÆtherLight Full Suite Installer
 *
 * DESIGN DECISION: Single command installs VS Code extension + Desktop app
 * WHY: User requested simple npm install that handles everything
 *
 * REASONING CHAIN:
 * 1. Detect OS (Windows, Mac, Linux)
 * 2. Download latest release from GitHub
 * 3. Install VS Code extension (.vsix)
 * 4. Install desktop app (.exe/.app) if available
 * 5. Install Cursor extension if Cursor detected
 * 6. Result: Complete setup with one command
 *
 * USAGE:
 *   npm install -g @aetherlight/lumina
 *   # OR
 *   npx @aetherlight/lumina install
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const GITHUB_REPO = 'AEtherlight-ai/lumina';
const GITHUB_API = 'https://api.github.com';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function detectOS() {
  const platform = os.platform();
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'mac';
  if (platform === 'linux') return 'linux';
  throw new Error(`Unsupported platform: ${platform}`);
}

function isCommandAvailable(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, { headers: { 'User-Agent': 'aetherlight-installer' } }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = ((downloaded / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r  Downloading... ${percent}%`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases`,  // Fetch all releases
      headers: { 'User-Agent': 'aetherlight-installer' },
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // Check if API returned an error
          if (parsed.message) {
            reject(new Error(`GitHub API error: ${parsed.message}`));
            return;
          }

          // Check if response is an array
          if (!Array.isArray(parsed)) {
            reject(new Error('Unexpected API response format'));
            return;
          }

          // Find first release that is NOT draft and NOT prerelease
          const latestRelease = parsed.find(r => !r.draft && !r.prerelease);
          if (latestRelease) {
            resolve(latestRelease);
          } else {
            reject(new Error('No stable releases found'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function installVSCodeExtension(vsixPath) {
  log('\n📦 Installing VS Code extension...', 'blue');

  if (!isCommandAvailable('code')) {
    log('⚠️  VS Code not found. Skipping extension install.', 'yellow');
    log('   Install VS Code first: https://code.visualstudio.com/', 'yellow');
    return false;
  }

  try {
    execSync(`code --install-extension "${vsixPath}"`, { stdio: 'inherit' });
    log('✅ VS Code extension installed!', 'green');
    return true;
  } catch (err) {
    log('❌ Failed to install VS Code extension', 'red');
    console.error(err.message);
    return false;
  }
}

function installCursorExtension(vsixPath) {
  log('\n📦 Installing Cursor extension...', 'blue');

  if (!isCommandAvailable('cursor')) {
    log('   Cursor not detected. Skipping.', 'yellow');
    return false;
  }

  try {
    execSync(`cursor --install-extension "${vsixPath}"`, { stdio: 'inherit' });
    log('✅ Cursor extension installed!', 'green');
    return true;
  } catch (err) {
    log('⚠️  Failed to install Cursor extension (non-critical)', 'yellow');
    return false;
  }
}

function getInstalledDesktopVersion(osType) {
  try {
    if (osType === 'windows') {
      // Check Windows registry or Program Files
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const luminaPath = path.join(programFiles, 'Lumina');
      const versionFile = path.join(luminaPath, 'version.txt');

      if (fs.existsSync(versionFile)) {
        return fs.readFileSync(versionFile, 'utf8').trim();
      }
    } else if (osType === 'mac') {
      // Check /Applications/Lumina.app
      const appPath = '/Applications/Lumina.app/Contents/Info.plist';
      if (fs.existsSync(appPath)) {
        // Parse plist for version (simple approach)
        const plist = fs.readFileSync(appPath, 'utf8');
        const versionMatch = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>(.*?)<\/string>/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }
    }
  } catch (err) {
    // If we can't determine version, assume not installed
    return null;
  }
  return null;
}

function installDesktopApp(filePath, osType, releaseVersion) {
  log('\n🖥️  Checking Desktop app...', 'blue');

  // Check if desktop app is already installed
  const installedVersion = getInstalledDesktopVersion(osType);

  if (installedVersion) {
    log(`   Found installed version: ${installedVersion}`, 'blue');

    // Compare versions (simple string comparison for now)
    if (installedVersion === releaseVersion) {
      log('✅ Desktop app is already up to date!', 'green');
      log(`   Version ${installedVersion} is the latest version.`, 'green');
      return true;
    } else {
      log(`   Updating from ${installedVersion} to ${releaseVersion}...`, 'yellow');
    }
  } else {
    log('   Desktop app not found, installing...', 'blue');
  }

  try {
    if (osType === 'windows') {
      // Run Windows installer (.exe)
      log('   Launching Windows installer...', 'blue');
      execSync(`start "" "${filePath}"`, { stdio: 'inherit' });
      log('   Follow installer prompts to complete setup.', 'yellow');
      return true;
    } else if (osType === 'mac') {
      // Install Mac app to /Applications
      const appName = path.basename(filePath).replace('.zip', '');
      const targetPath = `/Applications/${appName}`;

      // Remove old version if exists
      if (fs.existsSync(targetPath)) {
        log('   Removing old version...', 'blue');
        execSync(`rm -rf "${targetPath}"`, { stdio: 'inherit' });
      }

      log('   Installing to /Applications...', 'blue');
      execSync(`cp -R "${filePath}" "${targetPath}"`, { stdio: 'inherit' });
      log('✅ Desktop app installed to /Applications!', 'green');
      return true;
    }
  } catch (err) {
    log('❌ Failed to install desktop app', 'red');
    console.error(err.message);
    return false;
  }

  return false;
}

async function main() {
  log('\n╔═══════════════════════════════════════╗', 'bright');
  log('║   ÆtherLight Full Suite Installer    ║', 'bright');
  log('╚═══════════════════════════════════════╝\n', 'bright');

  const osType = detectOS();
  log(`✓ Detected OS: ${osType}`, 'green');

  log('\n🔍 Fetching latest release...', 'blue');
  const release = await getLatestRelease();
  log(`✓ Found version: ${release.tag_name}`, 'green');

  const assets = release.assets;
  const tmpDir = os.tmpdir();

  // Find VS Code extension (.vsix)
  const vsixAsset = assets.find(a => a.name.endsWith('.vsix'));
  if (!vsixAsset) {
    log('❌ VS Code extension not found in release', 'red');
    process.exit(1);
  }

  // Find desktop app (OS-specific)
  let desktopAsset = null;
  if (osType === 'windows') {
    desktopAsset = assets.find(a => a.name.endsWith('.exe'));
  } else if (osType === 'mac') {
    desktopAsset = assets.find(a => a.name.endsWith('.app.zip') || a.name.endsWith('.dmg'));
  }

  // Download VS Code extension
  log('\n📥 Downloading VS Code extension...', 'blue');
  const vsixPath = path.join(tmpDir, vsixAsset.name);
  await downloadFile(vsixAsset.browser_download_url, vsixPath);
  log('✓ Downloaded successfully', 'green');

  // Download desktop app (if available)
  let desktopPath = null;
  if (desktopAsset) {
    log('\n📥 Downloading Desktop app...', 'blue');
    desktopPath = path.join(tmpDir, desktopAsset.name);
    await downloadFile(desktopAsset.browser_download_url, desktopPath);
    log('✓ Downloaded successfully', 'green');
  } else {
    log('\n⚠️  Desktop app not available for this platform yet', 'yellow');
  }

  // Install VS Code extension
  const vsCodeInstalled = installVSCodeExtension(vsixPath);

  // Install Cursor extension (optional)
  installCursorExtension(vsixPath);

  // Install Desktop app (if available)
  if (desktopPath) {
    installDesktopApp(desktopPath, osType, release.tag_name.replace('v', ''));
  }

  // Cleanup
  log('\n🧹 Cleaning up temporary files...', 'blue');
  try {
    fs.unlinkSync(vsixPath);
    if (desktopPath) fs.unlinkSync(desktopPath);
  } catch (err) {
    // Ignore cleanup errors
  }

  // Summary
  log('\n╔═══════════════════════════════════════╗', 'bright');
  log('║        Installation Complete!         ║', 'green');
  log('╚═══════════════════════════════════════╝\n', 'bright');

  if (vsCodeInstalled) {
    log('🎉 ÆtherLight is ready to use in VS Code!', 'green');
    log('   Open VS Code and look for the ÆtherLight icon in the sidebar.', 'blue');
  }

  if (desktopPath && osType === 'windows') {
    log('\n📱 Desktop app installer is running.', 'blue');
    log('   Follow the prompts to complete desktop setup.', 'blue');
  } else if (desktopPath && osType === 'mac') {
    log('\n📱 Desktop app installed to /Applications', 'green');
  }

  log('\n📚 Documentation: https://github.com/AEtherlight-ai/lumina', 'blue');
  log('🐛 Issues: https://github.com/AEtherlight-ai/lumina/issues\n', 'blue');
}

// Run installer
main().catch((err) => {
  log('\n❌ Installation failed:', 'red');
  console.error(err);
  process.exit(1);
});
