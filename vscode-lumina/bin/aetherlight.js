#!/usr/bin/env node

/**
 * ÆtherLight Full Suite Installer (v0.18.8)
 *
 * BULLETPROOF UPDATE HANDLING:
 * - Detects running Lumina.exe and closes it gracefully before updating
 * - 5 retry attempts with exponential backoff (2s, 4s, 6s, 8s, 10s)
 * - File copy fallback - if original file locked, copies to new location
 * - 3 second post-download delay for antivirus scanning
 * - Proper "Installing" vs "Updating" messaging
 * - File accessibility check before launch attempt
 *
 * USAGE:
 *   npx aetherlight
 *   npm install -g aetherlight && aetherlight
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');

const GITHUB_REPO = 'AEtherlight-ai/lumina';

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

/**
 * Check if Lumina desktop app is currently running
 */
function isLuminaRunning(osType) {
  try {
    if (osType === 'windows') {
      const output = execSync('tasklist /FI "IMAGENAME eq Lumina.exe" /NH', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      return output.toLowerCase().includes('lumina.exe');
    } else if (osType === 'mac') {
      const output = execSync('pgrep -x Lumina', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      return output.trim().length > 0;
    }
  } catch (err) {
    return false;
  }
  return false;
}

/**
 * Close running Lumina process gracefully
 */
function closeLuminaProcess(osType) {
  if (!isLuminaRunning(osType)) {
    return true;
  }

  log('   Lumina is running. Closing for update...', 'yellow');

  try {
    if (osType === 'windows') {
      execSync('taskkill /IM Lumina.exe', { stdio: ['pipe', 'pipe', 'ignore'] });
    } else if (osType === 'mac') {
      execSync('pkill -TERM Lumina', { stdio: ['pipe', 'pipe', 'ignore'] });
    }

    // Wait for process to exit
    for (let i = 0; i < 10; i++) {
      execSync(osType === 'windows' ? 'timeout /t 1 /nobreak > nul' : 'sleep 1', { stdio: 'ignore' });
      if (!isLuminaRunning(osType)) {
        log('   ✓ Lumina closed', 'green');
        return true;
      }
    }

    // Force kill if still running
    if (osType === 'windows') {
      execSync('taskkill /F /IM Lumina.exe', { stdio: ['pipe', 'pipe', 'ignore'] });
    } else if (osType === 'mac') {
      execSync('pkill -9 Lumina', { stdio: ['pipe', 'pipe', 'ignore'] });
    }
    return true;
  } catch (err) {
    return !isLuminaRunning(osType);
  }
}

/**
 * Check if a file can be accessed (not locked)
 */
function isFileAccessible(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    fs.closeSync(fd);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Copy file to a new location with random suffix
 */
function copyToNewLocation(originalPath) {
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const base = path.basename(originalPath, ext);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const newPath = path.join(dir, base + '_' + randomSuffix + ext);
  fs.copyFileSync(originalPath, newPath);
  return newPath;
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
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close(() => {
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        });
        return;
      }

      if (response.statusCode !== 200) {
        file.close(() => {
          reject(new Error(`HTTP ${response.statusCode}`));
        });
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
        file.close((err) => {
          if (err) {
            reject(err);
          } else {
            process.stdout.write('\n');
            // 3 second delay for antivirus
            setTimeout(() => resolve(), 3000);
          }
        });
      });
    }).on('error', (err) => {
      file.close(() => {
        try { fs.unlinkSync(dest); } catch (e) {}
        reject(err);
      });
    });
  });
}

