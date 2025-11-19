#!/usr/bin/env node

/**
 * ÆtherLight Full Suite Installer (FIXED v0.18.3)
 *
 * FIXES (BUG-007 - File Lock Issues):
 * - Issue #1: Proper file.close() callback - wait for file handle to close
 * - Issue #2: Don't delete installer file - Windows handles cleanup
 * - Issue #3: Windows-style path handling - avoid quoting issues
 * - Issue #4: Antivirus lock retry mechanism - detect and retry up to 3 times
 * - Issue #5: Close file stream on redirect - prevent file handle leak
 *
 * WHY: Users were getting "file is being used by another process" errors
 * when running 'aetherlight' CLI installer on Windows.
 *
 * FIXES (BUG-005 - Error Message Improvements):
 * - Added handleInstallerError() - Detects 5 installer-specific error types
 * - Added handleDownloadError() - Detects 6 download-specific error types
 * - Replaced generic "Failed" messages with actionable feedback
 *
 * WHY: Users received generic error messages with no guidance on resolution.
 *
 * ERROR TYPES DETECTED:
 * Installer: file locked, permission denied, file not found, invalid path, disk full
 * Download: no internet, rate limit, 404, timeout, connection refused, SSL errors
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
      // FIX: Issue #5 - Close file stream on redirect
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close(() => {
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        });
        return;
      }

      if (response.statusCode !== 200) {
        file.close(() => {
          const httpError = new Error(`Failed to download: HTTP ${response.statusCode}`);
          // BUG-005: Show specific error message for HTTP errors
          handleDownloadError(httpError, url);
          reject(httpError);
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
        // FIX: Issue #1 - Wait for file handle to actually close
        file.close((err) => {
          if (err) {
            reject(err);
          } else {
            process.stdout.write('\n');

            // Give antivirus 1 second to scan
            setTimeout(() => {
              resolve();
            }, 1000);
          }
        });
      });
    }).on('error', (err) => {
      file.close(() => {
        // BUG-005: Show specific error message before cleaning up
        handleDownloadError(err, url);
        try {
          fs.unlinkSync(dest);
        } catch (unlinkErr) {
          // Ignore cleanup errors
        }
        reject(err);
      });
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

/**
 * Get installed desktop app version
 * Returns version string (e.g., "0.18.2") or null if not installed
 *
 * BUG-004: Add version check before downloading/installing
 * WHY: Avoid unnecessary downloads if already up to date
 */
function getInstalledDesktopVersion(osType) {
  try {
    if (osType === 'windows') {
      // Method 1: Check Windows Registry
      try {
        const output = execSync(
          'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "Lumina"',
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );

        const versionMatch = output.match(/DisplayVersion\s+REG_SZ\s+(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          return versionMatch[1];
        }
      } catch (regErr) {
        // Registry query failed, try fallback
      }

      // Method 2: Fallback - Check Program Files directly
      const appPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Lumina', 'Lumina.exe');
      if (fs.existsSync(appPath)) {
        try {
          // Try WMIC (Windows Management Instrumentation Command-line)
          const escapedPath = appPath.replace(/\\/g, '\\\\');
          const versionOutput = execSync(
            `wmic datafile where name="${escapedPath}" get Version /value`,
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
          );
          const match = versionOutput.match(/Version=([\d.]+)/);
          if (match) {
            return match[1];
          }
        } catch (wmicErr) {
          // WMIC not available (Windows 11), try PowerShell
          try {
            const psOutput = execSync(
              `powershell -command "(Get-Item '${appPath}').VersionInfo.ProductVersion"`,
              { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
            );
            const version = psOutput.trim();
            if (version && /^\d+\.\d+\.\d+/.test(version)) {
              return version.match(/^(\d+\.\d+\.\d+)/)[1];
            }
          } catch (psErr) {
            // PowerShell also failed
          }
        }
      }
    } else if (osType === 'mac') {
      // Check /Applications/Lumina.app/Contents/Info.plist
      const appPath = '/Applications/Lumina.app/Contents/Info.plist';
      if (fs.existsSync(appPath)) {
        const plistContent = fs.readFileSync(appPath, 'utf-8');
        const match = plistContent.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([\d.]+)<\/string>/);
        if (match) {
          return match[1];
        }
      }
    }
  } catch (err) {
    // Can't determine version - treat as not installed
    return null;
  }
  return null;
}

// FIX: Issue #3 + #4 - Windows path handling + retry logic
function launchInstaller(filePath, maxRetries = 3) {
  // Convert to Windows-style path
  const windowsPath = filePath.replace(/\//g, '\\');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`   Launching installer (attempt ${attempt}/${maxRetries})...`, 'blue');
      execSync(`start "" "${windowsPath}"`, {
        stdio: 'inherit',
        shell: 'cmd.exe'
      });
      return true;
    } catch (err) {
      // FIX: Issue #4 - Detect antivirus lock
      if (err.message.includes('being used by another process')) {
        if (attempt < maxRetries) {
          log('   ⚠️  Installer file is locked (antivirus scanning)', 'yellow');
          log(`   Retrying in 3 seconds...`, 'yellow');
          execSync('timeout /t 3 /nobreak > nul', { stdio: 'ignore' });
        } else {
          log('   ❌ Installer still locked after retries', 'red');
          log('   Try running installer manually from:', 'yellow');
          log(`   ${filePath}`, 'yellow');
          return false;
        }
      } else {
        throw err;
      }
    }
  }
  return false;
}

