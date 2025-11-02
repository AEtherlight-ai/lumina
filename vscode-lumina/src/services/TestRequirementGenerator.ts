/**
 * TestRequirementGenerator - Auto-generate TDD requirements per task category
 *
 * DESIGN DECISION: Generate test requirements based on task category and type
 * WHY: Different task types need different test strategies (unit vs integration vs E2E)
 *
 * REASONING CHAIN:
 * 1. Reddit insight: "TDD creates a ratchet preventing subtle breakage"
 * 2. Different task categories need different test approaches
 * 3. Infrastructure tasks → unit tests (services, utilities)
 * 4. Feature tasks → integration tests (user workflows)
 * 5. UI tasks → component tests (rendering, interactions)
 * 6. Auto-generate requirements → ensure nothing slips through
 * 7. Result: Every task gets appropriate test requirements automatically
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * RELATED: MID-002 (ConfidenceScorer), MID-012 (TDD Enforcement)
 */

export interface TestRequirement {
    category: string;
    testFiles: string[];
    testRequirements: string;
    coverageRequirement: number; // 0.0-1.0
    testType: 'unit' | 'integration' | 'e2e' | 'component';
}

export interface Task {
    id: string;
    name: string;
    description?: string;
    category?: string;
    files_to_modify?: string[];
    deliverables?: string[];
}

export class TestRequirementGenerator {
    /**
     * Generate test requirements for a task based on category and type
     */
    static generate(task: Task): TestRequirement {
        const category = this.detectCategory(task);
        const testType = this.detectTestType(task);
        const coverageRequirement = this.calculateCoverageRequirement(category, testType);
        const testFiles = this.generateTestFilePaths(task);
        const testRequirements = this.generateRequirementsText(task, testType, category);

        return {
            category,
            testFiles,
            testRequirements,
            coverageRequirement,
            testType
        };
    }

    /**
     * Detect task category from task metadata
     */
    private static detectCategory(task: Task): string {
        // Check explicit category field
        if (task.category) {
            return task.category;
        }

        // Infer from task name/description
        const text = `${task.name} ${task.description || ''}`.toLowerCase();

        if (text.includes('service') || text.includes('utility') || text.includes('library')) {
            return 'Infrastructure';
        }
        if (text.includes('ui') || text.includes('component') || text.includes('panel') || text.includes('view')) {
            return 'UI';
        }
        if (text.includes('api') || text.includes('endpoint') || text.includes('route')) {
            return 'API';
        }
        if (text.includes('feature') || text.includes('workflow')) {
            return 'Feature';
        }
        if (text.includes('pattern') || text.includes('documentation') || text.includes('docs')) {
            return 'Documentation';
        }
        if (text.includes('test') || text.includes('tdd')) {
            return 'Testing';
        }

        return 'General';
    }

    /**
     * Detect appropriate test type based on task characteristics
     */
    private static detectTestType(task: Task): 'unit' | 'integration' | 'e2e' | 'component' {
        const text = `${task.name} ${task.description || ''}`.toLowerCase();
        const files = task.files_to_modify || [];

        // Check file types
        const hasServices = files.some(f => f.includes('/services/'));
        const hasViews = files.some(f => f.includes('/views/') || f.includes('/components/'));
        const hasCommands = files.some(f => f.includes('/commands/'));

        // UI/Component tests
        if (hasViews || text.includes('ui') || text.includes('component') || text.includes('panel')) {
            return 'component';
        }

        // Integration tests (commands, workflows)
        if (hasCommands || text.includes('workflow') || text.includes('integration') || text.includes('pipeline')) {
            return 'integration';
        }

        // E2E tests (full user scenarios)
        if (text.includes('e2e') || text.includes('end-to-end') || text.includes('user flow')) {
            return 'e2e';
        }

        // Default: unit tests (services, utilities)
        return 'unit';
    }