async function getLatestRelease() {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases`,
      headers: { 'User-Agent': 'aetherlight-installer' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.message) {
            reject(new Error(parsed.message));
            return;
          }
          const release = parsed.find(r => !r.draft && !r.prerelease);
          if (release) {
            resolve(release);
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
    log('⚠️  VS Code not found. Skipping.', 'yellow');
    return false;
  }

  try {
    execSync(`code --install-extension "${vsixPath}"`, { stdio: 'inherit' });
    log('✅ VS Code extension installed!', 'green');
    return true;
  } catch (err) {
    log('❌ Failed to install VS Code extension', 'red');
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
    log('⚠️  Failed to install Cursor extension', 'yellow');
    return false;
  }
}

/**
 * Get installed desktop app version
 */
function getInstalledDesktopVersion(osType) {
  try {
    if (osType === 'windows') {
      try {
        const output = execSync(
          'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "Lumina"',
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        const match = output.match(/DisplayVersion\s+REG_SZ\s+(\d+\.\d+\.\d+)/);
        if (match) return match[1];
      } catch (e) {}

      const appPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Lumina', 'Lumina.exe');
      if (fs.existsSync(appPath)) {
        try {
          const psOutput = execSync(
            `powershell -command "(Get-Item '${appPath}').VersionInfo.ProductVersion"`,
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
          );
          const version = psOutput.trim();
          if (/^\d+\.\d+\.\d+/.test(version)) {
            return version.match(/^(\d+\.\d+\.\d+)/)[1];
          }
        } catch (e) {}
      }
    } else if (osType === 'mac') {
      const appPath = '/Applications/Lumina.app/Contents/Info.plist';
      if (fs.existsSync(appPath)) {
        const content = fs.readFileSync(appPath, 'utf-8');
        const match = content.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([\d.]+)<\/string>/);
        if (match) return match[1];
      }
    }
  } catch (err) {}
  return null;
}

/**
 * Launch installer with bulletproof retry logic
 */
function launchInstaller(filePath, osType) {
  const maxRetries = 5;
  const retryDelays = [2000, 4000, 6000, 8000, 10000];
  let currentPath = filePath;

  if (osType === 'windows') {
    currentPath = currentPath.replace(/\//g, '\\');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Check file accessibility
    if (!isFileAccessible(currentPath)) {
      log(`   ⚠️  File locked (attempt ${attempt}/${maxRetries})`, 'yellow');

      // Try copy workaround on attempt 3+
      if (attempt >= 3 && currentPath === filePath.replace(/\//g, '\\')) {
        try {
          currentPath = copyToNewLocation(filePath);
          log('   ✓ Created unlocked copy', 'green');
        } catch (e) {}
      }

      if (attempt < maxRetries) {
        const delay = retryDelays[attempt - 1];
        log(`   Waiting ${delay / 1000}s...`, 'yellow');
        execSync(osType === 'windows' ? `timeout /t ${delay / 1000} /nobreak > nul` : `sleep ${delay / 1000}`, { stdio: 'ignore' });
        continue;
      }
    }

    try {
      log('   Launching installer...', 'blue');

      if (osType === 'windows') {
        const child = spawn('cmd.exe', ['/c', 'start', '""', currentPath], {
          detached: true,
          stdio: 'ignore',
          shell: false
        });
        child.unref();
      } else if (osType === 'mac') {
        if (currentPath.endsWith('.dmg')) {
          execSync(`hdiutil attach "${currentPath}"`, { stdio: 'inherit' });
          log('   DMG mounted. Drag Lumina to Applications.', 'blue');
        } else {
          execSync(`open "${currentPath}"`, { stdio: 'inherit' });
        }
      }
      return true;

    } catch (err) {
      if (attempt < maxRetries) {
        const delay = retryDelays[attempt - 1];
        log(`   ⚠️  Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`, 'yellow');
        execSync(osType === 'windows' ? `timeout /t ${delay / 1000} /nobreak > nul` : `sleep ${delay / 1000}`, { stdio: 'ignore' });
      } else {
        log('   ❌ Could not launch installer', 'red');
        log(`   Run manually: ${filePath}`, 'yellow');
        return false;
      }
    }
  }
  return false;
}

async function installDesktopApp(filePath, osType, releaseVersion) {
  log('\n🖥️  Checking Desktop app...', 'blue');

  const installedVersion = getInstalledDesktopVersion(osType);
  const isUpdate = !!installedVersion;

  if (installedVersion) {
    const installedNorm = installedVersion.replace(/^v/, '');
    const releaseNorm = releaseVersion.replace(/^v/, '');

    if (installedNorm === releaseNorm) {
      log('✅ Desktop app is up to date!', 'green');
      return true;
    }
    log(`   Update available: ${installedVersion} → ${releaseVersion}`, 'yellow');
  } else {
    log('   Desktop app not found', 'blue');
  }

  // Close running process before update
  if (isLuminaRunning(osType)) {
    closeLuminaProcess(osType);
  }

  if (isUpdate) {
    log(`   📦 Updating to ${releaseVersion}...`, 'blue');
  } else {
    log(`   📦 Installing ${releaseVersion}...`, 'blue');
  }

  const success = launchInstaller(filePath, osType);
  if (success) {
    log(isUpdate ? '   ✓ Update launched!' : '   ✓ Installer launched!', 'green');
  }
  return success;
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
  const releaseVersion = release.tag_name.replace('v', '');

  // Find VS Code extension
  const vsixAsset = assets.find(a => a.name.endsWith('.vsix'));
  if (!vsixAsset) {
    log('❌ VS Code extension not found in release', 'red');
    process.exit(1);
  }

  // Find desktop app
  let desktopAsset = null;
  if (osType === 'windows') {
    desktopAsset = assets.find(a => a.name.endsWith('.exe'));
  } else if (osType === 'mac') {
    desktopAsset = assets.find(a => a.name.endsWith('.dmg'));
  }

  // Check if desktop update needed
  let needsDesktopUpdate = false;
  if (desktopAsset) {
    const installed = getInstalledDesktopVersion(osType);
    const installedNorm = installed ? installed.replace(/^v/, '') : null;
    needsDesktopUpdate = !installedNorm || installedNorm !== releaseVersion;
  }

  // Download VS Code extension
  log('\n📥 Downloading VS Code extension...', 'blue');
  const vsixPath = path.join(tmpDir, vsixAsset.name);
  await downloadFile(vsixAsset.browser_download_url, vsixPath);
  log('✓ Downloaded successfully', 'green');

  // Download desktop app if needed
  let desktopPath = null;
  if (desktopAsset && needsDesktopUpdate) {
    log('\n📥 Downloading Desktop app...', 'blue');
    desktopPath = path.join(tmpDir, desktopAsset.name);
    await downloadFile(desktopAsset.browser_download_url, desktopPath);
    log('✓ Downloaded successfully', 'green');
  } else if (!desktopAsset) {
    log('\n⚠️  Desktop app not available for this platform', 'yellow');
  }

  // Install extensions
  const vsCodeInstalled = installVSCodeExtension(vsixPath);
  installCursorExtension(vsixPath);

  // Install desktop app
  if (desktopAsset) {
    if (desktopPath) {
      await installDesktopApp(desktopPath, osType, releaseVersion);
    } else {
      log('\n✅ Desktop app is already up to date!', 'green');
    }
  }

  // Cleanup vsix only (leave installer for Windows)
  try { fs.unlinkSync(vsixPath); } catch (e) {}

  // Summary
  log('\n╔═══════════════════════════════════════╗', 'bright');
  log('║            Setup Complete!            ║', 'green');
  log('╚═══════════════════════════════════════╝\n', 'bright');

  if (vsCodeInstalled) {
    log('🎉 ÆtherLight is ready!', 'green');
    log('   Open VS Code and look for ÆtherLight in the sidebar.', 'blue');
  }

  log('\n📚 Docs: https://github.com/AEtherlight-ai/lumina', 'blue');
  log('🐛 Issues: https://github.com/AEtherlight-ai/lumina/issues\n', 'blue');
}

main().catch((err) => {
  log('\n❌ Installation failed: ' + err.message, 'red');
  log('   Try again or download manually from:', 'yellow');
  log('   https://github.com/AEtherlight-ai/lumina/releases\n', 'blue');
  process.exit(1);
});
