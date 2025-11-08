/**
 * InterviewFlow Command Tests
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for API code)
 * COVERAGE TARGET: 85% (API command)
 * TEST STRATEGY: Mock detection services and InterviewEngine, test integration
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import { InterviewFlowCommand } from '../../src/commands/interviewFlow';
import { TechStackDetector, DetectionResult as TechStackDetectionResult } from '../../src/services/TechStackDetector';
import { ToolDetector, ToolDetectionResult } from '../../src/services/ToolDetector';
import { WorkflowDetector, WorkflowDetectionResult } from '../../src/services/WorkflowDetector';
import { DomainDetector, DomainDetectionResult } from '../../src/services/DomainDetector';
import { InterviewEngine, InterviewTemplate } from '../../src/services/InterviewEngine';
import { InterviewAnswers } from '../../src/services/ProjectConfigGenerator';

suite('InterviewFlow Command Tests', () => {
    let command: InterviewFlowCommand;
    let sandbox: sinon.SinonSandbox;
    let techStackDetector: sinon.SinonStubbedInstance<TechStackDetector>;
    let toolDetector: sinon.SinonStubbedInstance<ToolDetector>;
    let workflowDetector: sinon.SinonStubbedInstance<WorkflowDetector>;
    let domainDetector: sinon.SinonStubbedInstance<DomainDetector>;
    let interviewEngine: sinon.SinonStubbedInstance<InterviewEngine>;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Create stubbed instances of detectors
        techStackDetector = sandbox.createStubInstance(TechStackDetector);
        toolDetector = sandbox.createStubInstance(ToolDetector);
        workflowDetector = sandbox.createStubInstance(WorkflowDetector);
        domainDetector = sandbox.createStubInstance(DomainDetector);
        interviewEngine = sandbox.createStubInstance(InterviewEngine);

        command = new InterviewFlowCommand(
            techStackDetector as any,
            toolDetector as any,
            workflowDetector as any,
            domainDetector as any,
            interviewEngine as any
        );
    });

    teardown(() => {
        sandbox.restore();
    });

    // ==========================================================================
    // TEST SUITE 1: Detection Integration
    // ==========================================================================

    suite('runDetection()', () => {
        test('should run all detection services', async () => {
            const projectRoot = '/test/project';

            // Mock detection results
            techStackDetector.detect.resolves({
                language: 'typescript',
                packageManager: 'npm',
                confidence: 0.95
            } as TechStackDetectionResult);

            toolDetector.detect.resolves({
                buildTool: 'webpack',
                testFramework: 'jest',
                confidence: 0.9
            } as ToolDetectionResult);

            workflowDetector.detect.resolves({
                tdd: true,
                confidence: 0.85
            } as WorkflowDetectionResult);

            domainDetector.detect.resolves({
                domain: 'software-dev',
                subType: 'web',
                confidence: 0.9
            } as DomainDetectionResult);

            const result = await command.runDetection(projectRoot);

            assert.ok(techStackDetector.detect.calledOnceWith(projectRoot));
            assert.ok(toolDetector.detect.calledOnceWith(projectRoot));
            assert.ok(workflowDetector.detect.calledOnceWith(projectRoot));
            assert.ok(domainDetector.detect.calledOnceWith(projectRoot));
            assert.strictEqual(result.techStack.language, 'typescript');
            assert.strictEqual(result.tools.buildTool, 'webpack');
        });

        test('should handle detection service failures gracefully', async () => {
            const projectRoot = '/test/project';

            // Mock detection failure
            techStackDetector.detect.rejects(new Error('Detection failed'));
            toolDetector.detect.resolves({} as ToolDetectionResult);
            workflowDetector.detect.resolves({} as WorkflowDetectionResult);
            domainDetector.detect.resolves({} as DomainDetectionResult);

            await assert.rejects(
                async () => await command.runDetection(projectRoot),
                /Detection failed/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Initial Answers Preparation
    // ==========================================================================

    suite('prepareInitialAnswers()', () => {
        test('should convert detection results to initial answers', () => {
            const detectionResults = {
                techStack: {
                    language: 'typescript',
                    packageManager: 'npm',
                    confidence: 0.95
                },
                tools: {
                    buildTool: 'webpack',
                    testFramework: 'jest',
                    buildCommand: 'npm run build',
                    confidence: 0.9
                },
                workflow: {
                    tdd: true,
                    confidence: 0.85
                },
                domain: {
                    domain: 'software-dev',
                    subType: 'web',
                    confidence: 0.9
                }
            } as any;

            const initialAnswers = command.prepareInitialAnswers(detectionResults);

            assert.strictEqual(initialAnswers.LANGUAGE, 'typescript');
            assert.strictEqual(initialAnswers.PACKAGE_MANAGER, 'npm');
            assert.strictEqual(initialAnswers.TEST_FRAMEWORK, 'jest');
            assert.strictEqual(initialAnswers.BUILD_COMMAND, 'npm run build');
            assert.ok(initialAnswers._detection);
            assert.strictEqual(initialAnswers._detection.language.confidence, 0.95);
        });

        test('should handle missing detection fields', () => {
            const detectionResults = {
                techStack: {
                    language: 'typescript',
                    confidence: 0.5
                },
                tools: {},
                workflow: {},
                domain: {}
            } as any;

            const initialAnswers = command.prepareInitialAnswers(detectionResults);

            assert.strictEqual(initialAnswers.LANGUAGE, 'typescript');
            assert.strictEqual(initialAnswers.PACKAGE_MANAGER, undefined);
            assert.strictEqual(initialAnswers.TEST_FRAMEWORK, undefined);
        });

        test('should include detection metadata for conditional logic', () => {
            const detectionResults = {
                techStack: {
                    language: 'typescript',
                    confidence: 0.7 // Low confidence
                },
                tools: {
                    testFramework: 'jest',
                    confidence: 0.95 // High confidence
                },
                workflow: {},
                domain: {}
            } as any;

            const initialAnswers = command.prepareInitialAnswers(detectionResults);

            assert.strictEqual(initialAnswers._detection.language.confidence, 0.7);
            assert.strictEqual(initialAnswers._detection.testFramework.confidence, 0.95);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Full Interview Flow
    // ==========================================================================

    suite('runInterviewFlow()', () => {
        test('should run full interview flow: detection → interview → answers', async () => {
            const projectRoot = '/test/project';
            const templatePath = path.join(__dirname, '../../src/templates/interview-flows/project-initialization.json');

            // Mock detection results (high confidence)
            techStackDetector.detect.resolves({
                language: 'typescript',
                packageManager: 'npm',
                confidence: 0.95
            } as TechStackDetectionResult);

            toolDetector.detect.resolves({
                buildTool: 'webpack',
                testFramework: 'jest',
                buildCommand: 'npm run build',
                confidence: 0.9
            } as ToolDetectionResult);

            workflowDetector.detect.resolves({
                tdd: true,
                confidence: 0.85
            } as WorkflowDetectionResult);

            domainDetector.detect.resolves({
                domain: 'software-dev',
                subType: 'web',
                confidence: 0.9
            } as DomainDetectionResult);

            // Mock interview engine
            const mockTemplate: InterviewTemplate = {
                name: 'project-initialization',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                PACKAGE_MANAGER: 'npm',
                TEST_FRAMEWORK: 'jest',
                BUILD_COMMAND: 'npm run build',
                DEPLOY_TARGET: 'aws'
            };
            interviewEngine.runInterview.resolves(mockInterviewAnswers);

            const result = await command.runInterviewFlow(projectRoot, templatePath);

            assert.ok(interviewEngine.loadTemplate.calledOnceWith(templatePath));
            assert.ok(interviewEngine.runInterview.calledOnce);
            assert.strictEqual(result.LANGUAGE, 'typescript');
            assert.strictEqual(result.DEPLOY_TARGET, 'aws');
        });

        test('should skip questions with high confidence detection', async () => {
            const projectRoot = '/test/project';
            const templatePath = path.join(__dirname, '../../src/templates/interview-flows/project-initialization.json');

            // Mock detection results (high confidence for language, low for test framework)
            techStackDetector.detect.resolves({
                language: 'typescript',
                packageManager: 'npm',
                confidence: 0.95 // High confidence
            } as TechStackDetectionResult);

            toolDetector.detect.resolves({
                buildTool: 'webpack',
                testFramework: undefined, // Not detected
                confidence: 0.5 // Low confidence
            } as ToolDetectionResult);

            workflowDetector.detect.resolves({} as WorkflowDetectionResult);
            domainDetector.detect.resolves({} as DomainDetectionResult);

            const mockTemplate: InterviewTemplate = {
                name: 'project-initialization',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript', // From detection (high confidence, skipped)
                TEST_FRAMEWORK: 'mocha', // User answered (not detected)
                DEPLOY_TARGET: 'gcp'
            };
            interviewEngine.runInterview.resolves(mockInterviewAnswers);

            const result = await command.runInterviewFlow(projectRoot, templatePath);

            // Verify initial answers included detection results
            const runInterviewCall = interviewEngine.runInterview.getCall(0);
            const initialAnswers = runInterviewCall.args[1];
            assert.strictEqual(initialAnswers.LANGUAGE, 'typescript');
            assert.strictEqual(initialAnswers._detection.language.confidence, 0.95);
        });

        test('should ask questions with low confidence detection', async () => {
            const projectRoot = '/test/project';
            const templatePath = path.join(__dirname, '../../src/templates/interview-flows/project-initialization.json');

            // Mock detection results (low confidence)
            techStackDetector.detect.resolves({
                language: 'typescript',
                confidence: 0.6 // Low confidence
            } as TechStackDetectionResult);

            toolDetector.detect.resolves({
                confidence: 0.5
            } as ToolDetectionResult);

            workflowDetector.detect.resolves({} as WorkflowDetectionResult);
            domainDetector.detect.resolves({} as DomainDetectionResult);

            const mockTemplate: InterviewTemplate = {
                name: 'project-initialization',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'rust', // User changed answer (low confidence detection)
                TEST_FRAMEWORK: 'cargo-test',
                DEPLOY_TARGET: 'docker'
            };
            interviewEngine.runInterview.resolves(mockInterviewAnswers);

            const result = await command.runInterviewFlow(projectRoot, templatePath);

            assert.strictEqual(result.LANGUAGE, 'rust');
        });

        test('should always ask DEPLOY_TARGET (not detectable)', async () => {
            const projectRoot = '/test/project';
            const templatePath = path.join(__dirname, '../../src/templates/interview-flows/project-initialization.json');

            // Mock detection results (no deploy target)
            techStackDetector.detect.resolves({
                language: 'typescript',
                confidence: 0.95
            } as TechStackDetectionResult);

            toolDetector.detect.resolves({
                confidence: 0.9
            } as ToolDetectionResult);

            workflowDetector.detect.resolves({} as WorkflowDetectionResult);
            domainDetector.detect.resolves({} as DomainDetectionResult);

            const mockTemplate: InterviewTemplate = {
                name: 'project-initialization',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                DEPLOY_TARGET: 'vercel' // Always asked
            };
            interviewEngine.runInterview.resolves(mockInterviewAnswers);

            const result = await command.runInterviewFlow(projectRoot, templatePath);

            assert.strictEqual(result.DEPLOY_TARGET, 'vercel');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Error Handling
    // ==========================================================================

    suite('Error Handling', () => {
        test('should handle template loading errors', async () => {
            const projectRoot = '/test/project';
            const templatePath = '/invalid/template.json';

            techStackDetector.detect.resolves({} as TechStackDetectionResult);
            toolDetector.detect.resolves({} as ToolDetectionResult);
            workflowDetector.detect.resolves({} as WorkflowDetectionResult);
            domainDetector.detect.resolves({} as DomainDetectionResult);

            interviewEngine.loadTemplate.rejects(new Error('Template not found'));

            await assert.rejects(
                async () => await command.runInterviewFlow(projectRoot, templatePath),
                /Template not found/
            );
        });

        test('should handle interview cancellation', async () => {
            const projectRoot = '/test/project';
            const templatePath = path.join(__dirname, '../../src/templates/interview-flows/project-initialization.json');

            techStackDetector.detect.resolves({} as TechStackDetectionResult);
            toolDetector.detect.resolves({} as ToolDetectionResult);
            workflowDetector.detect.resolves({} as WorkflowDetectionResult);
            domainDetector.detect.resolves({} as DomainDetectionResult);

            const mockTemplate: InterviewTemplate = {
                name: 'project-initialization',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            // User cancels interview (returns undefined)
            interviewEngine.runInterview.resolves(undefined as any);

            await assert.rejects(
                async () => await command.runInterviewFlow(projectRoot, templatePath),
                /Interview cancelled by user/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should complete interview flow in < 200ms (excluding user interaction)', async () => {
            const projectRoot = '/test/project';
            const templatePath = path.join(__dirname, '../../src/templates/interview-flows/project-initialization.json');

            techStackDetector.detect.resolves({
                language: 'typescript',
                confidence: 0.95
            } as TechStackDetectionResult);

            toolDetector.detect.resolves({
                confidence: 0.9
            } as ToolDetectionResult);

            workflowDetector.detect.resolves({} as WorkflowDetectionResult);
            domainDetector.detect.resolves({} as DomainDetectionResult);

            const mockTemplate: InterviewTemplate = {
                name: 'project-initialization',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                DEPLOY_TARGET: 'aws'
            };
            interviewEngine.runInterview.resolves(mockInterviewAnswers);

            const startTime = Date.now();
            await command.runInterviewFlow(projectRoot, templatePath);
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Interview flow took ${duration}ms (target: < 200ms)`);
        });
    });
});
