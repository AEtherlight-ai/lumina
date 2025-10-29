/**
 * VERSION-001: Skill Update Detection
 *
 * DESIGN DECISION: Check GitHub for latest skill versions on extension activation
 * WHY: Users need awareness of skill updates without breaking workflows
 * PATTERN: Pattern-META-001 (Version Management)
 */

import * as vscode from 'vscode';
import { Skill, SkillMetadata, compareVersions, isBreakingChange } from './SkillMetadata';
import { SkillLoader } from './SkillLoader';

/**
 * Skill update information
 */
export interface SkillUpdate {
    skillName: string;
    currentVersion: string;
    latestVersion: string;
    isBreaking: boolean;
    changes: string[];
    downloadUrl: string;
}

/**
 * Update check result
 */
export interface UpdateCheckResult {
    hasUpdates: boolean;
    updates: SkillUpdate[];
    errors: string[];
}

/**
 * SkillUpdateManager: Checks for skill updates from GitHub
 *
 * REASONING CHAIN:
 * 1. Extension activates
 * 2. Load local skills (via SkillLoader)
 * 3. Fetch latest skill versions from GitHub
 * 4. Compare local vs latest (semver)
 * 5. Detect breaking changes (major version bump)
 * 6. Return update list
 */
export class SkillUpdateManager {
    private skillLoader: SkillLoader;
    private githubRepo: string = 'AEtherlight-ai/lumina';
    private githubBranch: string = 'master';

    constructor(skillLoader: SkillLoader) {
        this.skillLoader = skillLoader;
    }

    /**
     * Check for skill updates
     *
     * PERFORMANCE TARGET: < 2s (GitHub API is fast)
     * REASONING: Runs on extension activation, non-blocking
     */
    public async checkForUpdates(): Promise<UpdateCheckResult> {
        const result: UpdateCheckResult = {
            hasUpdates: false,
            updates: [],
            errors: []
        };

        try {
            // Get all local skills
            const localSkills = this.skillLoader.getAllSkills();
            if (localSkills.length === 0) {
                console.log('[ÆtherLight] No local skills to check for updates');
                return result;
            }

            // Fetch latest skill metadata from GitHub
            const latestSkills = await this.fetchLatestSkillMetadata();

            // Compare versions
            for (const localSkill of localSkills) {
                const latestMeta = latestSkills.get(localSkill.metadata.name);
                if (!latestMeta) {
                    // Skill doesn't exist in latest release (custom skill)
                    console.log(`[ÆtherLight] Skill "${localSkill.metadata.name}" not found in latest release (custom skill)`);
                    continue;
                }

                // Compare versions
                const comparison = compareVersions(localSkill.metadata.version, latestMeta.version);
                if (comparison < 0) {
                    // Local version is older
                    const update: SkillUpdate = {
                        skillName: localSkill.metadata.name,
                        currentVersion: localSkill.metadata.version,
                        latestVersion: latestMeta.version,
                        isBreaking: isBreakingChange(localSkill.metadata.version, latestMeta.version),
                        changes: await this.detectChanges(localSkill.metadata, latestMeta),
                        downloadUrl: this.getSkillDownloadUrl(localSkill.metadata.name)
                    };

                    result.updates.push(update);
                    result.hasUpdates = true;

                    console.log(`[ÆtherLight] Update available for "${update.skillName}": ${update.currentVersion} → ${update.latestVersion}${update.isBreaking ? ' (BREAKING)' : ''}`);
                }
            }

        } catch (error) {
            const errorMsg = `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            console.error('[ÆtherLight]', errorMsg);
        }

        return result;
    }

    /**
     * Fetch latest skill metadata from GitHub
     *
     * REASONING: GitHub raw content API provides fast access to metadata.json files
     * ENDPOINT: https://raw.githubusercontent.com/{repo}/{branch}/.claude/skills/{name}/metadata.json
     */
    private async fetchLatestSkillMetadata(): Promise<Map<string, SkillMetadata>> {
        const latestSkills = new Map<string, SkillMetadata>();

        try {
            // First, get list of skill directories from GitHub
            const skillNames = await this.fetchSkillList();

            // Fetch metadata for each skill
            for (const skillName of skillNames) {
                try {
                    const metadata = await this.fetchSkillMetadata(skillName);
                    latestSkills.set(skillName, metadata);
                } catch (error) {
                    console.warn(`[ÆtherLight] Failed to fetch metadata for "${skillName}":`, error);
                }
            }

        } catch (error) {
            console.error('[ÆtherLight] Failed to fetch skill list from GitHub:', error);
            throw error;
        }

        return latestSkills;
    }

    /**
     * Fetch list of skill directories from GitHub
     *
     * ENDPOINT: GitHub API - list directory contents
     */
    private async fetchSkillList(): Promise<string[]> {
        const url = `https://api.github.com/repos/${this.githubRepo}/contents/.claude/skills?ref=${this.githubBranch}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'ÆtherLight-VSCode-Extension'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const data: any[] = await response.json();
            const skillDirs = data
                .filter(item => item.type === 'dir')
                .map(item => item.name);

            console.log(`[ÆtherLight] Found ${skillDirs.length} skills in latest release`);
            return skillDirs;

        } catch (error) {
            console.error('[ÆtherLight] Failed to fetch skill list:', error);
            throw error;
        }
    }

