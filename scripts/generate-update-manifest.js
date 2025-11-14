/**
 * Generate Update Manifest for Tauri Updater (BUG-006)
 *
 * DESIGN DECISION: Use GitHub Releases as update server
 * WHY: Free hosting, automatic CDN, version control integration, built-in to Tauri
 *
 * USAGE: Called by publish-release.js after building desktop app
 * OUTPUT: Update JSON files for each platform (uploaded to GitHub Release)
 *
 * PATTERN: Pattern-PUBLISH-001 (automated release pipeline)
 * RELATED: tauri.conf.json updater config, main.rs update check
 *
 * REASONING CHAIN:
 * 1. Desktop app builds → Creates installers (.msi, .dmg, .AppImage)
 * 2. Tauri generates .sig signature files (if signing keys configured)
 * 3. This script generates platform-specific .json update manifests
 * 4. Publishing workflow uploads installers + signatures + manifests to GitHub Releases
 * 5. Desktop app checks GitHub Releases endpoint for updates
 * 6. Tauri updater verifies signature and downloads update
 *
 * NOTE: This script generates PLACEHOLDER manifests until signing keys are configured.
 * See docs/DESKTOP_UPDATE_MECHANISM.md for signing key setup instructions.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate update manifests from build artifacts
 */
async function generateUpdateManifests() {
    console.log('📝 Generating update manifests for Tauri updater...');

    // Read version from package.json
    const packageJsonPath = path.join(__dirname, '../vscode-lumina/package.json');
    if (!fs.existsSync(packageJsonPath)) {
        console.error('❌ package.json not found:', packageJsonPath);
        process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;

    console.log(`   Version: ${version}`);

    // Find desktop app build artifacts
    const desktopBundlePath = path.join(
        __dirname,
        '../products/lumina-desktop/src-tauri/target/release/bundle'
    );

    if (!fs.existsSync(desktopBundlePath)) {
        console.warn('⚠️  Desktop app bundle directory not found:', desktopBundlePath);
        console.warn('   Skipping update manifest generation (desktop app not built yet)');
        return;
    }

    // Generate manifests for each platform
    const platforms = [
        { name: 'windows', arch: 'x86_64', ext: '.msi', dir: 'msi' },
        { name: 'darwin', arch: 'x86_64', ext: '.app.tar.gz', dir: 'macos' },
        { name: 'darwin', arch: 'aarch64', ext: '.app.tar.gz', dir: 'macos' },
        { name: 'linux', arch: 'x86_64', ext: '.AppImage', dir: 'appimage' },
    ];

    let manifestsGenerated = 0;

    for (const platform of platforms) {
        const platformDir = path.join(desktopBundlePath, platform.dir);
        if (!fs.existsSync(platformDir)) {
            console.log(`   Skipping ${platform.name}-${platform.arch} (not built)`);
            continue;
        }

        // Find installer file in platform directory
        const files = fs.readdirSync(platformDir);
        const installerFile = files.find((f) =>
            f.endsWith(platform.ext) || f.endsWith('.msi') || f.endsWith('.dmg') || f.endsWith('.AppImage')
        );

        if (!installerFile) {
            console.log(`   Skipping ${platform.name}-${platform.arch} (no installer found)`);
            continue;
        }

        const installerPath = path.join(platformDir, installerFile);
        const signatureFile = installerPath + '.sig';

        // Check if signature file exists (created by Tauri with signing keys)
        let signature = '';
        if (fs.existsSync(signatureFile)) {
            signature = fs.readFileSync(signatureFile, 'utf-8').trim();
            console.log(`   ✅ Found signature for ${platform.name}-${platform.arch}`);
        } else {
            // Generate placeholder signature (SHA-256 hash)
            // WARNING: This is NOT secure - real signatures require Tauri signing keys
            const fileBuffer = fs.readFileSync(installerPath);
            signature = crypto.createHash('sha256').update(fileBuffer).digest('base64');
            console.warn(`   ⚠️  No .sig file found for ${platform.name}-${platform.arch}, using placeholder`);
        }

        // Generate update manifest JSON
        const manifest = {
            version: `v${version}`,
            notes: `ÆtherLight v${version} - See CHANGELOG.md for details`,
            pub_date: new Date().toISOString(),
            platforms: {
                [`${platform.name}-${platform.arch}`]: {
                    signature,
                    url: `https://github.com/aetherlight-ai/lumina/releases/download/v${version}/${installerFile}`,
                },
            },
        };

        // Write manifest to file (format: windows-x86_64.json, darwin-aarch64.json, etc.)
        const manifestFilename = `${platform.name}-${platform.arch}.json`;
        const manifestPath = path.join(desktopBundlePath, manifestFilename);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        console.log(`   ✅ Generated ${manifestFilename}`);
        manifestsGenerated++;
    }

    if (manifestsGenerated === 0) {
        console.warn('⚠️  No update manifests generated (no build artifacts found)');
        console.warn('   Build desktop app first: cd products/lumina-desktop && npm run tauri build');
        return;
    }

    console.log(`✅ Update manifest generation complete: ${manifestsGenerated} platforms`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Generate signing keys: npm run tauri signer generate -- -w ~/.tauri/lumina.key');
    console.log('   2. Add public key to tauri.conf.json (pubkey field)');
    console.log('   3. Set TAURI_SIGNING_PRIVATE_KEY env var during builds');
    console.log('   4. Rebuild desktop app to generate real .sig files');
    console.log('   5. Upload installers + .sig files + .json manifests to GitHub Releases');
    console.log('');
    console.log('⚠️  WARNING: Placeholder signatures are NOT secure!');
    console.log('   Real updates require Tauri signing keys for security.');
}

// Run if called directly
if (require.main === module) {
    generateUpdateManifests().catch((error) => {
        console.error('❌ Failed to generate update manifests:', error);
        process.exit(1);
    });
}

module.exports = { generateUpdateManifests };
