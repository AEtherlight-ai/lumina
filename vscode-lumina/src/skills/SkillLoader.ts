/**
 * SKILLS-001: Skill Loader
 *
 * DESIGN DECISION: Scan .claude/skills/ directory and load all skill metadata
 * WHY: Skills are self-contained, discoverable, versioned assets
 * PATTERN: Pattern-META-001 (Skill Discovery and Loading)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Skill, SkillMetadata, SkillLoadError, validateMetadata } from './SkillMetadata';

/**
 * SkillLoader: Discovers and loads skills from .claude/skills/
 *
 * REASONING CHAIN:
 * 1. User installs extension with built-in skills
 * 2. Skills located in workspace/.claude/skills/<name>/
 * 3. Each skill has metadata.json + skill.md
 * 4. Loader scans directory, parses metadata, validates schema
 * 5. Returns array of loaded skills + errors for invalid ones
 */
export class SkillLoader {
    private workspaceRoot: string;
    private skillsPath: string;
    private loadedSkills: Map<string, Skill> = new Map();
    private loadErrors: SkillLoadError[] = [];

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.skillsPath = path.join(workspaceRoot, '.claude', 'skills');
    }

    /**
     * Load all skills from .claude/skills/ directory
     *
     * PERFORMANCE TARGET: < 100ms for typical project (5-10 skills)
     * REASONING: Metadata is small JSON (~1KB), parsing is fast
     */
    public async loadAllSkills(): Promise<{ skills: Skill[]; errors: SkillLoadError[] }> {
        this.loadedSkills.clear();
        this.loadErrors = [];

        // Check if skills directory exists
        if (!fs.existsSync(this.skillsPath)) {
            console.log('[ÆtherLight] Skills directory not found:', this.skillsPath);
            return { skills: [], errors: [] };
        }

        // Scan for skill directories
        const entries = fs.readdirSync(this.skillsPath, { withFileTypes: true });
        const skillDirs = entries.filter(entry => entry.isDirectory());

        console.log(`[ÆtherLight] Found ${skillDirs.length} skill directories`);

        // Load each skill
        for (const dir of skillDirs) {
            const skillName = dir.name;
            const skillPath = path.join(this.skillsPath, skillName);

            try {
                const skill = await this.loadSkill(skillName, skillPath);
                this.loadedSkills.set(skillName, skill);
            } catch (error) {
                this.loadErrors.push({
                    skillName,
                    error: error instanceof Error ? error.message : String(error),
                    path: skillPath
                });
                console.error(`[ÆtherLight] Failed to load skill "${skillName}":`, error);
            }
        }

        return {
            skills: Array.from(this.loadedSkills.values()),
            errors: this.loadErrors
        };
    }

    /**
     * Load a single skill from directory
     *
     * STEPS:
     * 1. Check for metadata.json
     * 2. Parse JSON
     * 3. Validate against schema
     * 4. Check for skill.md
     * 5. Return Skill object (content lazy loaded)
     */
    private async loadSkill(skillName: string, skillPath: string): Promise<Skill> {
        // Load metadata.json
        const metadataPath = path.join(skillPath, 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            throw new Error(`Missing metadata.json in ${skillPath}`);
        }

        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        let metadata: any;

        try {
            metadata = JSON.parse(metadataContent);
        } catch (error) {
            throw new Error(`Invalid JSON in metadata.json: ${error}`);
        }

        // Validate metadata
        const validation = validateMetadata(metadata);
        if (!validation.valid) {
            throw new Error(`Invalid metadata: ${validation.errors.join(', ')}`);
        }

        // Check for skill.md
        const contentPath = path.join(skillPath, 'skill.md');
        if (!fs.existsSync(contentPath)) {
            throw new Error(`Missing skill.md in ${skillPath}`);
        }

        // Return skill (content lazy loaded on demand)
        return {
            metadata: metadata as SkillMetadata,
            skillPath,
            contentPath,
            // content loaded on demand via loadSkillContent()
        };
    }

    /**
     * Get skill by name
     */
    public getSkill(name: string): Skill | undefined {
        return this.loadedSkills.get(name);
    }

    /**
     * Get all loaded skills
     */
    public getAllSkills(): Skill[] {
        return Array.from(this.loadedSkills.values());
    }

    /**
     * Get load errors
     */
    public getErrors(): SkillLoadError[] {
        return this.loadErrors;
    }

    /**
     * Load skill content (skill.md) on demand
     *
     * REASONING: Content can be large (5-20KB), lazy load to save memory
     * WHEN: Load when skill is about to be executed
     */
    public async loadSkillContent(skill: Skill): Promise<string> {
        if (skill.content) {
            return skill.content;
        }

        if (!fs.existsSync(skill.contentPath)) {
            throw new Error(`Skill content not found: ${skill.contentPath}`);
        }

        const content = fs.readFileSync(skill.contentPath, 'utf-8');
        skill.content = content;
        return content;
    }

    /**
     * Reload skills (useful after skill updates)
     */
    public async reload(): Promise<{ skills: Skill[]; errors: SkillLoadError[] }> {
        return await this.loadAllSkills();
    }

    /**
     * Check if a skill exists
     */
    public hasSkill(name: string): boolean {
        return this.loadedSkills.has(name);
    }

    /**
     * Get skill count
     */
    public getSkillCount(): number {
        return this.loadedSkills.size;
    }

    /**
     * Filter skills by tag
     *
     * Example: loader.filterByTag('github') returns all GitHub-related skills
     */
    public filterByTag(tag: string): Skill[] {
        return Array.from(this.loadedSkills.values()).filter(skill =>
            skill.metadata.tags.includes(tag)
        );
    }

    /**
     * Search skills by keyword (name, description, tags)
     */
    public search(keyword: string): Skill[] {
        const lowerKeyword = keyword.toLowerCase();
        return Array.from(this.loadedSkills.values()).filter(skill => {
            return (
                skill.metadata.name.toLowerCase().includes(lowerKeyword) ||
                skill.metadata.description.toLowerCase().includes(lowerKeyword) ||
                skill.metadata.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
            );
        });
    }
}

/**
 * Create SkillLoader instance for current workspace
 *
 * USAGE:
 * const loader = createSkillLoader(context);
 * const { skills, errors } = await loader.loadAllSkills();
 */
export function createSkillLoader(context: vscode.ExtensionContext): SkillLoader | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        console.log('[ÆtherLight] No workspace folder found, skills disabled');
        return null;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    return new SkillLoader(workspaceRoot);
}
