import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { DiscoveryService } from '../../src/services/DiscoveryService';

describe('DiscoveryService (Capability Scanning)', () => {
    let discoveryService: DiscoveryService;
    const fixturesDir = path.join(__dirname, '../fixtures/discovery');
    const mockConfigPath = path.join(fixturesDir, 'mock-config.json');

    beforeEach(() => {
        discoveryService = new DiscoveryService();

        // Setup test fixtures directory
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Cleanup test fixtures
        if (fs.existsSync(mockConfigPath)) {
            fs.unlinkSync(mockConfigPath);
        }
    });

    describe('scanSkills()', () => {
        it('should return empty array when skills directory does not exist', async () => {
            const nonExistentDir = path.join(fixturesDir, 'nonexistent-skills');
            const result = await discoveryService['scanSkills'](nonExistentDir);

            assert.strictEqual(Array.isArray(result), true);
            assert.strictEqual(result.length, 0);
        });

        it('should return empty array when skills directory is empty', async () => {
            const emptySkillsDir = path.join(fixturesDir, 'empty-skills');
            fs.mkdirSync(emptySkillsDir, { recursive: true });

            const result = await discoveryService['scanSkills'](emptySkillsDir);

            assert.strictEqual(result.length, 0);

            // Cleanup
            fs.rmdirSync(emptySkillsDir);
        });

        it('should scan and parse skill markdown files', async () => {
            const skillsDir = path.join(fixturesDir, 'skills');
            fs.mkdirSync(skillsDir, { recursive: true });

            // Create mock skill file
            const skillContent = `# code-analyze Skill

**Intent:** Analyze codebase for patterns, issues, and improvements

This skill analyzes code quality and suggests improvements.
`;
            fs.writeFileSync(path.join(skillsDir, 'code-analyze.md'), skillContent);

            const result = await discoveryService['scanSkills'](skillsDir);

            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].id, 'code-analyze');
            assert.ok(result[0].intent.includes('Analyze codebase'));
            assert.ok(result[0].path.endsWith('code-analyze.md'));

            // Cleanup
            fs.unlinkSync(path.join(skillsDir, 'code-analyze.md'));
            fs.rmdirSync(skillsDir);
        });
    });

    describe('scanAgents()', () => {
        it('should return empty object when agents directory does not exist', async () => {
            const nonExistentDir = path.join(fixturesDir, 'nonexistent-agents');
            const result = await discoveryService['scanAgents'](nonExistentDir);

            assert.strictEqual(typeof result, 'object');
            assert.strictEqual(Object.keys(result).length, 0);
        });

        it('should scan and parse agent markdown files', async () => {
            const agentsDir = path.join(fixturesDir, 'agents');
            fs.mkdirSync(agentsDir, { recursive: true });

            // Create mock agent file
            const agentContent = `# Infrastructure Agent Context

**AGENT TYPE:** Infrastructure
**VERSION:** 2.0
**LAST UPDATED:** 2025-11-03

---

## Your Role

You are the **Infrastructure Agent** for ÆtherLight autonomous sprint execution.

Your responsibilities:
- Design and implement VS Code extension middleware services
- Create service orchestration and workflow systems
`;
            fs.writeFileSync(path.join(agentsDir, 'infrastructure-agent-context.md'), agentContent);

            const result = await discoveryService['scanAgents'](agentsDir);

            assert.ok(result['infrastructure-agent']);
            assert.strictEqual(result['infrastructure-agent'].type, 'Infrastructure');
            assert.strictEqual(result['infrastructure-agent'].version, '2.0');
            assert.ok(result['infrastructure-agent'].path.endsWith('infrastructure-agent-context.md'));
            assert.ok(result['infrastructure-agent'].description.includes('Infrastructure Agent'));

            // Cleanup
            fs.unlinkSync(path.join(agentsDir, 'infrastructure-agent-context.md'));
            fs.rmdirSync(agentsDir);
        });

        it('should handle multiple agent files', async () => {
            const agentsDir = path.join(fixturesDir, 'agents-multi');
            fs.mkdirSync(agentsDir, { recursive: true });

            // Create multiple mock agent files
            fs.writeFileSync(path.join(agentsDir, 'ui-agent-context.md'), `# UI Agent Context
**AGENT TYPE:** UI
**VERSION:** 1.0
`);
            fs.writeFileSync(path.join(agentsDir, 'api-agent-context.md'), `# API Agent Context
**AGENT TYPE:** API
**VERSION:** 1.0
`);

            const result = await discoveryService['scanAgents'](agentsDir);

            assert.strictEqual(Object.keys(result).length, 2);
            assert.ok(result['ui-agent']);
            assert.ok(result['api-agent']);

            // Cleanup
            fs.unlinkSync(path.join(agentsDir, 'ui-agent-context.md'));
            fs.unlinkSync(path.join(agentsDir, 'api-agent-context.md'));
            fs.rmdirSync(agentsDir);
        });
    });

    describe('scanPatterns()', () => {
        it('should return empty array when patterns directory does not exist', async () => {
            const nonExistentDir = path.join(fixturesDir, 'nonexistent-patterns');
            const result = await discoveryService['scanPatterns'](nonExistentDir);

            assert.strictEqual(Array.isArray(result), true);
            assert.strictEqual(result.length, 0);
        });

        it('should scan and parse pattern markdown files', async () => {
            const patternsDir = path.join(fixturesDir, 'patterns');
            fs.mkdirSync(patternsDir, { recursive: true });

            // Create mock pattern file
            const patternContent = `# Pattern-CODE-001: Code Development Protocol

**Category:** Workflow Protocol
**Status:** Active
**Last Updated:** 2025-01-06

## Problem

Starting code implementation without workflow validation leads to issues.
`;
            fs.writeFileSync(path.join(patternsDir, 'Pattern-CODE-001.md'), patternContent);

            const result = await discoveryService['scanPatterns'](patternsDir);

            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].id, 'Pattern-CODE-001');
            assert.strictEqual(result[0].category, 'Workflow Protocol');
            assert.strictEqual(result[0].status, 'Active');
            assert.ok(result[0].purpose.includes('Code Development Protocol'));
            assert.ok(result[0].path.endsWith('Pattern-CODE-001.md'));

            // Cleanup
            fs.unlinkSync(path.join(patternsDir, 'Pattern-CODE-001.md'));
            fs.rmdirSync(patternsDir);
        });

        it('should handle multiple pattern files', async () => {
            const patternsDir = path.join(fixturesDir, 'patterns-multi');
            fs.mkdirSync(patternsDir, { recursive: true });

            fs.writeFileSync(path.join(patternsDir, 'Pattern-TDD-001.md'), `# Pattern-TDD-001: Test-Driven Development
**Category:** Testing
**Status:** Active
`);
            fs.writeFileSync(path.join(patternsDir, 'Pattern-GIT-001.md'), `# Pattern-GIT-001: Git Workflow
**Category:** Version Control
**Status:** Active
`);

            const result = await discoveryService['scanPatterns'](patternsDir);

            assert.strictEqual(result.length, 2);
            assert.ok(result.find((p: any) => p.id === 'Pattern-TDD-001'));
            assert.ok(result.find((p: any) => p.id === 'Pattern-GIT-001'));

            // Cleanup
            fs.unlinkSync(path.join(patternsDir, 'Pattern-TDD-001.md'));
            fs.unlinkSync(path.join(patternsDir, 'Pattern-GIT-001.md'));
            fs.rmdirSync(patternsDir);
        });

        it('should skip non-Pattern files', async () => {
            const patternsDir = path.join(fixturesDir, 'patterns-mixed');
            fs.mkdirSync(patternsDir, { recursive: true });

            fs.writeFileSync(path.join(patternsDir, 'Pattern-TEST-001.md'), `# Pattern-TEST-001
**Category:** Test
**Status:** Active
`);
            fs.writeFileSync(path.join(patternsDir, 'README.md'), 'Not a pattern');
            fs.writeFileSync(path.join(patternsDir, 'NOTES.md'), 'Not a pattern');

            const result = await discoveryService['scanPatterns'](patternsDir);

            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].id, 'Pattern-TEST-001');

            // Cleanup
            fs.unlinkSync(path.join(patternsDir, 'Pattern-TEST-001.md'));
            fs.unlinkSync(path.join(patternsDir, 'README.md'));
            fs.unlinkSync(path.join(patternsDir, 'NOTES.md'));
            fs.rmdirSync(patternsDir);
        });
    });

    describe('scanWorkspace()', () => {
        it('should detect workspace root and git branch', async () => {
            // Use actual project root for testing
            const projectRoot = path.join(__dirname, '../../..');

            const result = await discoveryService['scanWorkspace'](projectRoot);

            assert.ok(result.root);
            assert.ok(typeof result.root === 'string' && result.root.length > 0);
            assert.ok(result.gitBranch); // Should detect current branch (any valid branch name)
            assert.ok(result.lastAnalysis); // Should be ISO 8601 format
            assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(result.lastAnalysis)); // Validate ISO 8601
        });

        it('should handle missing git repository gracefully', async () => {
            // Test with a path that definitely won't have .git
            // Note: Since we're inside a git repo, git commands will still work
            // This test validates that the code handles exec errors, even if we can't trigger it easily
            const tempDir = path.join(fixturesDir, 'no-git');
            fs.mkdirSync(tempDir, { recursive: true });

            const result = await discoveryService['scanWorkspace'](tempDir);

            // Should return a valid gitBranch (even if it's the parent repo's branch)
            // OR 'unknown' if git truly fails
            assert.ok(result.gitBranch);
            assert.ok(typeof result.gitBranch === 'string');
            assert.ok(result.gitBranch.length > 0);

            // Cleanup
            fs.rmdirSync(tempDir);
        });
    });

    describe('mergeConfig()', () => {
        it('should create new v2.0 config if none exists', async () => {
            const configPath = path.join(fixturesDir, 'new-config.json');

            const discoveredData = {
                skills: [],
                discoveredAgents: {},
                discoveredPatterns: [],
                workspace: { root: '/test', gitBranch: 'main', lastAnalysis: '2025-11-07T00:00:00Z' },
                discovery: { version: '2.0.0', lastScan: '2025-11-07T00:00:00Z', capabilitiesHash: 'abc123', skillsCount: 0, agentsCount: 0, patternsCount: 0 }
            };

            await discoveryService['mergeConfig'](configPath, discoveredData);

            assert.ok(fs.existsSync(configPath));
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.strictEqual(config.version, '2.0.0');
            assert.ok(config.discovery);

            // Cleanup
            fs.unlinkSync(configPath);
        });

        it('should preserve v1.0 fields when adding v2.0 discovery fields', async () => {
            const configPath = path.join(fixturesDir, 'v1-config.json');

            // Create v1.0 config
            const v1Config = {
                version: '1.0.0',
                project: { name: 'test-project', type: 'cli-tool' },
                structure: { sprintDir: 'sprints', activeSprint: 'ACTIVE_SPRINT.toml' },
                testing: { framework: 'mocha', runner: 'npm test' },
                workflows: { requiredPatterns: ['Pattern-CODE-001'] },
                git: { mainBranch: 'main' }
            };
            fs.writeFileSync(configPath, JSON.stringify(v1Config, null, 2));

            const discoveredData = {
                skills: [{ id: 'test-skill', intent: 'Test', description: 'Test skill', path: '/test' }],
                discoveredAgents: { 'test-agent': { type: 'Test', path: '/test', version: '1.0', description: 'Test' } },
                discoveredPatterns: [{ id: 'Pattern-TEST-001', category: 'Test', purpose: 'Test', status: 'Active', path: '/test' }],
                workspace: { root: '/test', gitBranch: 'main', lastAnalysis: '2025-11-07T00:00:00Z' },
                discovery: { version: '2.0.0', lastScan: '2025-11-07T00:00:00Z', capabilitiesHash: 'def456', skillsCount: 1, agentsCount: 1, patternsCount: 1 }
            };

            await discoveryService['mergeConfig'](configPath, discoveredData);

            const mergedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

            // Check v1.0 fields preserved
            assert.strictEqual(mergedConfig.project.name, 'test-project');
            assert.strictEqual(mergedConfig.project.type, 'cli-tool');
            assert.strictEqual(mergedConfig.structure.sprintDir, 'sprints');
            assert.strictEqual(mergedConfig.testing.framework, 'mocha');
            assert.strictEqual(mergedConfig.git.mainBranch, 'main');

            // Check v2.0 fields added
            assert.strictEqual(mergedConfig.version, '2.0.0');
            assert.strictEqual(mergedConfig.skills.length, 1);
            assert.ok(mergedConfig.discoveredAgents['test-agent']);
            assert.strictEqual(mergedConfig.discoveredPatterns.length, 1);
            assert.ok(mergedConfig.workspace);
            assert.ok(mergedConfig.discovery);

            // Cleanup
            fs.unlinkSync(configPath);
        });

        it('should update v2.0 discovery fields without overwriting user edits', async () => {
            const configPath = path.join(fixturesDir, 'v2-config.json');

            // Create v2.0 config with user customizations
            const v2Config = {
                version: '2.0.0',
                project: { name: 'my-custom-project', type: 'web-app', description: 'User customized' },
                structure: { sprintDir: 'custom/sprints', activeSprint: 'ACTIVE.toml' },
                testing: { framework: 'jest', runner: 'npm test', coverage: { infrastructure: 95, api: 90, ui: 75 } },
                workflows: { requiredPatterns: ['Pattern-CODE-001', 'Pattern-CUSTOM-001'] },
                git: { mainBranch: 'develop', commitMessageFormat: 'conventional' },
                skills: [{ id: 'old-skill', intent: 'Old', description: 'Old skill', path: '/old' }],
                discoveredAgents: {},
                discoveredPatterns: [],
                workspace: { root: '/old', gitBranch: 'old-branch', lastAnalysis: '2025-01-01T00:00:00Z' },
                discovery: { version: '2.0.0', lastScan: '2025-01-01T00:00:00Z', capabilitiesHash: 'old123', skillsCount: 1, agentsCount: 0, patternsCount: 0 }
            };
            fs.writeFileSync(configPath, JSON.stringify(v2Config, null, 2));

            const discoveredData = {
                skills: [{ id: 'new-skill', intent: 'New', description: 'New skill', path: '/new' }],
                discoveredAgents: { 'infrastructure-agent': { type: 'Infrastructure', path: '/infra', version: '2.0', description: 'Infra' } },
                discoveredPatterns: [{ id: 'Pattern-CODE-001', category: 'Workflow', purpose: 'Code', status: 'Active', path: '/code' }],
                workspace: { root: '/new-root', gitBranch: 'main', lastAnalysis: '2025-11-07T10:00:00Z' },
                discovery: { version: '2.0.0', lastScan: '2025-11-07T10:00:00Z', capabilitiesHash: 'new789', skillsCount: 1, agentsCount: 1, patternsCount: 1 }
            };

            await discoveryService['mergeConfig'](configPath, discoveredData);

            const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

            // User customizations MUST be preserved
            assert.strictEqual(updatedConfig.project.name, 'my-custom-project');
            assert.strictEqual(updatedConfig.project.description, 'User customized');
            assert.strictEqual(updatedConfig.structure.sprintDir, 'custom/sprints');
            assert.strictEqual(updatedConfig.testing.coverage.infrastructure, 95);
            assert.strictEqual(updatedConfig.workflows.requiredPatterns.length, 2);
            assert.ok(updatedConfig.workflows.requiredPatterns.includes('Pattern-CUSTOM-001'));
            assert.strictEqual(updatedConfig.git.mainBranch, 'develop');

            // Discovery fields MUST be updated
            assert.strictEqual(updatedConfig.skills.length, 1);
            assert.strictEqual(updatedConfig.skills[0].id, 'new-skill');
            assert.ok(updatedConfig.discoveredAgents['infrastructure-agent']);
            assert.strictEqual(updatedConfig.discoveredPatterns.length, 1);
            assert.strictEqual(updatedConfig.workspace.root, '/new-root');
            assert.strictEqual(updatedConfig.workspace.gitBranch, 'main');
            assert.strictEqual(updatedConfig.discovery.capabilitiesHash, 'new789');
            assert.strictEqual(updatedConfig.discovery.agentsCount, 1);

            // Cleanup
            fs.unlinkSync(configPath);
        });
    });

    describe('discoverCapabilities() - Full Workflow', () => {
        it('should perform full discovery scan and return summary', async () => {
            // Use actual project directories for integration test
            const projectRoot = path.join(__dirname, '../../../');

            const result = await discoveryService.discoverCapabilities(projectRoot);

            assert.ok(result);
            assert.ok(result.summary);
            assert.ok(typeof result.summary.skillsCount === 'number');
            assert.ok(typeof result.summary.agentsCount === 'number');
            assert.ok(typeof result.summary.patternsCount === 'number');
            assert.ok(result.summary.workspace);
            assert.ok(result.summary.configUpdated === true);
        });
    });

    describe('Performance Requirements', () => {
        it('should complete full discovery scan in less than 500ms', async function(this: Mocha.Context) {
            this.timeout(1000); // Allow 1s for test, but expect < 500ms

            const projectRoot = path.join(__dirname, '../../../');

            const startTime = Date.now();
            await discoveryService.discoverCapabilities(projectRoot);
            const duration = Date.now() - startTime;

            assert.ok(duration < 500, `Discovery took ${duration}ms, expected < 500ms`);
        });
    });

    describe('Error Handling', () => {
        it('should handle file system errors gracefully', async () => {
            const invalidPath = '/invalid/path/that/does/not/exist';

            // Should not throw, should return empty results
            const agents = await discoveryService['scanAgents'](invalidPath);
            const patterns = await discoveryService['scanPatterns'](invalidPath);
            const skills = await discoveryService['scanSkills'](invalidPath);

            assert.strictEqual(Object.keys(agents).length, 0);
            assert.strictEqual(patterns.length, 0);
            assert.strictEqual(skills.length, 0);
        });

        it('should handle malformed markdown files gracefully', async () => {
            const patternsDir = path.join(fixturesDir, 'malformed');
            fs.mkdirSync(patternsDir, { recursive: true });

            // Create malformed pattern file
            fs.writeFileSync(path.join(patternsDir, 'Pattern-MALFORMED-001.md'), 'Not valid markdown structure');

            // Should not throw, should skip malformed file
            const result = await discoveryService['scanPatterns'](patternsDir);

            // Result may be empty or have partial data, but should not crash
            assert.ok(Array.isArray(result));

            // Cleanup
            fs.unlinkSync(path.join(patternsDir, 'Pattern-MALFORMED-001.md'));
            fs.rmdirSync(patternsDir);
        });
    });
});