    /**
     * Calculate coverage requirement based on category and test type
     */
    private static calculateCoverageRequirement(category: string, testType: string): number {
        // Infrastructure/Services → higher coverage (they're reusable)
        if (category === 'Infrastructure' && testType === 'unit') {
            return 0.90; // 90% for core services
        }

        // API endpoints → high coverage (critical paths)
        if (category === 'API') {
            return 0.85; // 85% for APIs
        }

        // Features/Integration → medium coverage
        if (testType === 'integration') {
            return 0.80; // 80% for integration
        }

        // UI/Component → lower coverage (visual testing is expensive)
        if (testType === 'component') {
            return 0.70; // 70% for UI components
        }

        // E2E → critical paths only
        if (testType === 'e2e') {
            return 0.60; // 60% for E2E (happy paths)
        }

        // Documentation/Patterns → no code coverage needed
        if (category === 'Documentation') {
            return 0.0; // No coverage for docs
        }

        // Default: 80% coverage
        return 0.80;
    }

    /**
     * Generate test file paths based on task files
     */
    private static generateTestFilePaths(task: Task): string[] {
        const files = task.files_to_modify || [];
        const testFiles: string[] = [];

        for (const file of files) {
            // Skip non-code files
            if (file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.toml')) {
                continue;
            }

            // Convert source file to test file
            // Example: src/services/Foo.ts → test/services/foo.test.ts
            const testFile = file
                .replace(/^vscode-lumina\/src\//, 'vscode-lumina/test/')
                .replace(/\.ts$/, '.test.ts')
                .replace(/([A-Z][a-z]+)/g, (match) => match.toLowerCase()); // PascalCase → lowercase

            testFiles.push(testFile);
        }

        // If no files specified, generate generic test file
        if (testFiles.length === 0) {
            const taskIdLower = task.id.toLowerCase().replace(/-/g, '');
            testFiles.push(`vscode-lumina/test/services/${taskIdLower}.test.ts`);
        }

        return testFiles;
    }

    /**
     * Generate human-readable test requirements text
     */
    private static generateRequirementsText(task: Task, testType: string, category: string): string {
        const taskName = task.name;
        const isInfrastructure = category === 'Infrastructure';

        let requirements = `TDD Requirements (${category} Task):\n`;
        requirements += `1. Write tests FIRST for ${taskName}\n`;
        requirements += `2. Test cases:\n`;

        // Add test cases based on type
        if (testType === 'unit') {
            requirements += `   - Happy path (valid input → expected output)\n`;
            requirements += `   - Error cases (invalid input → proper error handling)\n`;
            requirements += `   - Edge cases (empty, null, undefined, boundary values)\n`;
            if (isInfrastructure) {
                requirements += `   - Integration with dependencies (mocked or stubbed)\n`;
            }
        } else if (testType === 'integration') {
            requirements += `   - End-to-end workflow (user action → system response)\n`;
            requirements += `   - Error scenarios (network failure, invalid state)\n`;
            requirements += `   - State management (before/after validation)\n`;
        } else if (testType === 'component') {
            requirements += `   - Component renders correctly\n`;
            requirements += `   - User interactions work (clicks, input)\n`;
            requirements += `   - State updates reflected in UI\n`;
            requirements += `   - Error states displayed properly\n`;
        } else if (testType === 'e2e') {
            requirements += `   - Critical user path (happy flow)\n`;
            requirements += `   - Error recovery (user mistakes)\n`;
            requirements += `   - Cross-feature integration\n`;
        }

        requirements += `3. Run tests → FAIL (red phase)\n`;
        requirements += `4. Implement ${taskName} → PASS (green phase)\n`;
        requirements += `5. Refactor for clarity → STILL PASS\n`;

        return requirements;
    }

    /**
     * Check if task needs tests (some tasks like documentation don't)
     */
    static needsTests(task: Task): boolean {
        const category = this.detectCategory(task);

        // Documentation tasks don't need code tests
        if (category === 'Documentation') {
            return false;
        }

        // Pattern creation doesn't need code tests
        if (task.name.toLowerCase().includes('pattern-') && !task.name.toLowerCase().includes('implement')) {
            return false;
        }

        // Everything else needs tests
        return true;
    }
}
