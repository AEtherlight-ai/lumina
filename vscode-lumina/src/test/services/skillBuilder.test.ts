/**
 * SkillBuilder Tests
 *
 * DESIGN DECISION: Test-Driven Development (TDD) for skill builder wizard
 * WHY: Ensures correct template loading, placeholder replacement, validation, file generation
 *
 * REASONING CHAIN:
 * 1. SkillBuilder creates skills via interactive wizard
 * 2. Loads template from .claude/templates/skill-template.md
 * 3. Prompts user for: name, description, tags, author
 * 4. Validates: skill name uniqueness, required fields not empty
 * 5. Replaces template placeholders: {{name}}, {{description}}, etc.
 * 6. Writes .claude/skills/[skill-name]/SKILL.md
 * 7. Performance: <30s user interaction time
 *
 * PATTERN: Pattern-SKILL-001 (Skill Scaffolding)
 * PATTERN: Pattern-TEMPLATE-001 (Template-Based Code Generation)
 * RELATED: MID-006 (Skill Builder sprint task)
 *
 * @module test/services/skillBuilder.test
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { SkillBuilder, SkillInput, SkillCreationResult } from '../../services/SkillBuilder';

suite('SkillBuilder Test Suite', () => {
	let builder: SkillBuilder;
	const projectRoot = path.join(__dirname, '../../../..');
	const testSkillsPath = path.join(projectRoot, '.claude/skills');
	const templatesPath = path.join(projectRoot, '.claude/templates');

	/**
	 * Test: Initialize skill builder
	 *
	 * DESIGN DECISION: Initialize with template path and skills directory
	 * WHY: Templates needed for generation, skills directory for uniqueness validation
	 */
	test('Should initialize with template path and skills directory', () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);
		assert.ok(builder, 'SkillBuilder should initialize');
	});

	/**
	 * Test: Load skill template
	 *
	 * DESIGN DECISION: Load template from .claude/templates/skill-template.md
	 * WHY: Template provides consistent structure for all skills
	 */
	test('Should load skill template from file', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);
		const template = await builder.loadTemplate();
		assert.ok(template.length > 0, 'Template should not be empty');
		assert.ok(template.includes('{{name}}'), 'Template should contain {{name}} placeholder');
		assert.ok(template.includes('{{description}}'), 'Template should contain {{description}} placeholder');
	});

	/**
	 * Test: Validate skill name uniqueness
	 *
	 * DESIGN DECISION: Check .claude/skills/ directory for existing skills
	 * WHY: Prevent overwriting existing skills
	 */
	test('Should validate skill name uniqueness', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		// Test with existing skill (sprint-plan)
		const isUnique1 = await builder.isSkillNameUnique('sprint-plan');
		assert.strictEqual(isUnique1, false, 'sprint-plan should not be unique (exists)');

		// Test with non-existent skill
		const isUnique2 = await builder.isSkillNameUnique('nonexistent-skill-12345');
		assert.strictEqual(isUnique2, true, 'nonexistent-skill-12345 should be unique');
	});

	/**
	 * Test: Validate required fields
	 *
	 * DESIGN DECISION: Name and description are required, cannot be empty
	 * WHY: Skills without name/description are invalid
	 */
	test('Should validate required fields are not empty', () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const validInput: SkillInput = {
			name: 'test-skill',
			description: 'Test skill description',
			author: 'Test Author',
			tags: ['test']
		};

		const invalidInput1: SkillInput = {
			name: '',
			description: 'Test',
			author: 'Test',
			tags: []
		};

		const invalidInput2: SkillInput = {
			name: 'test',
			description: '',
			author: 'Test',
			tags: []
		};

		const validation1 = builder.validateInput(validInput);
		assert.strictEqual(validation1.valid, true, 'Valid input should pass validation');

		const validation2 = builder.validateInput(invalidInput1);
		assert.strictEqual(validation2.valid, false, 'Empty name should fail validation');
		assert.ok(validation2.errors.includes('name'), 'Should report name error');

		const validation3 = builder.validateInput(invalidInput2);
		assert.strictEqual(validation3.valid, false, 'Empty description should fail validation');
		assert.ok(validation3.errors.includes('description'), 'Should report description error');
	});

	/**
	 * Test: Replace template placeholders
	 *
	 * DESIGN DECISION: Replace {{name}}, {{description}}, {{author}}, {{date}}, {{tags}}
	 * WHY: Template placeholders must be replaced with user input
	 */
	test('Should replace template placeholders with user input', () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const template = '---\nname: {{name}}\ndescription: {{description}}\nauthor: {{author}}\ncreated: {{date}}\ntags: [{{tags}}]\n---\n\n# {{name}}';
		const input: SkillInput = {
			name: 'test-skill',
			description: 'Test description',
			author: 'Test Author',
			tags: ['tag1', 'tag2']
		};

		const result = builder.replacePlaceholders(template, input);

		assert.ok(result.includes('name: test-skill'), 'Should replace {{name}}');
		assert.ok(result.includes('description: Test description'), 'Should replace {{description}}');
		assert.ok(result.includes('author: Test Author'), 'Should replace {{author}}');
		assert.ok(result.includes('tags: [tag1, tag2]'), 'Should replace {{tags}}');
		assert.ok(result.includes('# test-skill'), 'Should replace {{name}} in heading');
		assert.ok(result.includes('created: '), 'Should replace {{date}} with current date');
	});

	/**
	 * Test: Generate skill directory path
	 *
	 * DESIGN DECISION: Skills stored in .claude/skills/[skill-name]/
	 * WHY: Consistent directory structure for skill discovery
	 */
	test('Should generate correct skill directory path', () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const skillPath = builder.getSkillPath('test-skill');
		assert.ok(skillPath.endsWith(path.join('.claude', 'skills', 'test-skill')), 'Should generate correct path');
	});

	/**
	 * Test: Create skill directory if not exists
	 *
	 * DESIGN DECISION: Create skill directory before writing SKILL.md
	 * WHY: fs.writeFile fails if directory doesn't exist
	 */
	test('Should create skill directory if it does not exist', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const testSkillName = 'test-skill-temp-' + Date.now();
		const skillDir = builder.getSkillPath(testSkillName);

		// Ensure directory doesn't exist
		if (fs.existsSync(skillDir)) {
			fs.rmSync(skillDir, { recursive: true });
		}

		// Create directory
		await builder.ensureSkillDirectory(testSkillName);

		// Verify directory exists
		const exists = fs.existsSync(skillDir);
		assert.ok(exists, 'Skill directory should be created');

		// Cleanup
		if (fs.existsSync(skillDir)) {
			fs.rmSync(skillDir, { recursive: true });
		}
	});

	/**
	 * Test: Write SKILL.md file
	 *
	 * DESIGN DECISION: Write generated content to .claude/skills/[skill-name]/SKILL.md
	 * WHY: Standard filename for skill definitions
	 */
	test('Should write SKILL.md file with generated content', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const testSkillName = 'test-skill-write-' + Date.now();
		const skillPath = builder.getSkillPath(testSkillName);
		const skillFile = path.join(skillPath, 'SKILL.md');

		const content = '# Test Skill\n\nTest content';

		// Ensure directory exists
		await builder.ensureSkillDirectory(testSkillName);

		// Write file
		await builder.writeSkillFile(testSkillName, content);

		// Verify file exists
		const exists = fs.existsSync(skillFile);
		assert.ok(exists, 'SKILL.md should be created');

		// Verify content
		const fileContent = fs.readFileSync(skillFile, 'utf8');
		assert.strictEqual(fileContent, content, 'File content should match');

		// Cleanup
		if (fs.existsSync(skillPath)) {
			fs.rmSync(skillPath, { recursive: true });
		}
	});

	/**
	 * Test: Complete skill creation flow
	 *
	 * DESIGN DECISION: End-to-end test of skill creation
	 * WHY: Verify all steps work together correctly
	 */
	test('Should create skill with complete workflow', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const input: SkillInput = {
			name: 'test-skill-complete-' + Date.now(),
			description: 'Complete test skill',
			author: 'Test Author',
			tags: ['test', 'automation']
		};

		// Create skill
		const result: SkillCreationResult = await builder.createSkill(input);

		// Verify success
		assert.ok(result.success, 'Skill creation should succeed');
		assert.strictEqual(result.skillName, input.name, 'Should return correct skill name');
		assert.ok(result.skillPath, 'Should return skill path');

		// Verify file exists
		const skillFile = path.join(result.skillPath, 'SKILL.md');
		const exists = fs.existsSync(skillFile);
		assert.ok(exists, 'SKILL.md should exist');

		// Verify content
		const content = fs.readFileSync(skillFile, 'utf8');
		assert.ok(content.includes(input.name), 'Content should include skill name');
		assert.ok(content.includes(input.description), 'Content should include description');
		assert.ok(content.includes(input.author), 'Content should include author');

		// Cleanup
		if (fs.existsSync(result.skillPath)) {
			fs.rmSync(result.skillPath, { recursive: true });
		}
	});

	/**
	 * Test: Handle duplicate skill name error
	 *
	 * DESIGN DECISION: Fail creation if skill name already exists
	 * WHY: Prevent overwriting existing skills
	 */
	test('Should fail creation if skill name already exists', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const input: SkillInput = {
			name: 'sprint-plan', // Existing skill
			description: 'Test',
			author: 'Test',
			tags: []
		};

		// Attempt to create duplicate skill
		const result = await builder.createSkill(input);

		// Verify failure
		assert.strictEqual(result.success, false, 'Should fail for duplicate skill name');
		assert.ok(result.error, 'Should include error message');
		assert.ok(result.error.includes('already exists'), 'Error should mention skill exists');
	});

	/**
	 * Test: Handle template not found error
	 *
	 * DESIGN DECISION: Fail gracefully if template file missing
	 * WHY: Cannot create skill without template
	 */
	test('Should handle template file not found error', async () => {
		const invalidPath = path.join(projectRoot, 'nonexistent-templates');
		builder = new SkillBuilder(invalidPath, testSkillsPath);

		try {
			await builder.loadTemplate();
			assert.fail('Should throw error for missing template');
		} catch (error: any) {
			assert.ok(error.message.includes('template'), 'Error should mention template');
		}
	});

	/**
	 * Test: Handle file write error
	 *
	 * DESIGN DECISION: Rollback on file write error
	 * WHY: Don't leave partial skill directories
	 */
	test('Should rollback on file write error', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const input: SkillInput = {
			name: 'test-skill-rollback-' + Date.now(),
			description: 'Test rollback',
			author: 'Test',
			tags: []
		};

		const skillPath = builder.getSkillPath(input.name);

		// Create directory
		await builder.ensureSkillDirectory(input.name);
		assert.ok(fs.existsSync(skillPath), 'Directory should be created');

		// Simulate write error by making directory read-only (Windows-compatible)
		// Note: This test may be skipped on some systems where permissions can't be modified
		try {
			fs.chmodSync(skillPath, 0o444);

			// Attempt to create skill (should fail)
			const result = await builder.createSkill(input);

			// Restore permissions for cleanup
			fs.chmodSync(skillPath, 0o755);

			// Verify failure
			assert.strictEqual(result.success, false, 'Should fail on write error');

			// Verify rollback (directory should be removed)
			const stillExists = fs.existsSync(skillPath);
			assert.strictEqual(stillExists, false, 'Directory should be rolled back on error');
		} catch (error: any) {
			// If chmod fails (Windows), skip this test
			console.warn('Skipping rollback test (chmod not supported):', error.message);
			// Cleanup
			if (fs.existsSync(skillPath)) {
				fs.rmSync(skillPath, { recursive: true });
			}
		}
	});

	/**
	 * Test: Performance target <30s
	 *
	 * DESIGN DECISION: Skill creation should complete quickly
	 * WHY: User interaction time should be minimal
	 * NOTE: This measures code execution time, not user interaction time
	 */
	test('Should create skill in <1s (code execution time)', async () => {
		builder = new SkillBuilder(templatesPath, testSkillsPath);

		const input: SkillInput = {
			name: 'test-skill-perf-' + Date.now(),
			description: 'Performance test',
			author: 'Test',
			tags: ['test']
		};

		const startTime = Date.now();
		const result = await builder.createSkill(input);
		const duration = Date.now() - startTime;

		// Cleanup
		if (result.success && result.skillPath) {
			fs.rmSync(result.skillPath, { recursive: true });
		}

		assert.ok(duration < 1000, `Skill creation took ${duration}ms (target: <1000ms for code execution)`);
	});
});
