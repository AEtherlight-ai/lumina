/**
 * SKILLS-001: Skill Metadata System
 *
 * DESIGN DECISION: TypeScript interfaces for skill metadata structure
 * WHY: Type safety, IDE autocomplete, validation at compile time
 * PATTERN: Pattern-META-001 (Skill Metadata Schema)
 */

/**
 * Skill parameter definition
 */
export interface SkillParameter {
    type: 'string' | 'number' | 'boolean' | 'array';
    required: boolean;
    description: string;
    default?: any;
    enum?: string[];
}

/**
 * Skill dependency specification
 */
export interface SkillDependencies {
    [key: string]: string; // e.g., { "gh": ">=2.0.0", "node": ">=16.0.0" }
}

/**
 * Complete skill metadata structure
 * Matches metadata.json schema in .claude/skills/<name>/metadata.json
 */
export interface SkillMetadata {
    name: string;
    version: string; // Semantic version (e.g., "1.0.0")
    description: string;
    author: string;
    created: string; // ISO date (e.g., "2025-10-29")
    updated: string; // ISO date
    parameters: { [key: string]: SkillParameter };
    dependencies: SkillDependencies;
    tags: string[];
    repository: string; // GitHub URL
}

/**
 * Skill with loaded metadata and content
 */
export interface Skill {
    metadata: SkillMetadata;
    skillPath: string; // Absolute path to skill directory
    contentPath: string; // Path to skill.md file
    content?: string; // Loaded skill.md content (lazy loaded)
}

/**
 * Skill loading error
 */
export interface SkillLoadError {
    skillName: string;
    error: string;
    path: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validate skill metadata against schema
 *
 * REASONING: Catch malformed metadata.json files early
 * PERFORMANCE: Validation runs once on skill load (~1ms per skill)
 */
export function validateMetadata(metadata: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!metadata.name || typeof metadata.name !== 'string') {
        errors.push('Missing or invalid "name" field');
    }
    if (!metadata.version || typeof metadata.version !== 'string') {
        errors.push('Missing or invalid "version" field');
    }
    if (!metadata.description || typeof metadata.description !== 'string') {
        errors.push('Missing or invalid "description" field');
    }
    if (!metadata.author || typeof metadata.author !== 'string') {
        errors.push('Missing or invalid "author" field');
    }

    // Validate version format (semantic versioning)
    if (metadata.version && !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
        errors.push('Version must follow semantic versioning (e.g., "1.0.0")');
    }

    // Validate parameters object
    if (metadata.parameters) {
        if (typeof metadata.parameters !== 'object') {
            errors.push('"parameters" must be an object');
        } else {
            for (const [paramName, param] of Object.entries(metadata.parameters)) {
                const p = param as any;
                if (!p.type || !['string', 'number', 'boolean', 'array'].includes(p.type)) {
                    errors.push(`Parameter "${paramName}" has invalid type`);
                }
                if (typeof p.required !== 'boolean') {
                    errors.push(`Parameter "${paramName}" missing "required" field`);
                }
                if (!p.description) {
                    errors.push(`Parameter "${paramName}" missing "description" field`);
                }
            }
        }
    }

    // Validate dependencies object
    if (metadata.dependencies) {
        if (typeof metadata.dependencies !== 'object') {
            errors.push('"dependencies" must be an object');
        }
    }

    // Validate tags array
    if (metadata.tags && !Array.isArray(metadata.tags)) {
        errors.push('"tags" must be an array');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Parse version string to comparable components
 *
 * Example: "1.2.3" → { major: 1, minor: 2, patch: 3 }
 */
export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    raw: string;
}

export function parseVersion(version: string): SemanticVersion | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
        return null;
    }
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        raw: version
    };
}

/**
 * Compare two semantic versions
 *
 * Returns:
 *   -1 if v1 < v2
 *    0 if v1 === v2
 *    1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
    const parsed1 = parseVersion(v1);
    const parsed2 = parseVersion(v2);

    if (!parsed1 || !parsed2) {
        throw new Error('Invalid version format');
    }

    if (parsed1.major !== parsed2.major) {
        return parsed1.major - parsed2.major;
    }
    if (parsed1.minor !== parsed2.minor) {
        return parsed1.minor - parsed2.minor;
    }
    return parsed1.patch - parsed2.patch;
}

/**
 * Check if version is a breaking change (major version bump)
 */
export function isBreakingChange(oldVersion: string, newVersion: string): boolean {
    const old = parseVersion(oldVersion);
    const newer = parseVersion(newVersion);

    if (!old || !newer) {
        return false;
    }

    return newer.major > old.major;
}
