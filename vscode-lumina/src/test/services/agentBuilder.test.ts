/**
 * AgentBuilder Tests
 *
 * DESIGN DECISION: Test-Driven Development (TDD) for agent builder wizard
 * WHY: Ensures correct template loading, placeholder replacement, validation, file generation
 *
 * REASONING CHAIN:
 * 1. AgentBuilder creates agents via interactive wizard
 * 2. Loads template from .claude/templates/agent-context-template.md
 * 3. Prompts user for: name, type, role, responsibilities, expertise, patterns, skills, performance targets, pitfalls
 * 4. Validates: agent name uniqueness, required fields, token budget (<4k recommended, <10k max)
 * 5. Replaces template placeholders: {{name}}, {{type}}, {{role}}, etc.
 * 6. Writes internal/agents/[agent-name]-context.md
 * 7. Adds to AgentRegistry via refresh()
 * 8. Performance: <60s user interaction time
 *
 * PATTERN: Pattern-CONTEXT-003 (Hierarchical Agent Contexts)
 * PATTERN: Pattern-AGENT-001 (Intelligent Agent Assignment)
 * RELATED: MID-007 (Agent Builder sprint task)
 *
 * @module test/services/agentBuilder.test
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { AgentBuilder, AgentInput, AgentCreationResult } from '../../services/AgentBuilder';

suite('AgentBuilder Test Suite', () => {
	let builder: AgentBuilder;
	const projectRoot = path.join(__dirname, '../../../..');
	const testAgentsPath = path.join(projectRoot, 'internal/agents');
	const templatesPath = path.join(projectRoot, '.claude/templates');

	/**
	 * Test: Initialize agent builder
	 *
	 * DESIGN DECISION: Initialize with template path and agents directory
	 * WHY: Templates needed for generation, agents directory for uniqueness validation
	 */
	test('Should initialize with template path and agents directory', () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);
		assert.ok(builder, 'AgentBuilder should initialize');
	});

	/**
	 * Test: Load agent template
	 *
	 * DESIGN DECISION: Load template from .claude/templates/agent-context-template.md
	 * WHY: Template provides consistent Pattern-CONTEXT-003 structure
	 */
	test('Should load agent template from file', async () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);
		const template = await builder.loadTemplate();
		assert.ok(template.length > 0, 'Template should not be empty');
		assert.ok(template.includes('{{name}}'), 'Template should contain {{name}} placeholder');
		assert.ok(template.includes('{{type}}'), 'Template should contain {{type}} placeholder');
		assert.ok(template.includes('{{role}}'), 'Template should contain {{role}} placeholder');
	});

	/**
	 * Test: Validate agent name uniqueness
	 *
	 * DESIGN DECISION: Check internal/agents/ directory for existing agents
	 * WHY: Prevent overwriting existing agents
	 */
	test('Should validate agent name uniqueness', async () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		// Test with existing agent (api-agent)
		const isUnique1 = await builder.isAgentNameUnique('api-agent');
		assert.strictEqual(isUnique1, false, 'api-agent should not be unique (exists)');

		// Test with non-existent agent
		const isUnique2 = await builder.isAgentNameUnique('nonexistent-agent-12345');
		assert.strictEqual(isUnique2, true, 'nonexistent-agent-12345 should be unique');
	});

	/**
	 * Test: Validate required fields
	 *
	 * DESIGN DECISION: Name, type, role are required
	 * WHY: Agents without these fields are invalid
	 */
	test('Should validate required fields are not empty', () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const validInput: AgentInput = {
			name: 'test-agent',
			type: 'Custom',
			role: 'Test agent role',
			responsibilities: ['Test responsibility'],
			expertise: ['Test expertise'],
			patterns: ['Pattern-TEST-001'],
			skills: ['test-skill'],
			performanceTargets: [{ metric: 'Test metric', target: '<1s' }],
			pitfalls: [{ title: 'Test pitfall', bad: 'bad code', good: 'good code', explanation: 'why' }]
		};

		const invalidInput1: AgentInput = {
			...validInput,
			name: ''
		};

		const invalidInput2: AgentInput = {
			...validInput,
			type: ''
		};

		const invalidInput3: AgentInput = {
			...validInput,
			role: ''
		};

		const validation1 = builder.validateInput(validInput);
		assert.strictEqual(validation1.valid, true, 'Valid input should pass validation');

		const validation2 = builder.validateInput(invalidInput1);
		assert.strictEqual(validation2.valid, false, 'Empty name should fail validation');

		const validation3 = builder.validateInput(invalidInput2);
		assert.strictEqual(validation3.valid, false, 'Empty type should fail validation');

		const validation4 = builder.validateInput(invalidInput3);
		assert.strictEqual(validation4.valid, false, 'Empty role should fail validation');
	});

	/**
	 * Test: Estimate token budget
	 *
	 * DESIGN DECISION: Estimate tokens based on content length
	 * WHY: Pattern-CONTEXT-003 requires <4k tokens recommended, <10k max
	 */
	test('Should estimate token budget for agent content', () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const smallAgent: AgentInput = {
			name: 'small-agent',
			type: 'API',
			role: 'Simple role',
			responsibilities: ['One task'],
			expertise: ['One skill'],
			patterns: ['Pattern-API-001'],
			skills: ['code-analyze'],
			performanceTargets: [{ metric: 'Speed', target: '<1s' }],
			pitfalls: [{ title: 'Error', bad: 'bad', good: 'good', explanation: 'why' }]
		};

		const largeAgent: AgentInput = {
			name: 'large-agent',
			type: 'Custom',
			role: 'Very complex role with many responsibilities and detailed description',
			responsibilities: Array(20).fill('Complex responsibility with detailed explanation'),
			expertise: Array(20).fill('Expert knowledge in specific domain'),
			patterns: Array(10).fill('Pattern-COMPLEX-001'),
			skills: Array(10).fill('complex-skill'),
			performanceTargets: Array(5).fill({ metric: 'Performance metric', target: '<100ms' }),
			pitfalls: Array(10).fill({ title: 'Complex pitfall', bad: 'bad code example with explanation', good: 'good code example with explanation', explanation: 'detailed explanation of why this is better' })
		};

		const smallTokens = builder.estimateTokens(smallAgent);
		const largeTokens = builder.estimateTokens(largeAgent);

		assert.ok(smallTokens > 0, 'Should estimate tokens for small agent');
		assert.ok(largeTokens > smallTokens, 'Large agent should have more tokens than small agent');
		assert.ok(smallTokens < 4000, 'Small agent should be under 4k tokens');
	});

	/**
	 * Test: Validate token budget
	 *
	 * DESIGN DECISION: Warn if >4k, error if >10k
	 * WHY: Pattern-CONTEXT-003 optimization target
	 */
	test('Should validate token budget (warn >4k, error >10k)', () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const validation1 = builder.validateTokenBudget(2000);
		assert.strictEqual(validation1.valid, true, '2000 tokens should be valid');
		assert.strictEqual(validation1.warning, false, '2000 tokens should not warn');

		const validation2 = builder.validateTokenBudget(5000);
		assert.strictEqual(validation2.valid, true, '5000 tokens should be valid');
		assert.strictEqual(validation2.warning, true, '5000 tokens should warn');

		const validation3 = builder.validateTokenBudget(11000);
		assert.strictEqual(validation3.valid, false, '11000 tokens should be invalid');
	});

	/**
	 * Test: Replace template placeholders
	 *
	 * DESIGN DECISION: Replace all agent-specific placeholders
	 * WHY: Template placeholders must be replaced with user input
	 */
	test('Should replace template placeholders with user input', () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const template = '# {{name}} Context\n\n**AGENT TYPE:** {{type}}\n\n## Your Role\n{{role}}';
		const input: AgentInput = {
			name: 'Test Agent',
			type: 'API',
			role: 'Test role description',
			responsibilities: ['Test'],
			expertise: ['Test'],
			patterns: ['Pattern-TEST-001'],
			skills: ['test-skill'],
			performanceTargets: [{ metric: 'Speed', target: '<1s' }],
			pitfalls: [{ title: 'Error', bad: 'bad', good: 'good', explanation: 'why' }]
		};

		const result = builder.replacePlaceholders(template, input);

		assert.ok(result.includes('# Test Agent Context'), 'Should replace {{name}}');
		assert.ok(result.includes('**AGENT TYPE:** API'), 'Should replace {{type}}');
		assert.ok(result.includes('Test role description'), 'Should replace {{role}}');
	});

	/**
	 * Test: Generate agent file path
	 *
	 * DESIGN DECISION: Agents stored in internal/agents/[agent-name]-context.md
	 * WHY: Consistent naming convention for agent discovery
	 */
	test('Should generate correct agent file path', () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const agentPath = builder.getAgentFilePath('test-agent');
		assert.ok(agentPath.endsWith(path.join('internal', 'agents', 'test-agent-context.md')), 'Should generate correct path');
	});

	/**
	 * Test: Write agent context file
	 *
	 * DESIGN DECISION: Write to internal/agents/[agent-name]-context.md
	 * WHY: Standard location for agent definitions
	 */
	test('Should write agent context file with generated content', async () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const testAgentName = 'test-agent-write-' + Date.now();
		const agentFile = builder.getAgentFilePath(testAgentName);

		const content = '# Test Agent Context\n\nTest content';

		// Write file
		await builder.writeAgentFile(testAgentName, content);

		// Verify file exists
		const exists = fs.existsSync(agentFile);
		assert.ok(exists, 'Agent context file should be created');

		// Verify content
		const fileContent = fs.readFileSync(agentFile, 'utf8');
		assert.strictEqual(fileContent, content, 'File content should match');

		// Cleanup
		if (fs.existsSync(agentFile)) {
			fs.rmSync(agentFile);
		}
	});

	/**
	 * Test: Complete agent creation flow
	 *
	 * DESIGN DECISION: End-to-end test of agent creation
	 * WHY: Verify all steps work together correctly
	 */
	test('Should create agent with complete workflow', async () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const input: AgentInput = {
			name: 'test-agent-complete-' + Date.now(),
			type: 'API',
			role: 'Complete test agent',
			responsibilities: ['Test responsibility 1', 'Test responsibility 2'],
			expertise: ['Test expertise'],
			patterns: ['Pattern-TEST-001'],
			skills: ['test-skill', 'another-skill'],
			performanceTargets: [{ metric: 'Latency', target: '<50ms' }],
			pitfalls: [{ title: 'No validation', bad: 'missing validation', good: 'with validation', explanation: 'Always validate input' }]
		};

		// Create agent
		const result: AgentCreationResult = await builder.createAgent(input);

		// Verify success
		assert.ok(result.success, 'Agent creation should succeed');
		assert.strictEqual(result.agentName, input.name, 'Should return correct agent name');
		assert.ok(result.agentFilePath, 'Should return agent file path');
		assert.ok(result.tokenBudget !== undefined, 'Should return token budget');

		// Verify file exists
		const exists = fs.existsSync(result.agentFilePath!);
		assert.ok(exists, 'Agent context file should exist');

		// Verify content
		const content = fs.readFileSync(result.agentFilePath!, 'utf8');
		assert.ok(content.includes(input.name), 'Content should include agent name');
		assert.ok(content.includes(input.type), 'Content should include agent type');
		assert.ok(content.includes(input.role), 'Content should include role');

		// Cleanup
		if (fs.existsSync(result.agentFilePath!)) {
			fs.rmSync(result.agentFilePath!);
		}
	});

	/**
	 * Test: Handle duplicate agent name error
	 *
	 * DESIGN DECISION: Fail creation if agent name already exists
	 * WHY: Prevent overwriting existing agents
	 */
	test('Should fail creation if agent name already exists', async () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const input: AgentInput = {
			name: 'api-agent', // Existing agent
			type: 'API',
			role: 'Test',
			responsibilities: ['Test'],
			expertise: ['Test'],
			patterns: ['Pattern-TEST-001'],
			skills: ['test'],
			performanceTargets: [{ metric: 'Speed', target: '<1s' }],
			pitfalls: [{ title: 'Error', bad: 'bad', good: 'good', explanation: 'why' }]
		};

		// Attempt to create duplicate agent
		const result = await builder.createAgent(input);

		// Verify failure
		assert.strictEqual(result.success, false, 'Should fail for duplicate agent name');
		assert.ok(result.error, 'Should include error message');
		assert.ok(result.error.includes('already exists'), 'Error should mention agent exists');
	});

	/**
	 * Test: Handle template not found error
	 *
	 * DESIGN DECISION: Fail gracefully if template file missing
	 * WHY: Cannot create agent without template
	 */
	test('Should handle template file not found error', async () => {
		const invalidPath = path.join(projectRoot, 'nonexistent-templates');
		builder = new AgentBuilder(invalidPath, testAgentsPath);

		try {
			await builder.loadTemplate();
			assert.fail('Should throw error for missing template');
		} catch (error: any) {
			assert.ok(error.message.includes('template'), 'Error should mention template');
		}
	});

	/**
	 * Test: Handle token budget exceeded error
	 *
	 * DESIGN DECISION: Fail if token budget >10k
	 * WHY: Pattern-CONTEXT-003 constraint
	 */
	test('Should fail creation if token budget exceeds 10k', async () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const input: AgentInput = {
			name: 'huge-agent-' + Date.now(),
			type: 'Custom',
			role: 'Extremely detailed role description'.repeat(100),
			responsibilities: Array(100).fill('Very detailed responsibility description'),
			expertise: Array(100).fill('Extensive expertise in specific domain'),
			patterns: Array(50).fill('Pattern-COMPLEX-001'),
			skills: Array(50).fill('complex-skill'),
			performanceTargets: Array(20).fill({ metric: 'Metric', target: '<100ms' }),
			pitfalls: Array(50).fill({ title: 'Pitfall', bad: 'bad code example'.repeat(10), good: 'good code example'.repeat(10), explanation: 'detailed explanation'.repeat(10) })
		};

		// Attempt to create oversized agent
		const result = await builder.createAgent(input);

		// Verify failure
		assert.strictEqual(result.success, false, 'Should fail for token budget >10k');
		assert.ok(result.error, 'Should include error message');
		assert.ok(result.error.includes('token') || result.error.includes('budget'), 'Error should mention token budget');
	});

	/**
	 * Test: Performance target <1s
	 *
	 * DESIGN DECISION: Agent creation should complete quickly
	 * WHY: User interaction time should be minimal (code execution part)
	 * NOTE: This measures code execution time, not user interaction time (60s target)
	 */
	test('Should create agent in <1s (code execution time)', async () => {
		builder = new AgentBuilder(templatesPath, testAgentsPath);

		const input: AgentInput = {
			name: 'test-agent-perf-' + Date.now(),
			type: 'API',
			role: 'Performance test agent',
			responsibilities: ['Test'],
			expertise: ['Test'],
			patterns: ['Pattern-TEST-001'],
			skills: ['test'],
			performanceTargets: [{ metric: 'Speed', target: '<1s' }],
			pitfalls: [{ title: 'Error', bad: 'bad', good: 'good', explanation: 'why' }]
		};

		const startTime = Date.now();
		const result = await builder.createAgent(input);
		const duration = Date.now() - startTime;

		// Cleanup
		if (result.success && result.agentFilePath) {
			fs.rmSync(result.agentFilePath);
		}

		assert.ok(duration < 1000, `Agent creation took ${duration}ms (target: <1000ms for code execution)`);
	});
});