    /**
     * Fetch metadata.json for a specific skill from GitHub
     */
    private async fetchSkillMetadata(skillName: string): Promise<SkillMetadata> {
        const url = `https://raw.githubusercontent.com/${this.githubRepo}/${this.githubBranch}/.claude/skills/${skillName}/metadata.json`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
            }

            const metadata: SkillMetadata = await response.json();
            return metadata;

        } catch (error) {
            console.error(`[ÆtherLight] Failed to fetch metadata for "${skillName}":`, error);
            throw error;
        }
    }

    /**
     * Detect changes between versions
     *
     * REASONING: Simple heuristic based on version bump type
     * TODO: In future, fetch changelogs or compare skill.md content
     */
    private async detectChanges(current: SkillMetadata, latest: SkillMetadata): Promise<string[]> {
        const changes: string[] = [];

        // Parse versions
        const currentParts = current.version.split('.').map(Number);
        const latestParts = latest.version.split('.').map(Number);

        const [curMajor, curMinor, curPatch] = currentParts;
        const [latMajor, latMinor, latPatch] = latestParts;

        // Detect change type
        if (latMajor > curMajor) {
            changes.push('⚠️ BREAKING CHANGE: Major version update');
        }
        if (latMinor > curMinor) {
            changes.push('✨ New features added');
        }
        if (latPatch > curPatch) {
            changes.push('🐛 Bug fixes');
        }

        // Compare metadata fields
        if (current.description !== latest.description) {
            changes.push('📝 Description updated');
        }

        const currentParams = Object.keys(current.parameters || {});
        const latestParams = Object.keys(latest.parameters || {});
        if (currentParams.length !== latestParams.length) {
            changes.push('🔧 Parameters changed');
        }

        if (changes.length === 0) {
            changes.push('Minor updates');
        }

        return changes;
    }

    /**
     * Get download URL for a skill
     */
    private getSkillDownloadUrl(skillName: string): string {
        return `https://github.com/${this.githubRepo}/tree/${this.githubBranch}/.claude/skills/${skillName}`;
    }

    /**
     * Check if GitHub API is reachable
     *
     * REASONING: Offline users shouldn't see errors, just skip update check
     */
    public async isGitHubReachable(): Promise<boolean> {
        try {
            const response = await fetch('https://api.github.com', {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get update count
     */
    public async getUpdateCount(): Promise<number> {
        const result = await this.checkForUpdates();
        return result.updates.length;
    }

    /**
     * Check if specific skill has update
     */
    public async hasUpdate(skillName: string): Promise<boolean> {
        const result = await this.checkForUpdates();
        return result.updates.some(u => u.skillName === skillName);
    }
}

/**
 * Create SkillUpdateManager instance
 */
export function createUpdateManager(skillLoader: SkillLoader): SkillUpdateManager {
    return new SkillUpdateManager(skillLoader);
}
