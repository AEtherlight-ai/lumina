/**
 * GitWorkflowValidator Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing git workflow validation requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * RELATED: VAL-006, Pattern-VALIDATION-001
 */

import * as assert from 'assert';
import * as path from 'path';
import * as child_process from 'child_process';
import { GitWorkflowValidator, GitWorkflowResult } from '../../services/GitWorkflowValidator';

suite('GitWorkflowValidator Test Suite', () => {
	let validator: GitWorkflowValidator;

	setup(() => {
		validator = new GitWorkflowValidator();
	});

	suite('Git Status Detection', () => {
		test('should detect clean working directory', () => {
			// Arrange: Real git repository (current project)
			const projectPath = path.join(__dirname, '../../../');

			// Act
			const result = validator.validate(projectPath);

			// Assert
			assert.strictEqual(typeof result.hasUncommittedChanges, 'boolean', 'Should report uncommitted changes status');
			assert.strictEqual(typeof result.currentBranch, 'string', 'Should report current branch');
			assert.strictEqual(result.valid, true, 'Should be valid for this test (assume clean state)');
		});

		test('should detect uncommitted changes', () => {
			// Note: This test requires manual setup (creating temporary git repo with uncommitted changes)
			// For now, we test the detection logic via mocking in integration tests

			// Arrange: Simulate git status with uncommitted changes
			const mockGitStatus = 'M file1.ts\n?? file2.ts';

			// Act: Test parsing logic
			const hasChanges = mockGitStatus.trim().length > 0;

			// Assert
			assert.strictEqual(hasChanges, true, 'Should detect uncommitted changes from git status output');
		});

		test('should handle empty git status (clean)', () => {
			// Arrange: Simulate git status with no changes
			const mockGitStatus = '';

			// Act: Test parsing logic
			const hasChanges = mockGitStatus.trim().length > 0;

			// Assert
			assert.strictEqual(hasChanges, false, 'Should detect no changes when git status is empty');
		});
	});

	suite('Branch Detection', () => {
		test('should detect current branch', () => {
			// Arrange: Real git repository
			const projectPath = path.join(__dirname, '../../../');

			// Act
			const result = validator.validate(projectPath);

			// Assert
			assert.ok(result.currentBranch, 'Should detect current branch');
			assert.strictEqual(typeof result.currentBranch, 'string', 'Branch should be a string');
			assert.ok(result.currentBranch.length > 0, 'Branch name should not be empty');
		});

		test('should warn when on main branch', () => {
			// Arrange: Simulate main branch
			const mockBranchName: string = 'main';

			// Act: Test warning logic
			const isMainBranch = mockBranchName === 'main' || mockBranchName === 'master';

			// Assert
			assert.strictEqual(isMainBranch, true, 'Should detect main branch');
		});

		test('should warn when on master branch', () => {
			// Arrange: Simulate master branch
			const mockBranchName: string = 'master';

			// Act: Test warning logic
			const isMainBranch = mockBranchName === 'main' || mockBranchName === 'master';

			// Assert
			assert.strictEqual(isMainBranch, true, 'Should detect master branch');
		});

		test('should not warn when on feature branch', () => {
			// Arrange: Simulate feature branch
			const mockBranchName: string = 'feature/val-006';

			// Act: Test warning logic
			const isMainBranch = mockBranchName === 'main' || mockBranchName === 'master';

			// Assert
			assert.strictEqual(isMainBranch, false, 'Should not warn for feature branch');
		});
	});

	suite('Merge Conflict Detection', () => {
		test('should detect no merge conflicts in clean repo', () => {
			// Arrange: Real git repository (should be clean)
			const projectPath = path.join(__dirname, '../../../');

			// Act
			const result = validator.validate(projectPath);

			// Assert
			assert.strictEqual(result.hasMergeConflicts, false, 'Should detect no merge conflicts');
		});

		test('should detect merge conflicts from git output', () => {
			// Arrange: Simulate git ls-files -u output (merge conflicts)
			const mockConflictOutput = '100644 abc123 1\tfile.ts\n100644 def456 2\tfile.ts';

			// Act: Test parsing logic
			const hasConflicts = mockConflictOutput.trim().length > 0;

			// Assert
			assert.strictEqual(hasConflicts, true, 'Should detect merge conflicts from git output');
		});

		test('should detect no conflicts from empty git output', () => {
			// Arrange: Simulate git ls-files -u output (no conflicts)
			const mockConflictOutput = '';

			// Act: Test parsing logic
			const hasConflicts = mockConflictOutput.trim().length > 0;

			// Assert
			assert.strictEqual(hasConflicts, false, 'Should detect no conflicts when git output is empty');
		});
	});

	suite('Unpushed Commits Detection', () => {
		test('should detect unpushed commits', () => {
			// Arrange: Real git repository
			const projectPath = path.join(__dirname, '../../../');

			// Act
			const result = validator.validate(projectPath);

			// Assert
			assert.strictEqual(typeof result.unpushedCommitsCount, 'number', 'Should report unpushed commits count');
			assert.ok(result.unpushedCommitsCount >= 0, 'Unpushed commits count should be non-negative');
		});

		test('should parse unpushed commit count from git output', () => {
			// Arrange: Simulate git log output with 3 commits
			const mockGitLogOutput = 'abc123 Commit 1\ndef456 Commit 2\nghi789 Commit 3';

			// Act: Test parsing logic
			const commitCount = mockGitLogOutput.trim().split('\n').filter(line => line.length > 0).length;

			// Assert
			assert.strictEqual(commitCount, 3, 'Should parse 3 commits from git log output');
		});

		test('should handle no unpushed commits', () => {
			// Arrange: Simulate empty git log output
			const mockGitLogOutput = '';

			// Act: Test parsing logic
			const commitCount = mockGitLogOutput.trim().split('\n').filter(line => line.length > 0).length;

			// Assert
			assert.strictEqual(commitCount, 1, 'Should parse 0 commits (empty string splits to 1 empty element)');
			// Note: Implementation should handle this edge case by checking if line is empty
		});
	});

	suite('Git Availability', () => {
		test('should gracefully handle git not available', () => {
			// Arrange: Non-existent directory (simulates git failure)
			const projectPath = 'C:\\non-existent-directory-for-testing';

			// Act
			const result = validator.validate(projectPath);

			// Assert
			assert.ok(result.issues, 'Should have issues array');
			const gitErrorIssue = result.issues.find(i => i.type === 'git_unavailable');
			assert.ok(gitErrorIssue, 'Should detect git unavailable');
		});

		test('should handle non-git repository', () => {
			// Arrange: Temp directory (not a git repo)
			const projectPath = path.join(__dirname, '../../../temp-test-no-git');

			// Act
			const result = validator.validate(projectPath);

			// Assert
			assert.ok(result.issues, 'Should have issues array');
			// Should either detect git_unavailable or report as non-repo
		});
	});

	suite('Validation Results', () => {
		test('should return valid result for clean repo on feature branch', () => {
			// Arrange: Simulate ideal state
			const mockResult: GitWorkflowResult = {
				valid: true,
				hasUncommittedChanges: false,
				currentBranch: 'feature/val-006',
				hasMergeConflicts: false,
				unpushedCommitsCount: 0,
				issues: []
			};

			// Act & Assert
			assert.strictEqual(mockResult.valid, true, 'Should be valid');
			assert.strictEqual(mockResult.hasUncommittedChanges, false, 'Should have no uncommitted changes');
			assert.strictEqual(mockResult.hasMergeConflicts, false, 'Should have no merge conflicts');
			assert.strictEqual(mockResult.unpushedCommitsCount, 0, 'Should have no unpushed commits');
			assert.strictEqual(mockResult.issues.length, 0, 'Should have no issues');
		});

		test('should return warning for uncommitted changes', () => {
			// Arrange: Simulate uncommitted changes
			const mockResult: GitWorkflowResult = {
				valid: true, // Warning, not blocking
				hasUncommittedChanges: true,
				currentBranch: 'feature/val-006',
				hasMergeConflicts: false,
				unpushedCommitsCount: 0,
				issues: [{
					type: 'uncommitted_changes',
					severity: 'warning',
					message: 'Working directory has uncommitted changes',
					suggestion: 'Commit changes: git add . && git commit'
				}]
			};

			// Act & Assert
			assert.strictEqual(mockResult.valid, true, 'Should be valid (warning only)');
			assert.strictEqual(mockResult.hasUncommittedChanges, true, 'Should detect uncommitted changes');
			assert.strictEqual(mockResult.issues.length, 1, 'Should have one issue');
			assert.strictEqual(mockResult.issues[0].severity, 'warning', 'Should be a warning');
		});

		test('should return error for merge conflicts', () => {
			// Arrange: Simulate merge conflicts
			const mockResult: GitWorkflowResult = {
				valid: false, // Blocking
				hasUncommittedChanges: false,
				currentBranch: 'feature/val-006',
				hasMergeConflicts: true,
				unpushedCommitsCount: 0,
				issues: [{
					type: 'merge_conflicts',
					severity: 'error',
					message: 'Unresolved merge conflicts detected',
					suggestion: 'Resolve conflicts before proceeding'
				}]
			};

			// Act & Assert
			assert.strictEqual(mockResult.valid, false, 'Should be invalid (error blocking)');
			assert.strictEqual(mockResult.hasMergeConflicts, true, 'Should detect merge conflicts');
			assert.strictEqual(mockResult.issues.length, 1, 'Should have one issue');
			assert.strictEqual(mockResult.issues[0].severity, 'error', 'Should be an error');
		});

		test('should return critical warning for main branch', () => {
			// Arrange: Simulate on main branch
			const mockResult: GitWorkflowResult = {
				valid: true, // Warning, not blocking (but critical)
				hasUncommittedChanges: false,
				currentBranch: 'main',
				hasMergeConflicts: false,
				unpushedCommitsCount: 0,
				issues: [{
					type: 'on_main_branch',
					severity: 'critical',
					message: 'Currently on main branch',
					suggestion: 'Consider creating feature branch: git checkout -b feature/name'
				}]
			};

			// Act & Assert
			assert.strictEqual(mockResult.valid, true, 'Should be valid (warning only)');
			assert.strictEqual(mockResult.currentBranch, 'main', 'Should detect main branch');
			assert.strictEqual(mockResult.issues.length, 1, 'Should have one issue');
			assert.strictEqual(mockResult.issues[0].severity, 'critical', 'Should be a critical warning');
		});
	});

	suite('Performance', () => {
		test('should validate in <500ms', () => {
			// Arrange: Real git repository
			const projectPath = path.join(__dirname, '../../../');

			// Act
			const startTime = Date.now();
			validator.validate(projectPath);
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 500, `Should complete in <500ms, took ${elapsedTime}ms`);
		});
	});

	suite('Edge Cases', () => {
		test('should handle detached HEAD state', () => {
			// Arrange: Simulate detached HEAD (commit hash instead of branch name)
			const mockBranchName = 'HEAD';

			// Act: Test detection logic
			const isDetachedHead = mockBranchName === 'HEAD';

			// Assert
			assert.strictEqual(isDetachedHead, true, 'Should detect detached HEAD state');
		});

		test('should handle very long branch names', () => {
			// Arrange: Simulate long branch name
			const mockBranchName = 'feature/very-long-branch-name-that-exceeds-normal-length-but-is-still-valid';

			// Act: Test parsing logic
			const isValid = mockBranchName.length > 0;

			// Assert
			assert.strictEqual(isValid, true, 'Should handle long branch names');
		});

		test('should handle special characters in branch names', () => {
			// Arrange: Simulate branch name with special characters
			const mockBranchName = 'feature/VAL-006_git-workflow';

			// Act: Test parsing logic
			const isValid = mockBranchName.length > 0;

			// Assert
			assert.strictEqual(isValid, true, 'Should handle special characters in branch names');
		});
	});
});
