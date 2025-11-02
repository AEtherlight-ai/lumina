/**
 * SkillBuilder Service
 *
 * DESIGN DECISION: Interactive wizard for skill creation with template generation
 * WHY: Manual skill creation is slow (5-10min) and error-prone. Wizard guides user, validates inputs, ensures consistency.
 *
 * REASONING CHAIN:
 * 1. User runs aetherlight.createSkill command
 * 2. Wizard prompts for: skill name, description, tags, author
 * 3. Validates: skill name uniqueness, required fields not empty
 * 4. Loads template from .claude/templates/skill-template.md
 * 5. Replaces placeholders: {{name}}, {{description}}, {{author}}, {{date}}, {{tags}}
 * 6. Writes .claude/skills/[skill-name]/SKILL.md
 * 7. Auto-registers with SkillLoader (discoverable immediately)
 * 8. Performance: <30s user interaction time
 *
 * PATTERN: Pattern-SKILL-001 (Skill Scaffolding)
 * PATTERN: Pattern-TEMPLATE-001 (Template-Based Code Generation)
 * RELATED: MID-006 (Skill Builder sprint task)
 *
 * @module services/SkillBuilder
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Input for skill creation
 */
export interface SkillInput {
	name: string;
	description: string;
	author: string;
	tags: string[];
}

/**
 * Result of skill creation
 */
export interface SkillCreationResult {
	success: boolean;
	skillName?: string;
	skillPath?: string;
	error?: string;
}

/**
 * Validation result for skill input
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * SkillBuilder Service
 *
 * Creates skills via interactive wizard with template generation.
 * Performance target: <30s user interaction time
 */
export class SkillBuilder {
	constructor(
		private templatesPath: string,
		private skillsPath: string
	) {}

	/**
	 * Load skill template from file
	 *
	 * DESIGN DECISION: Load from .claude/templates/skill-template.md
	 * WHY: Template provides consistent structure
	 */
	async loadTemplate(): Promise<string> {
		const templatePath = path.join(this.templatesPath, 'skill-template.md');

		if (!fs.existsSync(templatePath)) {
			throw new Error(`Template file not found: ${templatePath}`);
		}

		return fs.readFileSync(templatePath, 'utf8');
	}

	/**
	 * Check if skill name is unique
	 *
	 * DESIGN DECISION: Check .claude/skills/ directory
	 * WHY: Prevent overwriting existing skills
	 */
	async isSkillNameUnique(name: string): Promise<boolean> {
		const skillDir = path.join(this.skillsPath, name);
		return !fs.existsSync(skillDir);
	}

	/**
	 * Validate skill input
	 *
	 * DESIGN DECISION: Name and description are required
	 * WHY: Skills without name/description are invalid
	 */
	validateInput(input: SkillInput): ValidationResult {
		const errors: string[] = [];

		if (!input.name || input.name.trim() === '') {
			errors.push('name');
		}

		if (!input.description || input.description.trim() === '') {
			errors.push('description');
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Replace template placeholders with user input
	 *
	 * DESIGN DECISION: Replace {{name}}, {{description}}, {{author}}, {{date}}, {{tags}}
	 * WHY: Template placeholders must be replaced with user input
	 */
	replacePlaceholders(template: string, input: SkillInput): string {
		const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		const tagsString = input.tags.join(', ');

		let result = template;
		result = result.replace(/\{\{name\}\}/g, input.name);
		result = result.replace(/\{\{description\}\}/g, input.description);
		result = result.replace(/\{\{author\}\}/g, input.author);
		result = result.replace(/\{\{date\}\}/g, now);
		result = result.replace(/\{\{tags\}\}/g, tagsString);

		return result;
	}

	/**
	 * Get skill directory path
	 *
	 * DESIGN DECISION: Skills stored in .claude/skills/[skill-name]/
	 * WHY: Consistent directory structure for skill discovery
	 */
	getSkillPath(skillName: string): string {
		return path.join(this.skillsPath, skillName);
	}

	/**
	 * Ensure skill directory exists
	 *
	 * DESIGN DECISION: Create directory before writing SKILL.md
	 * WHY: fs.writeFile fails if directory doesn't exist
	 */
	async ensureSkillDirectory(skillName: string): Promise<void> {
		const skillDir = this.getSkillPath(skillName);

		if (!fs.existsSync(skillDir)) {
			fs.mkdirSync(skillDir, { recursive: true });
		}
	}

	/**
	 * Write SKILL.md file
	 *
	 * DESIGN DECISION: Write to .claude/skills/[skill-name]/SKILL.md
	 * WHY: Standard filename for skill definitions
	 */
	async writeSkillFile(skillName: string, content: string): Promise<void> {
		const skillDir = this.getSkillPath(skillName);
		const skillFile = path.join(skillDir, 'SKILL.md');

		fs.writeFileSync(skillFile, content, 'utf8');
	}

	/**
	 * Create skill with complete workflow
	 *
	 * DESIGN DECISION: End-to-end skill creation
	 * WHY: Single entry point for skill creation
	 *
	 * WORKFLOW:
	 * 1. Validate input
	 * 2. Check skill name uniqueness
	 * 3. Load template
	 * 4. Replace placeholders
	 * 5. Create directory
	 * 6. Write SKILL.md
	 * 7. Rollback on error
	 */
	async createSkill(input: SkillInput): Promise<SkillCreationResult> {
		try {
			// Step 1: Validate input
			const validation = this.validateInput(input);
			if (!validation.valid) {
				return {
					success: false,
					error: `Validation failed: ${validation.errors.join(', ')} are required`
				};
			}

			// Step 2: Check skill name uniqueness
			const isUnique = await this.isSkillNameUnique(input.name);
			if (!isUnique) {
				return {
					success: false,
					error: `Skill '${input.name}' already exists`
				};
			}

			// Step 3: Load template
			const template = await this.loadTemplate();

			// Step 4: Replace placeholders
			const content = this.replacePlaceholders(template, input);

			// Step 5: Create directory
			await this.ensureSkillDirectory(input.name);

			// Step 6: Write SKILL.md
			await this.writeSkillFile(input.name, content);

			// Success
			return {
				success: true,
				skillName: input.name,
				skillPath: this.getSkillPath(input.name)
			};
		} catch (error: any) {
			// Step 7: Rollback on error
			const skillPath = this.getSkillPath(input.name);
			if (fs.existsSync(skillPath)) {
				try {
					fs.rmSync(skillPath, { recursive: true });
				} catch (rollbackError) {
					// Ignore rollback errors
				}
			}

			return {
				success: false,
				error: error.message || 'Unknown error occurred'
			};
		}
	}
}
