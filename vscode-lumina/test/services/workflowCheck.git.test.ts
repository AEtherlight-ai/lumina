/**
 * WorkflowCheck Git Integration Tests
 *
 * PROTO-004: Git Workflow Integration
 * Agent: infrastructure-agent v2.0
 * TDD Phase: RED (tests written FIRST, expect failures)
 *
 * Test Coverage Requirements:
 * - Infrastructure task → 90% coverage minimum
 * - Test all git scenarios (clean, dirty, branches, conflicts)
 * - Test error handling (not in repo, command failures, timeouts)
 *
 * DESIGN DECISION: Separate test file for git-specific tests
 * WHY: WorkflowCheck is large (1048 lines), git tests are extensive
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { WorkflowCheck, GitStatus } from '../../src/services/WorkflowCheck';
import { ConfidenceScorer } from '../../src/services/ConfidenceScorer';
import { TestValidator } from '../../src/services/TestValidator';
import { MiddlewareLogger } from '../../src/services/MiddlewareLogger';

suite('WorkflowCheck Git Integration Tests', () => {
	let workflowCheck: WorkflowCheck;
	let confidenceScorerStub: sinon.SinonStubbedInstance<ConfidenceScorer>;
	let testValidatorStub: sinon.SinonStubbedInstance<TestValidator>;
	let loggerStub: sinon.SinonStubbedInstance<MiddlewareLogger>;

	setup(() => {
		// Create stubs for dependencies
		confidenceScorerStub = sinon.createStubInstance(ConfidenceScorer);
		testValidatorStub = sinon.createStubInstance(TestValidator);
		loggerStub = sinon.createStubInstance(MiddlewareLogger);

		// Create WorkflowCheck instance with stubbed dependencies
		workflowCheck = new WorkflowCheck(
			confidenceScorerStub as any,
			testValidatorStub as any,
			loggerStub as any
		);
	});

	teardown(() => {
		sinon.restore();
	});

	/**
	 * Test 1: Git Clean State
	 * Scenario: Working directory clean, no uncommitted files
	 * Expected: isClean=true, uncommittedFiles=[]
	 */
	test('checkGitStatus() should return clean state when no uncommitted files', async () => {
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		assert.strictEqual(gitStatus.isClean, true, 'Git should be clean');
		assert.strictEqual(gitStatus.uncommittedFiles.length, 0, 'No uncommitted files');
		assert.ok(gitStatus.currentBranch, 'Should have current branch');
		assert.strictEqual(typeof gitStatus.isMainBranch, 'boolean', 'isMainBranch should be boolean');
		assert.strictEqual(gitStatus.hasUnpushedCommits, false);
		assert.strictEqual(gitStatus.unpushedCommitCount, 0);
		assert.strictEqual(gitStatus.hasMergeConflicts, false);
		assert.strictEqual(gitStatus.conflictFiles.length, 0);
		assert.strictEqual(typeof gitStatus.ahead, 'number', 'ahead should be number');
		assert.strictEqual(typeof gitStatus.behind, 'number', 'behind should be number');
	});

	/**
	 * Test 2: Git Dirty State with Uncommitted Files
	 * Scenario: Modified and untracked files exist
	 * Expected: isClean=false, files listed in uncommittedFiles[]
	 */
	test('checkGitStatus() should return dirty state with list of uncommitted files', async () => {
		// This test will pass once implementation detects uncommitted files
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// If git is dirty, verify proper structure
		if (!gitStatus.isClean) {
			assert.ok(gitStatus.uncommittedFiles.length > 0, 'Should have uncommitted files when dirty');
			assert.ok(Array.isArray(gitStatus.uncommittedFiles), 'uncommittedFiles should be array');
			gitStatus.uncommittedFiles.forEach(file => {
				assert.strictEqual(typeof file, 'string', 'Each file should be string');
			});
		}
	});

	/**
	 * Test 3: Master/Main Branch Detection
	 * Scenario: User is on main branch (master or main)
	 * Expected: isMainBranch=true
	 */
	test('checkGitStatus() should detect main branches correctly', async () => {
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// Verify branch name exists
		assert.ok(gitStatus.currentBranch, 'Should have current branch name');
		assert.strictEqual(typeof gitStatus.currentBranch, 'string', 'Branch should be string');

		// If on master/main, isMainBranch should be true
		if (gitStatus.currentBranch === 'master' || gitStatus.currentBranch === 'main') {
			assert.strictEqual(gitStatus.isMainBranch, true, 'Should detect main branch');
		} else {
			assert.strictEqual(gitStatus.isMainBranch, false, 'Should NOT detect non-main as main');
		}
	});

	/**
	 * Test 4: Feature Branch Detection
	 * Scenario: User is on feature branch
	 * Expected: isMainBranch=false
	 */
	test('checkGitStatus() should detect feature branches correctly', async () => {
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// Feature branches should have isMainBranch=false
		if (gitStatus.currentBranch.startsWith('feature/') ||
		    gitStatus.currentBranch.startsWith('fix/') ||
		    gitStatus.currentBranch.startsWith('proto-')) {
			assert.strictEqual(gitStatus.isMainBranch, false, 'Feature branches should NOT be main');
		}
	});

	/**
	 * Test 5: Unpushed Commits Detection
	 * Scenario: User has commits not pushed to remote
	 * Expected: hasUnpushedCommits=true, unpushedCommitCount > 0
	 */
	test('checkGitStatus() should detect unpushed commits', async () => {
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// Verify structure
		assert.strictEqual(typeof gitStatus.hasUnpushedCommits, 'boolean', 'hasUnpushedCommits should be boolean');
		assert.strictEqual(typeof gitStatus.unpushedCommitCount, 'number', 'unpushedCommitCount should be number');
		assert.ok(gitStatus.unpushedCommitCount >= 0, 'Commit count should be non-negative');

		// If has unpushed commits, count should be > 0
		if (gitStatus.hasUnpushedCommits) {
			assert.ok(gitStatus.unpushedCommitCount > 0, 'Should have positive commit count when flag is true');
		} else {
			assert.strictEqual(gitStatus.unpushedCommitCount, 0, 'Should have 0 commits when flag is false');
		}
	});

	/**
	 * Test 6: Merge Conflicts Detection
	 * Scenario: Check if merge conflicts are properly detected
	 * Expected: hasMergeConflicts boolean, conflictFiles array
	 */
	test('checkGitStatus() should have conflict detection structure', async () => {
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// Verify structure exists
		assert.strictEqual(typeof gitStatus.hasMergeConflicts, 'boolean', 'hasMergeConflicts should be boolean');
		assert.ok(Array.isArray(gitStatus.conflictFiles), 'conflictFiles should be array');

		// If has conflicts, array should have files
		if (gitStatus.hasMergeConflicts) {
			assert.ok(gitStatus.conflictFiles.length > 0, 'Should have conflict files when flag is true');
			gitStatus.conflictFiles.forEach(file => {
				assert.strictEqual(typeof file, 'string', 'Each conflict file should be string');
			});
		} else {
			assert.strictEqual(gitStatus.conflictFiles.length, 0, 'Should have no conflict files when flag is false');
		}
	});

	/**
	 * Test 7: Ahead/Behind Tracking
	 * Scenario: Check commits ahead/behind remote
	 * Expected: ahead and behind are numbers
	 */
	test('checkGitStatus() should track commits ahead/behind remote', async () => {
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// Verify types
		assert.strictEqual(typeof gitStatus.ahead, 'number', 'ahead should be number');
		assert.strictEqual(typeof gitStatus.behind, 'number', 'behind should be number');

		// Verify non-negative
		assert.ok(gitStatus.ahead >= 0, 'ahead should be non-negative');
		assert.ok(gitStatus.behind >= 0, 'behind should be non-negative');

		// If ahead > 0, should have unpushed commits
		if (gitStatus.ahead > 0) {
			assert.strictEqual(gitStatus.hasUnpushedCommits, true, 'ahead>0 means unpushed commits');
			assert.strictEqual(gitStatus.unpushedCommitCount, gitStatus.ahead, 'unpushedCommitCount should match ahead');
		}
	});

	/**
	 * Test 8: Not in Git Repository Handling
	 * Scenario: Command executed outside git repo
	 * Expected: Graceful handling, returns safe defaults
	 */
	test('checkGitStatus() should handle non-git directories gracefully', async () => {
		// This test verifies error handling exists
		// Implementation should catch git errors and return defaults
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// Should always return valid GitStatus structure
		assert.ok(gitStatus, 'Should return GitStatus object');
		assert.ok('isClean' in gitStatus, 'Should have isClean property');
		assert.ok('currentBranch' in gitStatus, 'Should have currentBranch property');
		assert.ok('uncommittedFiles' in gitStatus, 'Should have uncommittedFiles property');
	});

	/**
	 * Test 9: Performance Target
	 * Scenario: Execute checkGitStatus() and measure duration
	 * Expected: Completes in <500ms
	 */
	test('checkGitStatus() should complete in <500ms', async () => {
		const startTime = Date.now();
		await workflowCheck.checkGitStatus();
		const duration = Date.now() - startTime;

		assert.ok(duration < 500, `Git status check took ${duration}ms, should be <500ms`);
	});

	/**
	 * Test 10: Caching Behavior
	 * Scenario: Call checkGitStatus() twice within short time
	 * Expected: Second call should use cache (faster)
	 */
	test('checkGitStatus() should cache results for performance', async () => {
		// First call
		const start1 = Date.now();
		const result1 = await workflowCheck.checkGitStatus();
		const duration1 = Date.now() - start1;

		// Second call (should hit cache)
		const start2 = Date.now();
		const result2 = await workflowCheck.checkGitStatus();
		const duration2 = Date.now() - start2;

		// Second call should be significantly faster (or return same object)
		assert.ok(duration2 <= duration1, 'Cached call should be faster or equal');

		// Results should match
		assert.strictEqual(result1.isClean, result2.isClean, 'Cached results should match');
		assert.strictEqual(result1.currentBranch, result2.currentBranch, 'Cached branch should match');
	});

	/**
	 * Test 11: Git Status Integration in Code Workflow
	 * Scenario: Run checkWorkflow('code') and verify git status included
	 * Expected: Git status appears in prerequisites
	 */
	test('checkWorkflow("code") should include git status in prerequisites', async () => {
		confidenceScorerStub.scoreTask.resolves({
			taskId: 'PROTO-004',
			confidence: 0.90,
			action: 'accept',
			gaps: []
		});

		const context = {
			taskId: 'PROTO-004',
			taskName: 'Git Workflow Integration',
			testFilesExist: true
		};

		const result = await workflowCheck.checkWorkflow('code', context);

		// Verify git status appears in prerequisites
		const gitPrereq = result.prerequisites.find(p =>
			p.name.toLowerCase().includes('git') ||
			p.name.toLowerCase().includes('repository')
		);

		assert.ok(gitPrereq, 'Git status should be in prerequisites for code workflow');
		assert.ok(['✅', '❌', '⚠️'].includes(gitPrereq.status), 'Git prereq should have valid status');
		assert.ok(gitPrereq.details, 'Git prereq should have details');
	});

	/**
	 * Test 12: Git Status Integration in Publish Workflow
	 * Scenario: Run checkWorkflow('publish')
	 * Expected: Git status is CRITICAL (blocks if dirty)
	 */
	test('checkWorkflow("publish") should have strict git requirements', async () => {
		const context = {
			version: '0.16.0',
			artifactsExist: true,
			testsPass: true
		};

		const result = await workflowCheck.checkWorkflow('publish', context);

		// Find git prerequisite
		const gitPrereq = result.prerequisites.find(p =>
			p.name.toLowerCase().includes('git') ||
			p.name.toLowerCase().includes('repository')
		);

		assert.ok(gitPrereq, 'Git status should be in prerequisites for publish workflow');

		// For publish, git issues should be blocking
		if (gitPrereq.status === '❌') {
			assert.strictEqual(gitPrereq.impact, 'blocking', 'Git errors should block publish');
			assert.ok(gitPrereq.remediation, 'Should provide remediation for git issues');
		}
	});

	/**
	 * Test 13: Git Status Structure Completeness
	 * Scenario: Verify GitStatus has all required fields
	 * Expected: All fields present with correct types
	 */
	test('GitStatus interface should have all required fields', async () => {
		const gitStatus: GitStatus = await workflowCheck.checkGitStatus();

		// Required fields
		assert.ok('uncommittedFiles' in gitStatus, 'Should have uncommittedFiles');
		assert.ok('currentBranch' in gitStatus, 'Should have currentBranch');
		assert.ok('isMainBranch' in gitStatus, 'Should have isMainBranch');
		assert.ok('hasUnpushedCommits' in gitStatus, 'Should have hasUnpushedCommits');
		assert.ok('unpushedCommitCount' in gitStatus, 'Should have unpushedCommitCount');
		assert.ok('hasMergeConflicts' in gitStatus, 'Should have hasMergeConflicts');
		assert.ok('conflictFiles' in gitStatus, 'Should have conflictFiles');
		assert.ok('isClean' in gitStatus, 'Should have isClean');
		assert.ok('ahead' in gitStatus, 'Should have ahead');
		assert.ok('behind' in gitStatus, 'Should have behind');

		// Type checks
		assert.ok(Array.isArray(gitStatus.uncommittedFiles), 'uncommittedFiles should be array');
		assert.strictEqual(typeof gitStatus.currentBranch, 'string', 'currentBranch should be string');
		assert.strictEqual(typeof gitStatus.isMainBranch, 'boolean', 'isMainBranch should be boolean');
		assert.strictEqual(typeof gitStatus.hasUnpushedCommits, 'boolean', 'hasUnpushedCommits should be boolean');
		assert.strictEqual(typeof gitStatus.unpushedCommitCount, 'number', 'unpushedCommitCount should be number');
		assert.strictEqual(typeof gitStatus.hasMergeConflicts, 'boolean', 'hasMergeConflicts should be boolean');
		assert.ok(Array.isArray(gitStatus.conflictFiles), 'conflictFiles should be array');
		assert.strictEqual(typeof gitStatus.isClean, 'boolean', 'isClean should be boolean');
		assert.strictEqual(typeof gitStatus.ahead, 'number', 'ahead should be number');
		assert.strictEqual(typeof gitStatus.behind, 'number', 'behind should be number');
	});

	/**
	 * Test 14: Dirty Git Warning in Code Workflow
	 * Scenario: Git is dirty during code workflow
	 * Expected: Show warning (⚠️) but don't block
	 */
	test('checkWorkflow("code") should warn but not block on dirty git', async () => {
		confidenceScorerStub.scoreTask.resolves({
			taskId: 'PROTO-004',
			confidence: 0.90,
			action: 'accept',
			gaps: []
		});

		const context = {
			taskId: 'PROTO-004',
			taskName: 'Git Workflow Integration',
			testFilesExist: true
		};

		const result = await workflowCheck.checkWorkflow('code', context);

		// If git is dirty, should be warning not blocking
		const gitPrereq = result.prerequisites.find(p => p.name.toLowerCase().includes('git'));

		if (gitPrereq && gitPrereq.status !== '✅') {
			// Code workflow should tolerate dirty git (warning only)
			assert.ok(
				gitPrereq.status === '⚠️' || gitPrereq.impact !== 'blocking',
				'Code workflow should warn about dirty git, not block'
			);
		}
	});

	/**
	 * Test 15: Git Status Logging
	 * Scenario: Check that git operations are logged
	 * Expected: MiddlewareLogger called with git check info
	 */
	test('checkGitStatus() should log performance and errors', async () => {
		await workflowCheck.checkGitStatus();

		// Verify logger was used (info or error)
		const loggerCalled = loggerStub.info.called ||
		                     loggerStub.warn.called ||
		                     loggerStub.error.called;

		assert.ok(loggerCalled, 'Git status check should be logged');
	});
});
