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
});