/**
 * Handle installer errors with actionable feedback
 * BUG-005: Detect specific error types and guide users
 *
 * @param {Error} err - The error object
 * @param {string} filePath - Path to installer file
 */
function handleInstallerError(err, filePath) {
  const errorMessage = err.message || '';

  // Error Type 1: File locked (antivirus or another process)
  if (errorMessage.includes('being used by another process') || errorMessage.includes('EBUSY')) {
    log('⚠️  Installer file is locked (likely antivirus scanning)', 'yellow');
    log('   Suggestion: Wait 30 seconds and try again', 'yellow');
    log('   Or run manually from:', 'yellow');
    log(`   ${filePath}`, 'blue');
    return;
  }

  // Error Type 2: Permission denied
  if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
    log('❌ Permission denied', 'red');
    log('   Suggestion: Try running as administrator', 'yellow');
    log('   Windows: Right-click terminal → "Run as administrator"', 'yellow');
    log('   Or run manually from:', 'yellow');
    log(`   ${filePath}`, 'blue');
    return;
  }

  // Error Type 3: File not found
  if (errorMessage.includes('ENOENT') || errorMessage.includes('cannot find')) {
    log('❌ Installer file not found', 'red');
    log('   This is a bug - the installer was downloaded but disappeared', 'yellow');
    log('   Suggestion: Try running the installer again', 'yellow');
    log('   If this persists, please report at:', 'yellow');
    log('   https://github.com/AEtherlight-ai/lumina/issues', 'blue');
    return;
  }

  // Error Type 4: Invalid path
  if (errorMessage.includes('invalid') && errorMessage.includes('path')) {
    log('❌ Invalid installer path', 'red');
    log('   Suggestion: Check if temp directory exists', 'yellow');
    log(`   Path: ${filePath}`, 'blue');
    return;
  }

  // Error Type 5: Disk full
  if (errorMessage.includes('ENOSPC') || errorMessage.includes('no space')) {
    log('❌ Not enough disk space', 'red');
    log('   Suggestion: Free up disk space and try again', 'yellow');
    log('   Installer requires ~200MB free space', 'yellow');
    return;
  }

  // Fallback: Generic error with details
  log('❌ Unexpected installer error', 'red');
  log('   Error details:', 'yellow');
  console.error(err.message);
  log('\n   You can install manually from:', 'yellow');
  log(`   ${filePath}`, 'blue');
}

/**
 * Handle download errors with actionable feedback
 * BUG-005: Detect specific network/download error types
 *
 * @param {Error} err - The error object
 * @param {string} url - The URL that failed
 */
function handleDownloadError(err, url) {
  const errorMessage = err.message || '';
  const errorCode = err.code || '';

  // Error Type 1: No internet connection
  if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN' || errorMessage.includes('getaddrinfo')) {
    log('❌ No internet connection', 'red');
    log('   Suggestion: Check your network connection', 'yellow');
    log('   - Verify you can access the internet', 'yellow');
    log('   - Check firewall/proxy settings', 'yellow');
    log('   - Try again in a moment', 'yellow');
    return;
  }

  // Error Type 2: GitHub API rate limit
  if (errorMessage.includes('rate limit') || errorMessage.includes('403')) {
    log('❌ GitHub API rate limit exceeded', 'red');
    log('   Suggestion: Wait and try again', 'yellow');
    log('   - Anonymous requests: 60 per hour', 'yellow');
    log('   - Try again in 5-10 minutes', 'yellow');
    return;
  }

  // Error Type 3: 404 Not Found
  if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
    log('❌ Release not found', 'red');
    log('   The latest release may not be published yet', 'yellow');
    log('   Suggestion:', 'yellow');
    log('   - Check https://github.com/AEtherlight-ai/lumina/releases', 'blue');
    log('   - Try again in a few minutes', 'yellow');
    return;
  }

  // Error Type 4: Timeout
  if (errorCode === 'ETIMEDOUT' || errorCode === 'ESOCKETTIMEDOUT' || errorMessage.includes('timeout')) {
    log('❌ Download timed out', 'red');
    log('   Suggestion: Your connection may be slow', 'yellow');
    log('   - Try again (download is ~150MB)', 'yellow');
    log('   - Check your internet speed', 'yellow');
    log('   - Consider using a faster connection', 'yellow');
    return;
  }

  // Error Type 5: Connection refused
  if (errorCode === 'ECONNREFUSED' || errorMessage.includes('connection refused')) {
    log('❌ Connection refused', 'red');
    log('   Suggestion: GitHub may be temporarily unavailable', 'yellow');
    log('   - Check https://www.githubstatus.com/', 'blue');
    log('   - Try again in a few minutes', 'yellow');
    return;
  }

  // Error Type 6: SSL/Certificate errors
  if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
    log('❌ SSL certificate error', 'red');
    log('   Suggestion: Your system may have certificate issues', 'yellow');
    log('   - Check your system date/time is correct', 'yellow');
    log('   - Update your operating system', 'yellow');
    log('   - Check antivirus/firewall isn\'t blocking HTTPS', 'yellow');
    return;
  }

  // Fallback: Generic download error
  log('❌ Download failed', 'red');
  log('   Error details:', 'yellow');
  console.error(err.message);
  log('\n   Suggestion:', 'yellow');
  log('   - Check your internet connection', 'yellow');
  log('   - Try again in a few minutes', 'yellow');
  log('   - Or download manually from:', 'yellow');
  log('   https://github.com/AEtherlight-ai/lumina/releases/latest', 'blue');
}

