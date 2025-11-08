/**
 * VersionTracker: Version management and upgrade detection service
 *
 * DESIGN DECISION: Track ÆtherLight version per-project for upgrade detection
 * WHY: Users need to know when upgrades are available and what migration path to follow
 *
 * REASONING CHAIN:
 * 1. Problem: Users don't know when ÆtherLight has new versions available
 * 2. Problem: Config schema changes between versions → need migration
 * 3. Solution: Track version in .aetherlight/version.json
 * 4. Solution: Compare current vs latest (npm registry)
 * 5. Result: Upgrade detection + migration path selection
 *
 * WORKFLOW:
 * 1. getCurrentVersion() → Read .aetherlight/version.json
 * 2. getLatestVersion() → Fetch from npm registry (aetherlight-sdk)
 * 3. compareVersions() → Semantic version comparison (major.minor.patch)
 * 4. needsUpgrade() → current < latest?
 * 5. setVersion() → Update version.json after upgrade
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * PATTERN: Pattern-PUBLISH-003 (No runtime npm dependencies - use https module)
 * RELATED: SELF-016 (Upgrade command), SELF-018 (Config migration)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Version information stored in version.json
 */
export interface VersionInfo {
    /** Semantic version (major.minor.patch) */
    version: string;

    /** Installation timestamp (ISO 8601) */
    installed_at: string;

    /** Last upgrade check timestamp (ISO 8601) */
    last_checked?: string;
}

/**
 * Latest version information from npm registry
 */
export interface LatestVersionInfo {
    /** Latest semantic version */
    version: string;

    /** Publication timestamp (ISO 8601) */
    published_at: string;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
    /** Update available flag */
    updateAvailable: boolean;

    /** Change type (major, minor, patch, none) */
    changeType: 'major' | 'minor' | 'patch' | 'none';

    /** Current version */
    currentVersion: string;

    /** Latest version */
    latestVersion: string;
}

/**
 * Upgrade check result
 */
export interface UpgradeCheckResult {
    /** Upgrade available flag */
    upgradeAvailable: boolean;

    /** Current version (null if fresh install) */
    currentVersion: string | null;

    /** Latest version */
    latestVersion: string;

    /** Change type */
    changeType?: 'major' | 'minor' | 'patch' | 'none';
}

/**
 * VersionTracker: Service for version tracking and upgrade detection
 *
 * DESIGN DECISION: Pure service with no state
 * WHY: Simple, testable, no side effects
 */
export class VersionTracker {
    private logger: MiddlewareLogger;
    private readonly NPM_REGISTRY_URL = 'https://registry.npmjs.org/aetherlight-sdk';
    private readonly REQUEST_TIMEOUT = 5000; // 5 seconds

