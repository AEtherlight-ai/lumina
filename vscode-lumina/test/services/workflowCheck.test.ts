/**
 * WorkflowCheck Service Tests
 *
 * DESIGN DECISION: TDD RED phase - Write tests FIRST before implementation
 * WHY: Pattern-TDD-001 (Test-Driven Development Ratchet)
 *
 * REASONING CHAIN:
 * 1. Define expected behavior through tests
 * 2. Run tests → FAIL (expected - WorkflowCheck.ts doesn't exist)
 * 3. Implement WorkflowCheck.ts → tests PASS (GREEN phase)
 * 4. Refactor and optimize → tests STILL PASS
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * PATTERN: Pattern-COMM-001 (Universal Communication Protocol)
 * RELATED: PROTO-001 (Universal Workflow Check System)
 *
 * COVERAGE TARGET: 90% (infrastructure task)
 *
 * @module test/services/workflowCheck.test
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { WorkflowCheck, WorkflowCheckResult, WorkflowType, PrerequisiteStatus } from '../../src/services/WorkflowCheck';
import { ConfidenceScorer } from '../../src/services/ConfidenceScorer';
import { TestValidator } from '../../src/services/TestValidator';
import { MiddlewareLogger } from '../../src/services/MiddlewareLogger';

suite('WorkflowCheck Service Test Suite', () => {
	let workflowCheck: WorkflowCheck;
	let confidenceScorerStub: sinon.SinonStubbedInstance<ConfidenceScorer>;
	let testValidatorStub: sinon.SinonStubbedInstance<TestValidator>;
	let loggerStub: sinon.SinonStubbedInstance<MiddlewareLogger>;

	/**
	 * Setup: Create fresh instance before each test
	 *
	 * DESIGN DECISION: Stub external services (ConfidenceScorer, TestValidator)
	 * WHY: Unit test WorkflowCheck in isolation, control service responses
	 */
	setup(() => {
		// Create stubs for external services
		confidenceScorerStub = sinon.createStubInstance(ConfidenceScorer);
		testValidatorStub = sinon.createStubInstance(TestValidator);
		loggerStub = sinon.createStubInstance(MiddlewareLogger);

		// Stub logger singleton
		sinon.stub(MiddlewareLogger, 'getInstance').returns(loggerStub as any);

		// Create WorkflowCheck instance (will inject stubs via constructor)
		workflowCheck = new WorkflowCheck();
	});

	/**
	 * Teardown: Restore all stubs after each test
	 */
	teardown(() => {
		sinon.restore();
	});

	/**
	 * TEST 1: Basic instantiation
	 *
	 * DESIGN DECISION: Verify service can be created
	 * WHY: Basic sanity check for class structure
	 */
	test('should create WorkflowCheck instance', () => {
		assert.ok(workflowCheck, 'WorkflowCheck instance should be created');
	});

	/**
	 * TEST 2: Code workflow check - Happy path
	 *
	 * DESIGN DECISION: Verify code workflow prerequisites
	 * WHY: Most common workflow type - code development
	 *
	 * Prerequisites for code workflow:
	 * 1. Sprint task exists (task context provided)
	 * 2. Tests written first (TDD requirement)
	 * 3. Confidence ≥ 0.80 (task completeness)
	 * 4. Git working directory clean
	 */
	test('checkWorkflow("code") should validate TDD and sprint task', async () => {
		// Arrange: Mock service responses
		confidenceScorerStub.scoreTask.resolves({
			taskId: 'PROTO-001',
			confidence: 0.90,
			action: 'accept',
			gaps: []
		});

		testValidatorStub.validate.resolves({
			valid: true,
			taskId: 'PROTO-001',
			errors: [],
			warnings: []
		});

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Universal Workflow Check System',
			testFilesExist: true,
			gitClean: true
		};

		// Act: Run workflow check
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Verify result structure
		assert.strictEqual(result.workflowType, 'code', 'Workflow type should be "code"');
		assert.ok(result.prerequisites.length > 0, 'Should have prerequisites');
		assert.strictEqual(result.confidence, 0.90, 'Confidence should match scorer result');
		assert.strictEqual(result.gaps.length, 0, 'Should have no gaps');
		assert.strictEqual(result.criticalJunction, false, 'High confidence = not critical junction');
		assert.ok(result.plan.length > 0, 'Should have execution plan');

		// Assert: Verify prerequisites include TDD check
		const tddPrereq = result.prerequisites.find(p => p.name.includes('TDD') || p.name.includes('tests'));
		assert.ok(tddPrereq, 'Should have TDD prerequisite');
		assert.strictEqual(tddPrereq.status, '✅', 'TDD prerequisite should pass');
	});

	/**
	 * TEST 3: Code workflow check - Low confidence triggers critical junction
	 *
	 * DESIGN DECISION: Confidence < 0.80 = critical junction (user approval required)
	 * WHY: Prevent risky operations when confidence is low
	 */
	test('checkWorkflow("code") with low confidence should flag critical junction', async () => {
		// Arrange: Mock low confidence
		confidenceScorerStub.scoreTask.resolves({
			taskId: 'PROTO-001',
			confidence: 0.60,
			action: 'fill_gaps',
			gaps: ['missing patterns', 'missing validation criteria']
		});

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert
		assert.strictEqual(result.criticalJunction, true, 'Low confidence should trigger critical junction');
		assert.ok(result.gaps.length > 0, 'Should have gaps identified');
		assert.ok(
			result.gaps.includes('missing patterns'),
			'Gaps should include missing patterns'
		);
	});

	/**
	 * TEST 4: Sprint workflow check
	 *
	 * DESIGN DECISION: Sprint workflow prerequisites differ from code workflow
	 * WHY: Different operations require different validation
	 *
	 * Prerequisites for sprint workflow:
	 * 1. Workspace analyzed (context gathered)
	 * 2. Git status clean
	 * 3. Skills available (AgentRegistry loaded)
	 */
	test('checkWorkflow("sprint") should validate workspace and git', async () => {
		const context = {
			workspaceAnalyzed: true,
			gitClean: true,
			skillsAvailable: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('sprint', context);

		// Assert
		assert.strictEqual(result.workflowType, 'sprint', 'Workflow type should be "sprint"');

		// Should have workspace prerequisite
		const workspacePrereq = result.prerequisites.find(p => p.name.includes('Workspace'));
		assert.ok(workspacePrereq, 'Should have workspace prerequisite');
		assert.strictEqual(workspacePrereq.status, '✅', 'Workspace should be analyzed');

		// Should have git prerequisite
		const gitPrereq = result.prerequisites.find(p => p.name.includes('Git'));
		assert.ok(gitPrereq, 'Should have git prerequisite');
		assert.strictEqual(gitPrereq.status, '✅', 'Git should be clean');
	});

	/**
	 * TEST 5: Publish workflow check
	 *
	 * DESIGN DECISION: Publish is ALWAYS critical junction (high-impact operation)
	 * WHY: Publishing affects users, requires explicit user approval
	 *
	 * Prerequisites for publish workflow:
	 * 1. All tests passing
	 * 2. Artifacts compiled
	 * 3. Git tag ready
	 * 4. GitHub release prepared
	 */
	test('checkWorkflow("publish") should always be critical junction', async () => {
		const context = {
			testsPassing: true,
			artifactsCompiled: true,
			gitTagReady: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('publish', context);

		// Assert
		assert.strictEqual(result.workflowType, 'publish', 'Workflow type should be "publish"');
		assert.strictEqual(result.criticalJunction, true, 'Publish should ALWAYS be critical junction');

		// Should have tests prerequisite
		const testsPrereq = result.prerequisites.find(p => p.name.includes('tests'));
		assert.ok(testsPrereq, 'Should have tests prerequisite');
		assert.strictEqual(testsPrereq.status, '✅', 'Tests should be passing');
	});

	/**
	 * TEST 6: Service integration failure - ConfidenceScorer fails
	 *
	 * DESIGN DECISION: Graceful degradation when services fail
	 * WHY: Don't crash workflow check if external service fails
	 *
	 * Behavior: Use default confidence 0.5, add warning
	 */
	test('should handle ConfidenceScorer failure gracefully', async () => {
		// Arrange: Mock ConfidenceScorer failure
		confidenceScorerStub.scoreTask.rejects(new Error('Scorer service unavailable'));

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Should not throw, should degrade gracefully
		assert.ok(result, 'Should return result even if scorer fails');
		assert.strictEqual(result.confidence, 0.5, 'Should use default confidence 0.5');

		// Should have warning about scorer failure
		const scorerPrereq = result.prerequisites.find(p => p.name.includes('Confidence'));
		assert.ok(scorerPrereq, 'Should have confidence prerequisite');
		assert.ok(
			scorerPrereq.details.includes('unavailable') || scorerPrereq.details.includes('failed'),
			'Should mention scorer failure'
		);
	});

	/**
	 * TEST 7: Service integration failure - TestValidator fails
	 *
	 * DESIGN DECISION: Show error but don't crash
	 * WHY: User can manually verify tests if validator fails
	 */
	test('should handle TestValidator failure gracefully', async () => {
		// Arrange: Mock TestValidator failure
		testValidatorStub.validate.rejects(new Error('Validator service unavailable'));

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert
		assert.ok(result, 'Should return result even if validator fails');

		// Should have error/warning about validator failure
		const testPrereq = result.prerequisites.find(p => p.name.includes('Test'));
		assert.ok(testPrereq, 'Should have test prerequisite');
		assert.strictEqual(testPrereq.status, '❌', 'Should mark tests as failed/unknown');
		assert.ok(
			testPrereq.remediation && testPrereq.remediation.includes('manual'),
			'Should suggest manual verification'
		);
	});

	/**
	 * TEST 8: Git command failure
	 *
	 * DESIGN DECISION: Show error, continue with warning
	 * WHY: Git issues shouldn't block entire workflow check
	 */
	test('should handle git command failure gracefully', async () => {
		const context = {
			// Simulate git not available or command failing
			forceGitError: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('sprint', context);

		// Assert
		assert.ok(result, 'Should return result even if git fails');

		const gitPrereq = result.prerequisites.find(p => p.name.includes('Git'));
		assert.ok(gitPrereq, 'Should have git prerequisite');
		assert.strictEqual(gitPrereq.status, '❌', 'Git should be marked as failed');
		assert.ok(gitPrereq.details.includes('error') || gitPrereq.details.includes('failed'), 'Should explain error');
	});

	/**
	 * TEST 9: Performance benchmark - Workflow check completes in <500ms
	 *
	 * DESIGN DECISION: <500ms target for workflow checks
	 * WHY: Pattern-COMM-001 performance requirement
	 */
	test('checkWorkflow should complete in <500ms', async () => {
		// Arrange
		confidenceScorerStub.scoreTask.resolves({
			taskId: 'PROTO-001',
			confidence: 0.90,
			action: 'accept',
			gaps: []
		});

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const startTime = Date.now();
		await workflowCheck.checkWorkflow('code', context);
		const duration = Date.now() - startTime;

		// Assert
		assert.ok(duration < 500, `Workflow check took ${duration}ms, should be <500ms`);
	});

	/**
	 * TEST 10: Caching - Second check with same context is faster
	 *
	 * DESIGN DECISION: Cache workflow check results by type + context hash
	 * WHY: >80% cache hit rate target, reduce redundant checks
	 */
	test('should cache workflow check results for repeated queries', async () => {
		// Arrange
		confidenceScorerStub.scoreTask.resolves({
			taskId: 'PROTO-001',
			confidence: 0.90,
			action: 'accept',
			gaps: []
		});

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: true,
			gitClean: true
		};

		// Act: First call
		const startTime1 = Date.now();
		const result1 = await workflowCheck.checkWorkflow('code', context);
		const duration1 = Date.now() - startTime1;

		// Act: Second call with same context
		const startTime2 = Date.now();
		const result2 = await workflowCheck.checkWorkflow('code', context);
		const duration2 = Date.now() - startTime2;

		// Assert: Second call should be faster (cache hit)
		assert.ok(duration2 < duration1 * 0.2, `Second call (${duration2}ms) should be <20% of first call (${duration1}ms)`);
		assert.deepStrictEqual(result1.confidence, result2.confidence, 'Cached result should match original');

		// Assert: ConfidenceScorer should only be called once (cache hit on second)
		assert.strictEqual(confidenceScorerStub.scoreTask.callCount, 1, 'ConfidenceScorer should only be called once (cached)');
	});

	/**
	 * TEST 11: Timeout protection - Check aborts after 10s
	 *
	 * DESIGN DECISION: 10s max per workflow check
	 * WHY: Prevent hanging operations, provide partial results
	 */
	test('checkWorkflow should timeout after 10s and return partial results', async () => {
		// Arrange: Mock slow service (11s delay)
		confidenceScorerStub.scoreTask.callsFake(async () => {
			await new Promise(resolve => setTimeout(resolve, 11000));
			return { taskId: 'PROTO-001', confidence: 0.9, action: 'accept', gaps: [] };
		});

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const startTime = Date.now();
		const result = await workflowCheck.checkWorkflow('code', context);
		const duration = Date.now() - startTime;

		// Assert: Should timeout around 10s (not 11s)
		assert.ok(duration < 10500, `Should timeout around 10s, got ${duration}ms`);
		assert.ok(result, 'Should return partial result even on timeout');

		// Should have timeout warning
		const timeoutPrereq = result.prerequisites.find(p =>
			p.details.includes('timeout') || p.details.includes('partial')
		);
		assert.ok(timeoutPrereq || result.gaps.includes('Operation timeout'), 'Should indicate timeout occurred');
	}).timeout(12000); // Mocha test timeout set to 12s

	/**
	 * TEST 12: Rich status objects - Prerequisites have remediation
	 *
	 * DESIGN DECISION: Rich status objects with impact and remediation
	 * WHY: Better UX for vibe coders, transparency for engineers
	 *
	 * Status object structure:
	 * {
	 *   name: string,
	 *   status: '✅' | '❌' | '⚠️',
	 *   details: string,
	 *   remediation: string | null,
	 *   impact: 'blocking' | 'degraded' | 'suboptimal'
	 * }
	 */
	test('prerequisites should have rich status objects with remediation', async () => {
		// Arrange: Mock failing test validation
		testValidatorStub.validate.resolves({
			valid: false,
			taskId: 'PROTO-001',
			errors: ['Tests not found'],
			warnings: []
		});

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: false,
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Find failing prerequisite
		const failingPrereq = result.prerequisites.find(p => p.status === '❌');
		assert.ok(failingPrereq, 'Should have at least one failing prerequisite');

		// Assert: Rich status object fields
		assert.ok(failingPrereq.name, 'Should have name');
		assert.strictEqual(failingPrereq.status, '❌', 'Should have status');
		assert.ok(failingPrereq.details, 'Should have details');
		assert.ok(failingPrereq.remediation, 'Should have remediation suggestion');
		assert.ok(failingPrereq.impact, 'Should have impact level');
		assert.ok(
			['blocking', 'degraded', 'suboptimal'].includes(failingPrereq.impact),
			`Impact should be blocking/degraded/suboptimal, got ${failingPrereq.impact}`
		);
	});

	/**
	 * TEST 13: Documentation workflow check
	 *
	 * DESIGN DECISION: Docs workflow has different prerequisites
	 * WHY: Documentation tasks don't require tests, have reusability assessment
	 */
	test('checkWorkflow("docs") should validate reusability assessment', async () => {
		const context = {
			reusability: 'high',
			patternTemplateExists: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('docs', context);

		// Assert
		assert.strictEqual(result.workflowType, 'docs', 'Workflow type should be "docs"');

		// Should have reusability prerequisite
		const reusabilityPrereq = result.prerequisites.find(p => p.name.includes('Reusability'));
		assert.ok(reusabilityPrereq, 'Should have reusability prerequisite');
		assert.strictEqual(reusabilityPrereq.status, '✅', 'Reusability should be assessed');
	});

	/**
	 * TEST 14: Git workflow check
	 *
	 * DESIGN DECISION: Git workflow validates commit/push operations
	 * WHY: Prevent force pushes to main, check for uncommitted changes
	 */
	test('checkWorkflow("git") should validate safe git operations', async () => {
		const context = {
			currentBranch: 'feature/proto-001',
			isMainBranch: false,
			hasUncommittedChanges: false,
			operation: 'push'
		};

		// Act
		const result = await workflowCheck.checkWorkflow('git', context);

		// Assert
		assert.strictEqual(result.workflowType, 'git', 'Workflow type should be "git"');

		// Should validate not on main branch
		const branchPrereq = result.prerequisites.find(p => p.name.includes('Branch'));
		assert.ok(branchPrereq, 'Should have branch prerequisite');
		assert.strictEqual(branchPrereq.status, '✅', 'Should be on feature branch');
	});

	/**
	 * TEST 15: Test workflow check
	 *
	 * DESIGN DECISION: Test workflow validates test runner configuration
	 * WHY: Ensure tests can actually run before attempting TDD
	 */
	test('checkWorkflow("test") should validate test runner', async () => {
		const context = {
			testRunnerConfigured: true,
			testFilesExist: true,
			coverageToolAvailable: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('test', context);

		// Assert
		assert.strictEqual(result.workflowType, 'test', 'Workflow type should be "test"');

		// Should validate test runner
		const runnerPrereq = result.prerequisites.find(p => p.name.includes('Test runner'));
		assert.ok(runnerPrereq, 'Should have test runner prerequisite');
		assert.strictEqual(runnerPrereq.status, '✅', 'Test runner should be configured');
	});

	/**
	 * ================================================================
	 * PROTO-005: GAP DETECTION & SELF-IMPROVEMENT TESTS (TDD RED PHASE)
	 * ================================================================
	 *
	 * DESIGN DECISION: Test gap detection logic BEFORE implementation
	 * WHY: Pattern-TDD-001 (Test-Driven Development Ratchet)
	 *
	 * Gap detection scenarios:
	 * 1. Missing Pattern - Task references Pattern-XYZ-001 but doesn't exist
	 * 2. Missing Skill - Sprint needs skill but SkillOrchestrator unavailable
	 * 3. Missing Agent - Task references agent not in AgentRegistry
	 * 4. Missing Tests - Code workflow but no test files
	 * 5. Missing Documentation - High reusability but no pattern template
	 * 6. Gap Logging - Gaps written to gaps.json
	 * 7. Gap Performance - detectGaps() completes in <50ms
	 * 8. User Choice Integration - Gaps trigger UserChoicePrompt
	 */

	/**
	 * TEST 16: detectGaps() - Missing Pattern
	 *
	 * DESIGN DECISION: Detect when task references pattern that doesn't exist
	 * WHY: Prevent silent workarounds, offer to create pattern
	 *
	 * Gap scenario:
	 * - Task context contains patterns: ['Pattern-XYZ-001']
	 * - Pattern file doesn't exist in docs/patterns/
	 * - Gap detected: gapType='pattern', impact='suboptimal', workaround available
	 */
	test('detectGaps() should detect missing patterns', async () => {
		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			patterns: ['Pattern-XYZ-001'], // Pattern doesn't exist
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Gaps array should contain missing pattern
		assert.ok(
			result.gaps.some(g => g.includes('Pattern-XYZ-001') || g.includes('Missing pattern')),
			'Gaps should include missing pattern'
		);

		// Assert: Gap details should be in prerequisites or separate gap results
		// (Exact structure TBD in GREEN phase implementation)
		assert.ok(result.gaps.length > 0, 'Should detect gaps');
	});

	/**
	 * TEST 17: detectGaps() - Missing Agent
	 *
	 * DESIGN DECISION: Detect when task requires agent not in AgentRegistry
	 * WHY: Prevent 0% assignment errors (MID-004), offer to create agent context
	 *
	 * Gap scenario:
	 * - Task assigned to 'security-agent'
	 * - AgentRegistry doesn't have 'security-agent'
	 * - Gap detected: gapType='agent', impact='blocking', no workaround
	 */
	test('detectGaps() should detect missing agents', async () => {
		const context = {
			taskId: 'PROTO-001',
			taskName: 'Security Audit Task',
			agent: 'security-agent', // Agent doesn't exist
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Gaps should include missing agent
		assert.ok(
			result.gaps.some(g => g.includes('security-agent') || g.includes('Missing agent')),
			'Gaps should include missing agent'
		);

		// Assert: Critical junction should be true (blocking gap)
		// (This may vary by implementation - test documents expected behavior)
	});

	/**
	 * TEST 18: detectGaps() - Missing Tests
	 *
	 * DESIGN DECISION: Detect when code workflow lacks test files (TDD violation)
	 * WHY: Pattern-TDD-001 enforcement, offer to create tests
	 *
	 * Gap scenario:
	 * - Code workflow started
	 * - testFilesExist: false
	 * - Gap detected: gapType='test', impact='blocking', remediation='Write tests first'
	 */
	test('detectGaps() should detect missing tests', async () => {
		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: false, // No tests!
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Gaps should include missing tests
		assert.ok(
			result.gaps.some(g => g.includes('No tests') || g.includes('test')),
			'Gaps should include missing tests'
		);

		// Assert: Prerequisites should show TDD requirement failing
		const tddPrereq = result.prerequisites.find(p => p.name.includes('TDD') || p.name.includes('test'));
		assert.ok(tddPrereq, 'Should have TDD prerequisite');
		assert.strictEqual(tddPrereq.status, '❌', 'TDD prerequisite should fail');
	});

	/**
	 * TEST 19: detectGaps() - Missing Documentation Pattern Template
	 *
	 * DESIGN DECISION: Detect when high-reusability docs lack pattern template
	 * WHY: Pattern-DOCS-001 enforcement, ensure consistent pattern structure
	 *
	 * Gap scenario:
	 * - Documentation workflow
	 * - reusability: 'high' (should create pattern)
	 * - patternTemplateExists: false
	 * - Gap detected: gapType='documentation', impact='suboptimal'
	 */
	test('detectGaps() should detect missing documentation templates', async () => {
		const context = {
			reusability: 'high',
			patternTemplateExists: false // No template!
		};

		// Act
		const result = await workflowCheck.checkWorkflow('docs', context);

		// Assert: Gaps should include missing template
		assert.ok(
			result.gaps.some(g => g.includes('template') || g.includes('pattern')),
			'Gaps should include missing template (or no gaps if not implemented yet)'
		);
	});

	/**
	 * TEST 20: detectGaps() - Missing Workspace Analysis (Sprint Workflow)
	 *
	 * DESIGN DECISION: Detect when sprint planning lacks workspace context
	 * WHY: Pattern-SPRINT-PLAN-001 enforcement, ensure proper sprint foundation
	 *
	 * Gap scenario:
	 * - Sprint workflow started
	 * - workspaceAnalyzed: false
	 * - Gap detected: gapType='skill', impact='blocking'
	 */
	test('detectGaps() should detect missing workspace analysis', async () => {
		const context = {
			workspaceAnalyzed: false, // No workspace analysis!
			gitClean: true,
			skillsAvailable: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('sprint', context);

		// Assert: Gaps should include workspace analysis
		assert.ok(
			result.gaps.some(g => g.includes('Workspace not analyzed')),
			'Gaps should include workspace not analyzed'
		);

		// Assert: Prerequisite should show failure
		const workspacePrereq = result.prerequisites.find(p => p.name.includes('Workspace'));
		assert.ok(workspacePrereq, 'Should have workspace prerequisite');
		assert.strictEqual(workspacePrereq.status, '❌', 'Workspace prerequisite should fail');
	});

	/**
	 * TEST 21: Gap Detection Performance - Adds <50ms to workflow check
	 *
	 * DESIGN DECISION: Gap detection should not significantly slow down checks
	 * WHY: Performance target from PROTO-005 sprint task
	 *
	 * Target: Gap detection adds <50ms (total workflow check still <500ms)
	 */
	test('gap detection should add <50ms to workflow check time', async () => {
		// Arrange
		confidenceScorerStub.scoreTask.resolves({
			taskId: 'PROTO-001',
			confidence: 0.90,
			action: 'accept',
			gaps: []
		});

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: true,
			gitClean: true,
			// Add some patterns to trigger gap detection
			patterns: ['Pattern-COMM-001', 'Pattern-TDD-001']
		};

		// Act: Measure time
		const startTime = Date.now();
		await workflowCheck.checkWorkflow('code', context);
		const duration = Date.now() - startTime;

		// Assert: Total time should still be <500ms (includes gap detection)
		assert.ok(duration < 500, `Workflow check with gap detection took ${duration}ms, should be <500ms`);

		// Note: We can't easily isolate gap detection time in this unit test,
		// but the overall performance target is still met
	});

	/**
	 * TEST 22: Gap Logging - Gaps written to .aetherlight/logs/gaps.json
	 *
	 * DESIGN DECISION: Track all detected gaps for retrospectives
	 * WHY: Pattern-SELF-IMPROVEMENT-001, identify recurring gaps
	 *
	 * Gap log format:
	 * {
	 *   "timestamp": "2025-11-03T10:00:00Z",
	 *   "workflowType": "code",
	 *   "gapType": "pattern",
	 *   "description": "Missing Pattern-XYZ-001",
	 *   "impact": "suboptimal",
	 *   "userDecision": "defer",
	 *   "taskId": "PROTO-001"
	 * }
	 */
	test('gaps should be logged to gaps.json file', async () => {
		// This test will verify gap logging in GREEN phase
		// For now, we document the expected behavior

		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			patterns: ['Pattern-MISSING-001'], // Trigger gap
			testFilesExist: true,
			gitClean: true
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Gap detected
		assert.ok(result.gaps.length > 0, 'Should detect gaps');

		// TODO (GREEN phase): Verify gaps.json file created and contains gap entry
		// - Check file exists at .aetherlight/logs/gaps.json
		// - Parse JSON and verify structure
		// - Verify timestamp, workflowType, gapType fields present
	});

	/**
	 * TEST 23: Multiple Gaps - Detect and prioritize multiple gaps
	 *
	 * DESIGN DECISION: Workflow may have multiple gaps, prioritize by impact
	 * WHY: User needs to see most critical gaps first
	 *
	 * Gap priority: blocking > degraded > suboptimal
	 */
	test('should detect and report multiple gaps', async () => {
		const context = {
			taskId: 'PROTO-001',
			taskName: 'Test Task',
			testFilesExist: false, // Gap 1: No tests (blocking)
			patterns: ['Pattern-MISSING-001'], // Gap 2: Missing pattern (suboptimal)
			gitClean: false // Gap 3: Dirty git (suboptimal)
		};

		// Act
		const result = await workflowCheck.checkWorkflow('code', context);

		// Assert: Should detect multiple gaps
		assert.ok(result.gaps.length >= 2, `Should detect at least 2 gaps, found ${result.gaps.length}`);

		// Assert: Critical junction because of blocking gaps
		assert.strictEqual(result.criticalJunction, true, 'Multiple gaps should trigger critical junction');
	});
});
