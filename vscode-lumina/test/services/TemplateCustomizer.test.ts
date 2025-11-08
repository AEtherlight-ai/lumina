/**
 * TemplateCustomizer Tests
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure code)
 * COVERAGE TARGET: 90% (Infrastructure service)
 * TEST STRATEGY: Test single/batch customization, variable substitution, error handling
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateCustomizer, TemplateCustomizationError } from '../../src/services/TemplateCustomizer';
import { VariableResolver } from '../../src/services/VariableResolver';
import { ProjectConfig } from '../../src/services/ProjectConfig';

suite('TemplateCustomizer Tests', () => {
    let customizer: TemplateCustomizer;
    let variableResolver: sinon.SinonStubbedInstance<VariableResolver>;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-test-'));

        // Create stubbed VariableResolver
        variableResolver = sandbox.createStubInstance(VariableResolver);

        customizer = new TemplateCustomizer(variableResolver as any);
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Single Template Customization
    // ==========================================================================

    suite('customizeTemplate()', () => {
        test('should customize single template with variable substitution', async () => {
            // Create template file
            const templatePath = path.join(tempDir, 'test.template');
            const templateContent = 'Build: {{BUILD_COMMAND}}\nTest: {{TEST_COMMAND}}';
            fs.writeFileSync(templatePath, templateContent, 'utf-8');

            // Mock VariableResolver
            const resolvedContent = 'Build: npm run build\nTest: npm test';
            variableResolver.resolve.returns(resolvedContent);

            // Mock ProjectConfig
            const mockConfig: any = {
                build: { build_command: 'npm run build' },
                test_framework: { test_command: 'npm test' }
            };

            // Customize template
            const outputPath = path.join(tempDir, 'test.md');
            await customizer.customizeTemplate(templatePath, outputPath, mockConfig);

            // Verify VariableResolver was called
            assert.ok(variableResolver.resolve.calledOnce);
            const [template, variables] = variableResolver.resolve.getCall(0).args;
            assert.strictEqual(template, templateContent);

            // Verify output file was written
            assert.ok(fs.existsSync(outputPath));
            const writtenContent = fs.readFileSync(outputPath, 'utf-8');
            assert.strictEqual(writtenContent, resolvedContent);
        });

        test('should handle template with no variables', async () => {
            // Create template file without variables
            const templatePath = path.join(tempDir, 'static.template');
            const templateContent = 'This is a static template with no variables.';
            fs.writeFileSync(templatePath, templateContent, 'utf-8');

            // Mock VariableResolver (returns template unchanged)
            variableResolver.resolve.returns(templateContent);

            // Mock ProjectConfig
            const mockConfig: any = {};

            // Customize template
            const outputPath = path.join(tempDir, 'static.md');
            await customizer.customizeTemplate(templatePath, outputPath, mockConfig);

            // Verify output file was written
            assert.ok(fs.existsSync(outputPath));
            const writtenContent = fs.readFileSync(outputPath, 'utf-8');
            assert.strictEqual(writtenContent, templateContent);
        });

        test('should create output directory if missing', async () => {
            // Create template file
            const templatePath = path.join(tempDir, 'test.template');
            fs.writeFileSync(templatePath, '{{BUILD_COMMAND}}', 'utf-8');

            // Mock VariableResolver
            variableResolver.resolve.returns('npm run build');

            // Mock ProjectConfig
            const mockConfig: any = {};

            // Output path in non-existent directory
            const outputDir = path.join(tempDir, 'nested', 'deep', 'path');
            const outputPath = path.join(outputDir, 'test.md');

            // Verify directory doesn't exist yet
            assert.ok(!fs.existsSync(outputDir));

            // Customize template
            await customizer.customizeTemplate(templatePath, outputPath, mockConfig);

            // Verify directory was created
            assert.ok(fs.existsSync(outputDir));
            assert.ok(fs.existsSync(outputPath));
        });

        test('should throw error if template file not found', async () => {
            const templatePath = path.join(tempDir, 'nonexistent.template');
            const outputPath = path.join(tempDir, 'output.md');
            const mockConfig: any = {};

            await assert.rejects(
                async () => await customizer.customizeTemplate(templatePath, outputPath, mockConfig),
                /Template file not found/
            );
        });

        test('should throw error if variable resolution fails', async () => {
            // Create template file
            const templatePath = path.join(tempDir, 'test.template');
            fs.writeFileSync(templatePath, '{{MISSING_VAR}}', 'utf-8');

            // Mock VariableResolver to throw error
            variableResolver.resolve.throws(new Error('Variable not found: MISSING_VAR'));

            // Mock ProjectConfig
            const mockConfig: any = {};

            const outputPath = path.join(tempDir, 'test.md');

            await assert.rejects(
                async () => await customizer.customizeTemplate(templatePath, outputPath, mockConfig),
                /Variable not found: MISSING_VAR/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Batch Template Customization
    // ==========================================================================

    suite('customizeBatch()', () => {
        test('should customize multiple templates in batch', async () => {
            // Create multiple template files
            const template1Path = path.join(tempDir, 'template1.template');
            const template2Path = path.join(tempDir, 'template2.template');
            fs.writeFileSync(template1Path, '{{BUILD_COMMAND}}', 'utf-8');
            fs.writeFileSync(template2Path, '{{TEST_COMMAND}}', 'utf-8');

            // Mock VariableResolver
            variableResolver.resolve.onFirstCall().returns('npm run build');
            variableResolver.resolve.onSecondCall().returns('npm test');

            // Mock ProjectConfig
            const mockConfig: any = {};

            // Define batch customization mappings
            const mappings = [
                { templatePath: template1Path, outputPath: path.join(tempDir, 'output1.md') },
                { templatePath: template2Path, outputPath: path.join(tempDir, 'output2.md') }
            ];

            // Customize batch
            const results = await customizer.customizeBatch(mappings, mockConfig);

            // Verify all templates were customized
            assert.strictEqual(results.length, 2);
            assert.ok(results[0].success);
            assert.ok(results[1].success);

            // Verify output files were written
            assert.ok(fs.existsSync(mappings[0].outputPath));
            assert.ok(fs.existsSync(mappings[1].outputPath));

            const content1 = fs.readFileSync(mappings[0].outputPath, 'utf-8');
            const content2 = fs.readFileSync(mappings[1].outputPath, 'utf-8');
            assert.strictEqual(content1, 'npm run build');
            assert.strictEqual(content2, 'npm test');
        });

        test('should handle partial failures in batch', async () => {
            // Create template files (one valid, one will fail)
            const template1Path = path.join(tempDir, 'valid.template');
            const template2Path = path.join(tempDir, 'nonexistent.template'); // Doesn't exist

            fs.writeFileSync(template1Path, '{{BUILD_COMMAND}}', 'utf-8');

            // Mock VariableResolver
            variableResolver.resolve.returns('npm run build');

            // Mock ProjectConfig
            const mockConfig: any = {};

            // Define batch customization mappings
            const mappings = [
                { templatePath: template1Path, outputPath: path.join(tempDir, 'output1.md') },
                { templatePath: template2Path, outputPath: path.join(tempDir, 'output2.md') }
            ];

            // Customize batch (should continue despite one failure)
            const results = await customizer.customizeBatch(mappings, mockConfig);

            // Verify results
            assert.strictEqual(results.length, 2);
            assert.ok(results[0].success);
            assert.ok(!results[1].success);
            assert.ok(results[1].error);
            assert.ok(results[1].error!.includes('Template file not found'));

            // Verify first template was customized
            assert.ok(fs.existsSync(mappings[0].outputPath));

            // Verify second template was not created
            assert.ok(!fs.existsSync(mappings[1].outputPath));
        });

        test('should return empty array for empty batch', async () => {
            const mockConfig: any = {};
            const results = await customizer.customizeBatch([], mockConfig);

            assert.strictEqual(results.length, 0);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Variable Conversion
    // ==========================================================================

    suite('convertConfigToVariables()', () => {
        test('should convert ProjectConfig to flat variable dictionary', () => {
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts', '.tsx']
                },
                package_manager: {
                    package_manager: 'npm'
                },
                test_framework: {
                    test_framework: 'jest',
                    test_command: 'npm test'
                },
                paths: {
                    project_root: '/project',
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'npm run build'
                }
            };

            const variables = customizer.convertConfigToVariables(mockConfig);

            assert.strictEqual(variables.PROJECT_NAME, 'test-project');
            assert.strictEqual(variables.LANGUAGE, 'typescript');
            assert.strictEqual(variables.PACKAGE_MANAGER, 'npm');
            assert.strictEqual(variables.TEST_FRAMEWORK, 'jest');
            assert.strictEqual(variables.TEST_COMMAND, 'npm test');
            assert.strictEqual(variables.BUILD_COMMAND, 'npm run build');
            assert.strictEqual(variables.SOURCE_DIRECTORY, 'src');
            assert.strictEqual(variables.TEST_DIRECTORY, 'test');
            assert.strictEqual(variables.OUTPUT_DIRECTORY, 'out');
        });

        test('should handle minimal ProjectConfig', () => {
            const mockConfig: ProjectConfig = {
                project_name: 'minimal-project',
                language: {
                    language: 'rust',
                    file_extensions: ['.rs']
                },
                package_manager: {
                    package_manager: 'cargo'
                },
                test_framework: {
                    test_framework: 'cargo-test',
                    test_command: 'cargo test'
                },
                paths: {
                    project_root: '/project',
                    source_directory: 'src',
                    test_directory: 'tests',
                    output_directory: 'target'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                }
            };

            const variables = customizer.convertConfigToVariables(mockConfig);

            assert.strictEqual(variables.PROJECT_NAME, 'minimal-project');
            assert.strictEqual(variables.LANGUAGE, 'rust');
            assert.strictEqual(variables.BUILD_COMMAND, undefined); // Optional field
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Error Handling
    // ==========================================================================

    suite('Error Handling', () => {
        test('should wrap VariableResolver errors with context', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            fs.writeFileSync(templatePath, '{{MISSING_VAR}}', 'utf-8');

            variableResolver.resolve.throws(new Error('Variable not found: MISSING_VAR'));

            const mockConfig: any = {};
            const outputPath = path.join(tempDir, 'output.md');

            await assert.rejects(
                async () => await customizer.customizeTemplate(templatePath, outputPath, mockConfig),
                (error: Error) => {
                    assert.ok(error.message.includes('MISSING_VAR'));
                    return true;
                }
            );
        });

        test('should handle file write permission errors', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            fs.writeFileSync(templatePath, 'content', 'utf-8');

            variableResolver.resolve.returns('resolved content');

            const mockConfig: any = {};

            // Create read-only output directory
            const readOnlyDir = path.join(tempDir, 'readonly');
            fs.mkdirSync(readOnlyDir);
            fs.chmodSync(readOnlyDir, 0o444);

            const outputPath = path.join(readOnlyDir, 'output.md');

            try {
                await assert.rejects(
                    async () => await customizer.customizeTemplate(templatePath, outputPath, mockConfig),
                    /Failed to write customized file/
                );
            } finally {
                // Clean up: restore permissions
                fs.chmodSync(readOnlyDir, 0o755);
            }
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should customize template in < 50ms', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            const templateContent = '{{BUILD_COMMAND}}\n{{TEST_COMMAND}}\n{{LANGUAGE}}';
            fs.writeFileSync(templatePath, templateContent, 'utf-8');

            variableResolver.resolve.returns('npm run build\nnpm test\ntypescript');

            const mockConfig: any = {};
            const outputPath = path.join(tempDir, 'output.md');

            const startTime = Date.now();
            await customizer.customizeTemplate(templatePath, outputPath, mockConfig);
            const duration = Date.now() - startTime;

            assert.ok(duration < 50, `Customization took ${duration}ms (target: < 50ms)`);
        });

        test('should customize batch of 10 templates in < 500ms', async () => {
            // Create 10 template files
            const mappings = [];
            for (let i = 0; i < 10; i++) {
                const templatePath = path.join(tempDir, `template${i}.template`);
                fs.writeFileSync(templatePath, `{{BUILD_COMMAND}} ${i}`, 'utf-8');
                mappings.push({
                    templatePath,
                    outputPath: path.join(tempDir, `output${i}.md`)
                });
            }

            variableResolver.resolve.callsFake((template: string) => template.replace(/\{\{BUILD_COMMAND\}\}/, 'npm run build'));

            const mockConfig: any = {};

            const startTime = Date.now();
            await customizer.customizeBatch(mappings, mockConfig);
            const duration = Date.now() - startTime;

            assert.ok(duration < 500, `Batch customization took ${duration}ms (target: < 500ms)`);
        });
    });
});