    constructor() {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Get current ÆtherLight version from project
     *
     * @param projectRoot - Absolute path to project root
     * @returns Version info or null if not installed
     *
     * ALGORITHM:
     * 1. Check if .aetherlight/version.json exists
     * 2. Read and parse JSON
     * 3. Return version info
     *
     * PERFORMANCE TARGET: <50ms (local file read)
     */
    public async getCurrentVersion(projectRoot: string): Promise<VersionInfo | null> {
        const startTime = this.logger.startOperation('VersionTracker.getCurrentVersion', {
            projectRoot
        });

        try {
            const versionPath = this.getVersionFilePath(projectRoot);

            // Check if version.json exists
            if (!fs.existsSync(versionPath)) {
                this.logger.endOperation('VersionTracker.getCurrentVersion', startTime, {
                    result: 'not_installed'
                });
                return null;
            }

            // Read and parse version.json
            const content = fs.readFileSync(versionPath, 'utf-8');

            let versionInfo: VersionInfo;
            try {
                versionInfo = JSON.parse(content);
            } catch (parseError) {
                throw new Error(`Failed to parse version.json: ${(parseError as Error).message}`);
            }

            this.logger.endOperation('VersionTracker.getCurrentVersion', startTime, {
                version: versionInfo.version
            });

            return versionInfo;
        } catch (error) {
            this.logger.failOperation('VersionTracker.getCurrentVersion', startTime, error);
            throw error;
        }
    }

    /**
     * Set current ÆtherLight version in project
     *
     * @param projectRoot - Absolute path to project root
     * @param version - Version to set (e.g., "2.0.0")
     *
     * ALGORITHM:
     * 1. Ensure .aetherlight directory exists
     * 2. Read existing version.json (if exists) to preserve installed_at
     * 3. Write updated version.json
     *
     * PERFORMANCE TARGET: <50ms (local file write)
     */
    public async setVersion(projectRoot: string, version: string): Promise<void> {
        const startTime = this.logger.startOperation('VersionTracker.setVersion', {
            projectRoot,
            version
        });

        try {
            const aetherlightDir = path.join(projectRoot, '.aetherlight');
            const versionPath = this.getVersionFilePath(projectRoot);

            // Ensure .aetherlight directory exists
            if (!fs.existsSync(aetherlightDir)) {
                fs.mkdirSync(aetherlightDir, { recursive: true });
            }

            // Read existing version.json (if exists) to preserve installed_at
            let installed_at = new Date().toISOString();
            if (fs.existsSync(versionPath)) {
                try {
                    const existing = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
                    if (existing.installed_at) {
                        installed_at = existing.installed_at;
                    }
                } catch {
                    // Ignore parse errors, use new timestamp
                }
            }

            // Create version info
            const versionInfo: VersionInfo = {
                version,
                installed_at,
                last_checked: new Date().toISOString()
            };

            // Write version.json
            fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2), 'utf-8');

            this.logger.endOperation('VersionTracker.setVersion', startTime, {
                version
            });
        } catch (error) {
            this.logger.failOperation('VersionTracker.setVersion', startTime, error);
            throw error;
        }
    }

    /**
     * Get latest ÆtherLight version from npm registry
     *
     * @returns Latest version info
     *
     * ALGORITHM:
     * 1. Make HTTPS GET request to npm registry API
     * 2. Parse JSON response
     * 3. Extract latest version from dist-tags
     * 4. Return version info
     *
     * PERFORMANCE TARGET: <500ms (network request)
     */
    public async getLatestVersion(): Promise<LatestVersionInfo> {
        const startTime = this.logger.startOperation('VersionTracker.getLatestVersion', {});

        return new Promise((resolve, reject) => {
            try {
                const req = https.get(this.NPM_REGISTRY_URL, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);

                            // Extract latest version
                            const latestVersion = json['dist-tags']?.latest;
                            const publishedAt = json['time']?.[latestVersion];

                            if (!latestVersion) {
                                reject(new Error('Failed to extract latest version from npm registry'));
                                return;
                            }

                            const result: LatestVersionInfo = {
                                version: latestVersion,
                                published_at: publishedAt || new Date().toISOString()
                            };

                            this.logger.endOperation('VersionTracker.getLatestVersion', startTime, {
                                version: result.version
                            });

                            resolve(result);
                        } catch (parseError) {
                            this.logger.failOperation('VersionTracker.getLatestVersion', startTime, parseError);
                            reject(new Error(`Failed to parse npm registry response: ${(parseError as Error).message}`));
                        }
                    });
                });

                // Set timeout
                req.setTimeout(this.REQUEST_TIMEOUT, () => {
                    req.destroy();
                    reject(new Error('Request timeout (5s)'));
                });

                req.on('error', (error) => {
                    this.logger.failOperation('VersionTracker.getLatestVersion', startTime, error);
                    reject(new Error(`Failed to fetch latest version: ${error.message}`));
                });

                req.end();
            } catch (error) {
                this.logger.failOperation('VersionTracker.getLatestVersion', startTime, error);
                reject(error);
            }
        });
    }

    /**
     * Compare two semantic versions
     *
     * @param currentVersion - Current version (e.g., "1.0.0")
     * @param latestVersion - Latest version (e.g., "2.0.0")
     * @returns Comparison result
     *
     * ALGORITHM:
     * 1. Parse versions (major.minor.patch)
     * 2. Compare major → minor → patch
     * 3. Determine change type (major, minor, patch, none)
     *
     * PERFORMANCE TARGET: <1ms (pure computation)
     */
    public compareVersions(currentVersion: string, latestVersion: string): VersionComparison {
        // Parse versions
        const current = this.parseVersion(currentVersion);
        const latest = this.parseVersion(latestVersion);

        // Compare versions
        if (latest.major > current.major) {
            return {
                updateAvailable: true,
                changeType: 'major',
                currentVersion,
                latestVersion
            };
        } else if (latest.major === current.major && latest.minor > current.minor) {
            return {
                updateAvailable: true,
                changeType: 'minor',
                currentVersion,
                latestVersion
            };
        } else if (latest.major === current.major && latest.minor === current.minor && latest.patch > current.patch) {
            return {
                updateAvailable: true,
                changeType: 'patch',
                currentVersion,
                latestVersion
            };
        } else {
            // Current >= latest
            return {
                updateAvailable: false,
                changeType: 'none',
                currentVersion,
                latestVersion
            };
        }
    }

    /**
     * Check if upgrade is needed
     *
     * @param projectRoot - Absolute path to project root
     * @returns Upgrade check result
     *
     * ALGORITHM:
     * 1. Get current version (local)
     * 2. Get latest version (npm registry)
     * 3. Compare versions
     * 4. Return upgrade recommendation
     *
     * PERFORMANCE TARGET: <500ms (dominated by network request)
     */
    public async needsUpgrade(projectRoot: string): Promise<UpgradeCheckResult> {
        const startTime = this.logger.startOperation('VersionTracker.needsUpgrade', {
            projectRoot
        });

        try {
            // Get current version
            const current = await this.getCurrentVersion(projectRoot);

            // Get latest version
            const latest = await this.getLatestVersion();

            // Compare versions
            if (!current) {
                // Fresh install
                this.logger.endOperation('VersionTracker.needsUpgrade', startTime, {
                    result: 'fresh_install',
                    latestVersion: latest.version
                });

                return {
                    upgradeAvailable: true,
                    currentVersion: null,
                    latestVersion: latest.version
                };
            }

            const comparison = this.compareVersions(current.version, latest.version);

            this.logger.endOperation('VersionTracker.needsUpgrade', startTime, {
                upgradeAvailable: comparison.updateAvailable,
                changeType: comparison.changeType
            });

            return {
                upgradeAvailable: comparison.updateAvailable,
                currentVersion: current.version,
                latestVersion: latest.version,
                changeType: comparison.changeType
            };
        } catch (error) {
            this.logger.failOperation('VersionTracker.needsUpgrade', startTime, error);
            throw error;
        }
    }

    /**
     * Parse semantic version string
     *
     * @param version - Version string (e.g., "1.2.3")
     * @returns Parsed version components
     */
    private parseVersion(version: string): { major: number; minor: number; patch: number } {
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

        if (!match) {
            throw new Error(`Invalid version format: ${version}`);
        }

        return {
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            patch: parseInt(match[3], 10)
        };
    }

    /**
     * Get path to version.json file
     *
     * @param projectRoot - Project root directory
     * @returns Absolute path to version.json
     */
    private getVersionFilePath(projectRoot: string): string {
        return path.join(projectRoot, '.aetherlight', 'version.json');
    }
}
