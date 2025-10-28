/**
 * @aetherlight/node - Node.js bindings for ÆtherLight Core
 *
 * DESIGN DECISION: Dynamic loading of native addon with platform detection
 * WHY: NAPI-RS generates platform-specific binaries (.node files)
 *
 * REASONING CHAIN:
 * 1. NAPI-RS builds separate .node files for each platform (Windows, macOS, Linux)
 * 2. Node.js requires() the correct .node file based on platform
 * 3. Dynamic loading enables single npm package for all platforms
 * 4. Pre-built binaries downloaded from npm registry at install time
 * 5. Native addon loaded once, cached by Node.js module system
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: lib.rs (FFI implementation), package.json (platform config)
 * FUTURE: Add fallback to WASM if native addon unavailable (P1-012)
 */

const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

const { platform, arch } = process;

/**
 * Platform-specific binary resolution
 *
 * DESIGN DECISION: Map Node.js platform/arch to NAPI-RS triple
 * WHY: NAPI-RS generates binaries with Rust target triple naming convention
 *
 * REASONING CHAIN:
 * 1. Node.js uses platform names: "win32", "darwin", "linux"
 * 2. NAPI-RS uses Rust target triples: "x86_64-pc-windows-msvc", etc.
 * 3. Mapping enables automatic binary selection at runtime
 * 4. Unsupported platforms throw clear error message
 * 5. ARM support included (Apple Silicon, Linux ARM servers)
 */
const platformArchMap = {
  'win32-x64': 'aetherlight-node.win32-x64-msvc.node',
  'win32-ia32': 'aetherlight-node.win32-ia32-msvc.node',
  'win32-arm64': 'aetherlight-node.win32-arm64-msvc.node',
  'darwin-x64': 'aetherlight-node.darwin-x64.node',
  'darwin-arm64': 'aetherlight-node.darwin-arm64.node',
  'linux-x64': 'aetherlight-node.linux-x64-gnu.node',
  'linux-arm64': 'aetherlight-node.linux-arm64-gnu.node',
  'linux-arm': 'aetherlight-node.linux-arm-gnueabihf.node',
};

/**
 * Determine correct native addon path
 *
 * DESIGN DECISION: Check for pre-built binary, then local build
 * WHY: Support both npm install (pre-built) and local development (cargo build)
 */
function getNativeAddonPath() {
  const platformKey = `${platform}-${arch}`;
  const nativeBinding = platformArchMap[platformKey];

  if (!nativeBinding) {
    throw new Error(
      `Unsupported platform: ${platformKey}\n` +
      `ÆtherLight node bindings are not available for your platform.\n` +
      `Supported platforms: ${Object.keys(platformArchMap).join(', ')}`
    );
  }

  // Try pre-built binary (npm install)
  const prebuildPath = join(__dirname, nativeBinding);
  if (existsSync(prebuildPath)) {
    return prebuildPath;
  }

  // Try local build (cargo build)
  const localBuildPath = join(__dirname, `aetherlight-node.${platform}-${arch}.node`);
  if (existsSync(localBuildPath)) {
    return localBuildPath;
  }

  throw new Error(
    `Native addon not found for ${platformKey}\n` +
    `Expected at: ${prebuildPath}\n` +
    `Try running: npm run build`
  );
}

/**
 * Load and export native addon
 *
 * DESIGN DECISION: Lazy loading with clear error messages
 * WHY: Provide actionable error messages if native addon missing
 */
let nativeBinding;

try {
  const addonPath = getNativeAddonPath();
  nativeBinding = require(addonPath);
} catch (err) {
  // Provide clear error message with troubleshooting steps
  console.error('Failed to load ÆtherLight native addon:');
  console.error(err.message);
  console.error('\nTroubleshooting:');
  console.error('1. Ensure Rust toolchain is installed: https://rustup.rs/');
  console.error('2. Run: npm run build');
  console.error('3. Check that your platform is supported');
  throw err;
}

/**
 * Export all FFI bindings
 *
 * DESIGN DECISION: Re-export all native addon exports
 * WHY: Provide clean ES6 import syntax for consumers
 *
 * Exports:
 * - PatternMatcher class
 * - Pattern class
 * - ConfidenceScore class
 * - MatchResult interface
 * - ConfidenceBreakdown interface
 * - version() function
 */
module.exports = nativeBinding;

// ES6 named exports for modern JavaScript
module.exports.PatternMatcher = nativeBinding.PatternMatcher;
module.exports.Pattern = nativeBinding.Pattern;
module.exports.ConfidenceScore = nativeBinding.ConfidenceScore;
module.exports.version = nativeBinding.version;
