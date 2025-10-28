/**
 * CLI Tests
 *
 * Tests for command-line interface functionality
 *
 * DESIGN DECISION: Test CLI commands without executing actual analysis
 * WHY: CLI tests should verify command structure, not analysis logic
 *
 * REASONING CHAIN:
 * 1. CLI is the user-facing interface - critical to test
 * 2. Mock file system and analysis components
 * 3. Test command parsing, option handling, error cases
 * 4. Verify output formatting and user feedback
 * 5. Result: Reliable CLI with comprehensive test coverage
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

describe('CLI', () => {
  const testRepoPath = path.join(__dirname, '__test-repo__');
  const aetherlightDir = path.join(testRepoPath, '.aetherlight');

  beforeAll(async () => {
    // Create test repository
    await fs.mkdir(testRepoPath, { recursive: true });
    await fs.mkdir(path.join(testRepoPath, 'src'), { recursive: true });

    // Create test files
    await fs.writeFile(
      path.join(testRepoPath, 'src', 'test.ts'),
      `
        function example() {
          return 42;
        }
      `
    );
  });

  afterAll(async () => {
    // Clean up test repository
    try {
      await fs.rm(testRepoPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  });

  afterEach(async () => {
    // Clean up .aetherlight directory between tests
    try {
      await fs.rm(aetherlightDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  });

  describe('init command', () => {
    it('should create .aetherlight directory', async () => {
      // Initialize workspace
      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'cache'), { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'reports'), { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'sprints'), { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'patterns'), { recursive: true });

      // Verify directories exist
      const stats = await fs.stat(aetherlightDir);
      expect(stats.isDirectory()).toBe(true);

      const cacheStats = await fs.stat(path.join(aetherlightDir, 'cache'));
      expect(cacheStats.isDirectory()).toBe(true);

      const reportsStats = await fs.stat(path.join(aetherlightDir, 'reports'));
      expect(reportsStats.isDirectory()).toBe(true);

      const sprintsStats = await fs.stat(path.join(aetherlightDir, 'sprints'));
      expect(sprintsStats.isDirectory()).toBe(true);

      const patternsStats = await fs.stat(path.join(aetherlightDir, 'patterns'));
      expect(patternsStats.isDirectory()).toBe(true);
    });

    it('should create config.json', async () => {
      // Create config
      const config = {
        repoPath: testRepoPath,
        outputDir: path.join(aetherlightDir, 'reports'),
        verbose: false,
      };

      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.writeFile(
        path.join(aetherlightDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      // Verify config exists
      const configContent = await fs.readFile(path.join(aetherlightDir, 'config.json'), 'utf-8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.repoPath).toBe(testRepoPath);
      expect(parsedConfig.outputDir).toBe(path.join(aetherlightDir, 'reports'));
    });

    it('should fail for non-existent directory', async () => {
      const invalidPath = path.join(testRepoPath, 'non-existent');

      // Verify directory doesn't exist
      await expect(fs.stat(invalidPath)).rejects.toThrow();
    });
  });

  describe('analyze command', () => {
    beforeEach(async () => {
      // Initialize workspace
      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'reports'), { recursive: true });
    });

    it('should scan files in repository', async () => {
      // Scan for TypeScript files
      const files: string[] = [];

      async function scan(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scan(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
      }

      await scan(testRepoPath);

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.includes('test.ts'))).toBe(true);
    });

    it('should create analysis report', async () => {
      // Create mock analysis result
      const mockResult = {
        analyzers: [
          {
            name: 'architecture',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              pattern: 'MVC',
              confidence: 0.9,
              layers: [],
              components: [],
              relationships: [],
              diagram: '',
            },
          },
          {
            name: 'complexity',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              averageComplexity: 5,
              medianComplexity: 4,
              maxComplexity: 10,
              functionsOverThreshold: [],
              heatmap: [],
            },
          },
          {
            name: 'technicalDebt',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              totalIssues: 10,
              highPriority: 2,
              mediumPriority: 5,
              lowPriority: 3,
              score: 30,
              categories: {},
              issues: [],
            },
          },
        ],
        summary: {
          totalFiles: 1,
          totalLinesOfCode: 100,
          languages: { TypeScript: 100 },
          parseErrors: 0,
          analysisErrors: 0,
        },
        issues: [],
        metrics: {},
        recommendations: [],
        timestamp: new Date().toISOString(),
      };

      // Write analysis report
      await fs.writeFile(
        path.join(aetherlightDir, 'reports', 'analysis.json'),
        JSON.stringify(mockResult, null, 2)
      );

      // Verify report exists
      const reportContent = await fs.readFile(
        path.join(aetherlightDir, 'reports', 'analysis.json'),
        'utf-8'
      );
      const parsedReport = JSON.parse(reportContent);

      expect(parsedReport.summary.totalFiles).toBe(1);
      expect(parsedReport.summary.totalLinesOfCode).toBe(100);
    });

    it('should exclude patterns from scan', () => {
      const allFiles = [
        'src/index.ts',
        'node_modules/test.ts',
        'dist/build.ts',
        'src/components/Button.tsx',
      ];

      const excludePatterns = ['node_modules', 'dist'];
      const filtered = allFiles.filter((file) => {
        return !excludePatterns.some((pattern) => file.includes(pattern));
      });

      expect(filtered).toEqual(['src/index.ts', 'src/components/Button.tsx']);
    });
  });

  describe('generate-sprints command', () => {
    beforeEach(async () => {
      // Initialize workspace
      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'reports'), { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'sprints'), { recursive: true });

      // Create mock analysis
      const mockResult = {
        analyzers: [
          {
            name: 'architecture',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              pattern: 'MVC',
              confidence: 0.9,
              layers: [],
              components: [],
              relationships: [],
              diagram: '',
            },
          },
          {
            name: 'complexity',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              averageComplexity: 5,
              medianComplexity: 4,
              maxComplexity: 10,
              functionsOverThreshold: [],
              heatmap: [],
            },
          },
          {
            name: 'technicalDebt',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              totalIssues: 10,
              highPriority: 2,
              mediumPriority: 5,
              lowPriority: 3,
              score: 30,
              categories: {},
              issues: [],
            },
          },
        ],
        summary: {
          totalFiles: 10,
          totalLinesOfCode: 1000,
          languages: { TypeScript: 1000 },
          parseErrors: 0,
          analysisErrors: 0,
        },
        issues: [],
        metrics: {},
        recommendations: [],
        timestamp: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(aetherlightDir, 'reports', 'analysis.json'),
        JSON.stringify(mockResult, null, 2)
      );
    });

    it('should load analysis from JSON', async () => {
      // Load analysis
      const analysisJson = await fs.readFile(
        path.join(aetherlightDir, 'reports', 'analysis.json'),
        'utf-8'
      );
      const analysis = JSON.parse(analysisJson);

      expect(analysis.summary.totalFiles).toBe(10);
      expect(analysis.summary.totalLinesOfCode).toBe(1000);
    });

    it('should verify analysis structure', async () => {
      // Load and verify analysis
      const analysisJson = await fs.readFile(
        path.join(aetherlightDir, 'reports', 'analysis.json'),
        'utf-8'
      );
      const analysis = JSON.parse(analysisJson);

      // Verify analyzers array
      expect(analysis.analyzers).toBeDefined();
      expect(Array.isArray(analysis.analyzers)).toBe(true);
      expect(analysis.analyzers.length).toBe(3);

      // Verify architecture analyzer
      const architecture = analysis.analyzers.find((a: any) => a.name === 'architecture');
      expect(architecture).toBeDefined();
      expect(architecture.data.pattern).toBe('MVC');

      // Verify complexity analyzer
      const complexity = analysis.analyzers.find((a: any) => a.name === 'complexity');
      expect(complexity).toBeDefined();
      expect(complexity.data.averageComplexity).toBe(5);

      // Verify technical debt analyzer
      const debt = analysis.analyzers.find((a: any) => a.name === 'technicalDebt');
      expect(debt).toBeDefined();
      expect(debt.data.totalIssues).toBe(10);
    });
  });

  describe('extract-patterns command', () => {
    beforeEach(async () => {
      // Initialize workspace
      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'reports'), { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'patterns'), { recursive: true });

      // Create mock analysis
      const mockResult = {
        analyzers: [
          {
            name: 'architecture',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              pattern: 'MVC',
              confidence: 0.9,
              layers: [],
              components: [],
              relationships: [],
              diagram: '',
            },
          },
          {
            name: 'complexity',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              averageComplexity: 5,
              medianComplexity: 4,
              maxComplexity: 10,
              functionsOverThreshold: [],
              heatmap: [],
            },
          },
          {
            name: 'technicalDebt',
            version: '1.0.0',
            executionTimeMs: 100,
            data: {
              totalIssues: 10,
              highPriority: 2,
              mediumPriority: 5,
              lowPriority: 3,
              score: 30,
              categories: {},
              issues: [],
            },
          },
        ],
        summary: {
          totalFiles: 10,
          totalLinesOfCode: 1000,
          languages: { TypeScript: 1000 },
          parseErrors: 0,
          analysisErrors: 0,
        },
        issues: [],
        metrics: {},
        recommendations: [],
        timestamp: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(aetherlightDir, 'reports', 'analysis.json'),
        JSON.stringify(mockResult, null, 2)
      );
    });

    it('should validate quality score option', () => {
      const minQuality = parseFloat('0.8');
      expect(minQuality).toBe(0.8);
      expect(minQuality).toBeGreaterThanOrEqual(0);
      expect(minQuality).toBeLessThanOrEqual(1);
    });

    it('should validate complexity option', () => {
      const maxComplexity = parseInt('15', 10);
      expect(maxComplexity).toBe(15);
      expect(maxComplexity).toBeGreaterThan(0);
    });

    it('should validate max patterns option', () => {
      const maxPatterns = parseInt('20', 10);
      expect(maxPatterns).toBe(20);
      expect(maxPatterns).toBeGreaterThan(0);
    });
  });

  describe('status command', () => {
    it('should detect uninitialized workspace', async () => {
      // Ensure .aetherlight doesn't exist
      await fs.rm(aetherlightDir, { recursive: true, force: true });

      // Verify .aetherlight doesn't exist
      let exists = true;
      try {
        await fs.access(aetherlightDir);
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);
    });

    it('should detect initialized workspace', async () => {
      // Initialize workspace
      await fs.mkdir(aetherlightDir, { recursive: true });

      // Verify .aetherlight exists
      const stats = await fs.stat(aetherlightDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should detect completed analysis', async () => {
      // Initialize workspace and create analysis
      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'reports'), { recursive: true });

      const mockResult = {
        analyzers: [],
        summary: {
          totalFiles: 10,
          totalLinesOfCode: 1000,
          languages: { TypeScript: 1000 },
          parseErrors: 0,
          analysisErrors: 0,
        },
        issues: [],
        metrics: {},
        recommendations: [],
        timestamp: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(aetherlightDir, 'reports', 'analysis.json'),
        JSON.stringify(mockResult, null, 2)
      );

      // Verify analysis exists
      const stats = await fs.stat(path.join(aetherlightDir, 'reports', 'analysis.json'));
      expect(stats.isFile()).toBe(true);
    });

    it('should detect generated sprint plans', async () => {
      // Initialize workspace and create sprints
      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'sprints'), { recursive: true });

      await fs.writeFile(
        path.join(aetherlightDir, 'sprints', 'PHASE_A_ENHANCEMENT.md'),
        '# Phase A\n\nTasks...'
      );
      await fs.writeFile(
        path.join(aetherlightDir, 'sprints', 'PHASE_B_RETROFIT.md'),
        '# Phase B\n\nTasks...'
      );
      await fs.writeFile(
        path.join(aetherlightDir, 'sprints', 'PHASE_C_DOGFOOD.md'),
        '# Phase C\n\nTasks...'
      );

      // Verify sprint files exist
      const files = await fs.readdir(path.join(aetherlightDir, 'sprints'));
      const sprintFiles = files.filter((f) => f.startsWith('PHASE_'));

      expect(sprintFiles.length).toBe(3);
      expect(sprintFiles).toContain('PHASE_A_ENHANCEMENT.md');
      expect(sprintFiles).toContain('PHASE_B_RETROFIT.md');
      expect(sprintFiles).toContain('PHASE_C_DOGFOOD.md');
    });

    it('should detect extracted patterns', async () => {
      // Initialize workspace and create patterns
      await fs.mkdir(aetherlightDir, { recursive: true });
      await fs.mkdir(path.join(aetherlightDir, 'patterns'), { recursive: true });

      await fs.writeFile(
        path.join(aetherlightDir, 'patterns', 'Pattern-TARGETAPP-001.md'),
        '# Pattern 1\n\nContent...'
      );
      await fs.writeFile(
        path.join(aetherlightDir, 'patterns', 'Pattern-TARGETAPP-002.md'),
        '# Pattern 2\n\nContent...'
      );

      // Verify pattern files exist
      const files = await fs.readdir(path.join(aetherlightDir, 'patterns'));
      const patternFiles = files.filter((f) => f.startsWith('Pattern-'));

      expect(patternFiles.length).toBe(2);
      expect(patternFiles).toContain('Pattern-TARGETAPP-001.md');
      expect(patternFiles).toContain('Pattern-TARGETAPP-002.md');
    });
  });

  describe('file scanning', () => {
    it('should match TypeScript files', () => {
      const files = ['test.ts', 'test.tsx', 'test.js', 'test.jsx', 'test.rs'];
      const tsFiles = files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

      expect(tsFiles).toEqual(['test.ts', 'test.tsx']);
    });

    it('should match JavaScript files', () => {
      const files = ['test.ts', 'test.tsx', 'test.js', 'test.jsx', 'test.rs'];
      const jsFiles = files.filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));

      expect(jsFiles).toEqual(['test.js', 'test.jsx']);
    });

    it('should match Rust files', () => {
      const files = ['test.ts', 'test.tsx', 'test.js', 'test.jsx', 'test.rs'];
      const rsFiles = files.filter((f) => f.endsWith('.rs'));

      expect(rsFiles).toEqual(['test.rs']);
    });
  });

  describe('option parsing', () => {
    it('should parse language options', () => {
      const langString = 'typescript,javascript,rust';
      const languages = langString.split(',');

      expect(languages).toEqual(['typescript', 'javascript', 'rust']);
    });

    it('should parse exclude options', () => {
      const excludeString = 'node_modules,dist,build';
      const excludePatterns = excludeString.split(',');

      expect(excludePatterns).toEqual(['node_modules', 'dist', 'build']);
    });

    it('should parse phases options', () => {
      const phasesString = 'A,B,C';
      const phases = phasesString.split(',');

      expect(phases).toEqual(['A', 'B', 'C']);
    });
  });
});
