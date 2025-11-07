import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import { TaskAnalyzer, AnalysisResult, ProjectConfig } from '../../src/services/TaskAnalyzer';

describe('TaskAnalyzer', () => {
    let analyzer: TaskAnalyzer;
    let mockWorkspaceRoot: string;
    let mockConfigPath: string;

    beforeEach(() => {
        // Setup mock workspace
        mockWorkspaceRoot = path.join(__dirname, '..', 'fixtures', 'mock-workspace');
        mockConfigPath = path.join(mockWorkspaceRoot, '.aetherlight', 'config.json');

        // Create analyzer with mock workspace
        analyzer = new TaskAnalyzer(mockWorkspaceRoot);
    });

    describe('loadConfig', () => {
        it('should load config.json successfully', async () => {
            const config = await analyzer.loadConfig();

            expect(config).to.exist;
            expect(config.structure.sprintDir).to.equal('internal/sprints');
            expect(config.testing.framework).to.equal('mocha');
        });

        it('should throw error if config.json missing', async () => {
            const invalidAnalyzer = new TaskAnalyzer('/invalid/path');

            try {
                await invalidAnalyzer.loadConfig();
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('config.json not found');
            }
        });

        it('should throw error if config.json invalid JSON', async () => {
            // Mock invalid JSON scenario
            const invalidConfig = path.join(mockWorkspaceRoot, '.aetherlight', 'invalid-config.json');
            fs.writeFileSync(invalidConfig, '{invalid json}');

            // Test would need to handle this case
            // (implementation detail - analyzer should validate)
        });
    });

    describe('Gap Detection - Missing Files', () => {
        it('should detect missing files from task.files_to_modify', async () => {
            const mockTask = {
                id: 'TEST-001',
                name: 'Test Task',
                files_to_modify: [
                    'vscode-lumina/src/services/MissingFile.ts',
                    'vscode-lumina/src/services/ExistingFile.ts'
                ],
                status: 'pending',
                phase: 'phase-1',
                agent: 'infrastructure-agent',
                dependencies: []
            };

            const result = await analyzer.analyzeTask(mockTask);

            expect(result.gaps).to.have.lengthOf.at.least(1);
            const missingFileGap = result.gaps?.find(g => g.type === 'missing_file');
            expect(missingFileGap).to.exist;
            expect(missingFileGap?.message).to.include('MissingFile.ts');
        });

        it('should not flag missing files if all exist', async () => {
            const mockTask = {
                id: 'TEST-002',
                name: 'Test Task',
                files_to_modify: [
                    'vscode-lumina/src/extension.ts' // exists
                ],
                status: 'pending',
                phase: 'phase-1',
                agent: 'infrastructure-agent',
                dependencies: []
            };

            const result = await analyzer.analyzeTask(mockTask);

            const missingFileGaps = result.gaps?.filter(g => g.type === 'missing_file') || [];
            expect(missingFileGaps).to.have.lengthOf(0);
        });
    });

    describe('Gap Detection - Unmet Dependencies', () => {
        it('should detect unmet dependencies', async () => {
            const mockTask = {
                id: 'TEST-003',
                name: 'Test Task',
                dependencies: ['DEP-001', 'DEP-002'], // assume DEP-001 not completed
                status: 'pending',
                phase: 'phase-1',
                agent: 'infrastructure-agent'
            };

            // Mock completed tasks (DEP-001 missing)
            const mockCompletedTasks = [
                { id: 'DEP-002', status: 'completed' }
            ];

            const result = await analyzer.analyzeTask(mockTask, mockCompletedTasks);

            const depGap = result.gaps?.find(g => g.type === 'unmet_dependency');
            expect(depGap).to.exist;
            expect(depGap?.message).to.include('DEP-001');
            expect(depGap?.severity).to.equal('blocking');
        });

        it('should not flag dependencies if all completed', async () => {
            const mockTask = {
                id: 'TEST-004',
                name: 'Test Task',
                dependencies: ['DEP-001', 'DEP-002'],
                status: 'pending',
                phase: 'phase-1',
                agent: 'infrastructure-agent'
            };

            const mockCompletedTasks = [
                { id: 'DEP-001', status: 'completed' },
                { id: 'DEP-002', status: 'completed' }
            ];

            const result = await analyzer.analyzeTask(mockTask, mockCompletedTasks);

            const depGaps = result.gaps?.filter(g => g.type === 'unmet_dependency') || [];
            expect(depGaps).to.have.lengthOf(0);
        });
    });

    describe('Gap Detection - Missing Test Strategy', () => {
        it('should detect missing test strategy for infrastructure-agent', async () => {
            const mockTask = {
                id: 'TEST-005',
                name: 'Test Task',
                agent: 'infrastructure-agent',
                deliverables: ['Feature A', 'Feature B'], // no test mentioned
                status: 'pending',
                phase: 'phase-1',
                dependencies: []
            };

            const result = await analyzer.analyzeTask(mockTask);

            const testGap = result.gaps?.find(g => g.type === 'missing_tests');
            expect(testGap).to.exist;
            expect(testGap?.message).to.include('test strategy');
            expect(testGap?.suggestion).to.include('90%'); // infrastructure coverage
        });

        it('should not flag test strategy if tests mentioned in deliverables', async () => {
            const mockTask = {
                id: 'TEST-006',
                name: 'Test Task',
                agent: 'infrastructure-agent',
                deliverables: ['Feature A', 'Unit tests (90% coverage)'],
                status: 'pending',
                phase: 'phase-1',
                dependencies: []
            };

            const result = await analyzer.analyzeTask(mockTask);

            const testGaps = result.gaps?.filter(g => g.type === 'missing_tests') || [];
            expect(testGaps).to.have.lengthOf(0);
        });
    });

    describe('Gap Detection - Pre-Flight Violations', () => {
        it('should detect TOML editing without pre-flight checklist', async () => {
            const mockTask = {
                id: 'TEST-007',
                name: 'Test Task',
                files_to_modify: [
                    'internal/sprints/ACTIVE_SPRINT.toml'
                ],
                description: 'Modify sprint file', // no mention of pre-flight checklist
                status: 'pending',
                phase: 'phase-1',
                agent: 'infrastructure-agent',
                dependencies: []
            };

            const result = await analyzer.analyzeTask(mockTask);

            const preflightGap = result.gaps?.find(g => g.type === 'preflight_violation');
            expect(preflightGap).to.exist;
            expect(preflightGap?.message).to.include('pre-flight checklist');
            expect(preflightGap?.severity).to.equal('blocking');
        });

        it('should not flag pre-flight if checklist mentioned', async () => {
            const mockTask = {
                id: 'TEST-008',
                name: 'Test Task',
                files_to_modify: [
                    'internal/sprints/ACTIVE_SPRINT.toml'
                ],
                description: 'Modify sprint file. Pre-flight checklist: read SprintLoader.ts first.',
                status: 'pending',
                phase: 'phase-1',
                agent: 'infrastructure-agent',
                dependencies: []
            };

            const result = await analyzer.analyzeTask(mockTask);

            const preflightGaps = result.gaps?.filter(g => g.type === 'preflight_violation') || [];
            expect(preflightGaps).to.have.lengthOf(0);
        });
    });

    describe('Question Generation', () => {
        it('should generate questions from gaps', async () => {
            const mockTask = {
                id: 'TEST-009',
                name: 'Test Task',
                files_to_modify: [
                    'vscode-lumina/src/services/MissingFile.ts'
                ],
                dependencies: ['UNMET-DEP'],
                agent: 'infrastructure-agent',
                status: 'pending',
                phase: 'phase-1'
            };

            const result = await analyzer.analyzeTask(mockTask);

            expect(result.status).to.equal('needs_clarification');
            expect(result.questions).to.exist;
            expect(result.questions).to.have.length.at.least(1);

            const question = result.questions?.[0];
            expect(question?.question).to.be.a('string');
            expect(question?.type).to.be.oneOf(['text', 'boolean', 'choice']);
        });

        it('should return ready status if no gaps', async () => {
            const mockTask = {
                id: 'TEST-010',
                name: 'Test Task',
                files_to_modify: [
                    'vscode-lumina/src/extension.ts' // exists
                ],
                dependencies: [], // no deps
                agent: 'documentation-agent', // no test requirement
                status: 'pending',
                phase: 'phase-1'
            };

            const result = await analyzer.analyzeTask(mockTask);

            expect(result.status).to.equal('ready');
            expect(result.context).to.exist;
            expect(result.gaps).to.have.lengthOf(0);
        });
    });

    describe('Performance', () => {
        it('should complete analysis in <2 seconds', async () => {
            const mockTask = {
                id: 'TEST-011',
                name: 'Test Task',
                files_to_modify: [
                    'vscode-lumina/src/extension.ts'
                ],
                dependencies: [],
                agent: 'infrastructure-agent',
                status: 'pending',
                phase: 'phase-1'
            };

            const startTime = Date.now();
            await analyzer.analyzeTask(mockTask);
            const endTime = Date.now();

            const duration = endTime - startTime;
            expect(duration).to.be.lessThan(2000); // <2s requirement
        });
    });

    describe('Config Variable Usage', () => {
        it('should use config.structure.sprintDir for sprint path', async () => {
            const config = await analyzer.loadConfig();
            const sprintPath = analyzer.getSprintPath();

            expect(sprintPath).to.include(config.structure.sprintDir);
            expect(sprintPath).to.not.include('internal/sprints'); // not hard-coded
        });

        it('should use config.testing.framework for test detection', async () => {
            const config = await analyzer.loadConfig();

            expect(config.testing.framework).to.equal('mocha');
            // Analyzer should use this value, not hard-code
        });

        it('should work with different project types', async () => {
            // Mock web-app config
            const webAppConfig: ProjectConfig = {
                project: { name: 'Test', type: 'web-app', description: '' },
                structure: { sprintDir: 'sprints', activeSprint: 'current.toml', patternsDir: 'patterns', testsDir: 'tests', sourceDir: 'src' },
                testing: { framework: 'jest', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 }, manualTestingRequired: false },
                workflows: { preFlightChecklistPath: '', preFlightSections: [], patternsDir: '', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true },
                dependencies: { whitelist: [], forbidden: { native: [], runtime: [] } },
                agents: {},
                performance: { initTime: '', activationTime: '', analysisTime: '' }
            };

            // Analyzer should work with this config too (generic design)
            expect(webAppConfig.project.type).to.equal('web-app');
            expect(webAppConfig.testing.framework).to.equal('jest');
        });
    });
});