async function installDesktopApp(filePath, osType, releaseVersion) {
  log('\n🖥️  Checking Desktop app...', 'blue');

  // BUG-004: Check installed version FIRST
  const installedVersion = getInstalledDesktopVersion(osType);

  if (installedVersion) {
    log(`   Found installed version: ${installedVersion}`, 'blue');

    // Compare versions (normalize format - remove "v" prefix)
    const installedNormalized = installedVersion.replace(/^v/, '');
    const releaseNormalized = releaseVersion.replace(/^v/, '');

    if (installedNormalized === releaseNormalized) {
      log('✅ Desktop app is already up to date!', 'green');
      log(`   Version ${installedVersion} is the latest version.`, 'green');
      log('   No update needed.', 'green');
      return true; // Skip installation
    } else {
      log(`   Updating from ${installedVersion} to ${releaseVersion}...`, 'yellow');
    }
  } else {
    log(`   Desktop app not found, installing ${releaseVersion}...`, 'blue');
  }

  // Proceed with installation only if needed
  log('   Installing Desktop app...', 'blue');

  try {
    if (osType === 'windows') {
      // FIX: Use new launch function with retry logic
      const success = launchInstaller(filePath);
      if (success) {
        log('   Follow installer prompts to complete setup.', 'yellow');
      }
      return success;
    } else if (osType === 'mac') {
      // Install Mac app to /Applications
      const appName = path.basename(filePath);
      const targetPath = `/Applications/${appName}`;

      log('   Installing to /Applications...', 'blue');
      execSync(`cp -R "${filePath}" "${targetPath}"`, { stdio: 'inherit' });
      log('✅ Desktop app installed to /Applications!', 'green');
      return true;
    }
  } catch (err) {
    // BUG-005: Use specific error handler instead of generic message
    handleInstallerError(err, filePath);
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
  const releaseVersion = release.tag_name.replace('v', '');

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

  // BUG-004: Check desktop version BEFORE downloading
  let needsDesktopUpdate = false;
  let desktopPath = null;

  if (desktopAsset) {
    const installedVersion = getInstalledDesktopVersion(osType);
    const installedNormalized = installedVersion ? installedVersion.replace(/^v/, '') : null;
    needsDesktopUpdate = !installedNormalized || installedNormalized !== releaseVersion;
  }

  // Download VS Code extension (always needed)
  log('\n📥 Downloading VS Code extension...', 'blue');
  const vsixPath = path.join(tmpDir, vsixAsset.name);
  await downloadFile(vsixAsset.browser_download_url, vsixPath);
  log('✓ Downloaded successfully', 'green');

  // BUG-004: Only download desktop app if needed
  if (desktopAsset && needsDesktopUpdate) {
    log('\n📥 Downloading Desktop app...', 'blue');
    desktopPath = path.join(tmpDir, desktopAsset.name);
    await downloadFile(desktopAsset.browser_download_url, desktopPath);
    log('✓ Downloaded successfully', 'green');
  } else if (!desktopAsset) {
    log('\n⚠️  Desktop app not available for this platform yet', 'yellow');
  }

  // Install VS Code extension
  const vsCodeInstalled = installVSCodeExtension(vsixPath);

  // Install Cursor extension (optional)
  installCursorExtension(vsixPath);

  // Install Desktop app (BUG-004: will show "Already up to date" if skipped download)
  if (desktopAsset) {
    await installDesktopApp(desktopPath, osType, releaseVersion);
  }

  // Cleanup
  log('\n🧹 Cleaning up temporary files...', 'blue');
  try {
    fs.unlinkSync(vsixPath);
    // FIX: Issue #2 - DON'T delete desktop installer
    // Windows installer process still needs it
    // It will clean up temp files itself
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
  // BUG-005: Specific errors already shown by handlers above
  // Just show summary and exit
  log('\n╔═══════════════════════════════════════╗', 'bright');
  log('║     Installation Failed               ║', 'red');
  log('╚═══════════════════════════════════════╝\n', 'bright');
  log('   See error details above for troubleshooting steps.', 'yellow');
  log('   Need help? https://github.com/AEtherlight-ai/lumina/issues\n', 'blue');
  process.exit(1);
});
