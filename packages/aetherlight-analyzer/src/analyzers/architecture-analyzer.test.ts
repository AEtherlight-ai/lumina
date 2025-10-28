/**
 * Architecture Analyzer Tests
 *
 * DESIGN DECISION: Test pattern detection with realistic directory structures
 * WHY: Architecture detection relies on naming conventions - must validate heuristics
 *
 * REASONING CHAIN:
 * 1. Create mock ParseResult with typical MVC/Clean/Layered structures
 * 2. Run analyzer, verify correct pattern detected
 * 3. Validate layer identification accuracy
 * 4. Check component extraction
 * 5. Verify Mermaid diagram generation
 * 6. Result: >90% accuracy on common architectures
 *
 * PATTERN: Pattern-TEST-001 (Unit Testing Strategy)
 */

import { ArchitectureAnalyzer } from './architecture-analyzer';
import { ArchitecturePattern } from './types';
import { ParseResult, ParsedFile, ElementType, DependencyType } from '../parsers/types';

describe('ArchitectureAnalyzer', () => {
  let analyzer: ArchitectureAnalyzer;

  beforeEach(() => {
    analyzer = new ArchitectureAnalyzer();
  });

  describe('MVC pattern detection', () => {
    it('should detect MVC architecture', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('src/controllers/UserController.ts'),
          createMockFile('src/models/User.ts'),
          createMockFile('src/views/UserView.tsx'),
          createMockFile('src/services/UserService.ts'),
        ],
        totalFiles: 4,
        totalLinesOfCode: 500,
        parseErrors: [],
        parseDurationMs: 100,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.pattern).toBe(ArchitecturePattern.MVC);
      expect(analysis.confidence).toBeGreaterThan(0.5);
      expect(analysis.layers.length).toBeGreaterThan(0);
    });

    it('should identify MVC layers correctly', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('src/controllers/UserController.ts', [
            createMockClass('UserController'),
          ]),
          createMockFile('src/models/User.ts', [createMockClass('User')]),
          createMockFile('src/views/UserView.tsx', [createMockClass('UserView')]),
          createMockFile('src/services/UserService.ts', [createMockClass('UserService')]),
        ],
        totalFiles: 4,
        totalLinesOfCode: 500,
        parseErrors: [],
        parseDurationMs: 100,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const layerNames = analysis.layers.map((l: any) => l.name);
      expect(layerNames).toContain('Controllers');
      expect(layerNames).toContain('Models');
      expect(layerNames).toContain('Views');
      expect(layerNames).toContain('Services');
    });
  });

  describe('Clean Architecture detection', () => {
    it('should detect Clean Architecture', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('src/domain/entities/User.ts'),
          createMockFile('src/application/use-cases/CreateUser.ts'),
          createMockFile('src/infrastructure/repositories/UserRepository.ts'),
          createMockFile('src/presentation/controllers/UserController.ts'),
        ],
        totalFiles: 4,
        totalLinesOfCode: 600,
        parseErrors: [],
        parseDurationMs: 100,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.pattern).toBe(ArchitecturePattern.CLEAN);
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    it('should identify Clean Architecture layers', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('src/domain/entities/User.ts', [createMockClass('User')]),
          createMockFile('src/application/use-cases/CreateUser.ts', [
            createMockClass('CreateUser'),
          ]),
          createMockFile('src/infrastructure/repositories/UserRepository.ts', [
            createMockClass('UserRepository'),
          ]),
        ],
        totalFiles: 3,
        totalLinesOfCode: 400,
        parseErrors: [],
        parseDurationMs: 100,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const layerNames = analysis.layers.map((l: any) => l.name);
      expect(layerNames).toContain('Domain');
      expect(layerNames).toContain('Application');
      expect(layerNames).toContain('Infrastructure');
    });
  });

  describe('Component extraction', () => {
    it('should extract components from classes', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('src/controllers/UserController.ts', [
            createMockClass('UserController'),
          ]),
          createMockFile('src/services/UserService.ts', [createMockClass('UserService')]),
        ],
        totalFiles: 2,
        totalLinesOfCode: 200,
        parseErrors: [],
        parseDurationMs: 50,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.components.length).toBeGreaterThan(0);
      const userController = analysis.components.find((c: any) => c.name === 'UserController');
      expect(userController).toBeDefined();
      expect(userController.type).toBe('controller');
    });

    it('should infer component types correctly', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('src/controllers/UserController.ts', [
            createMockClass('UserController'),
          ]),
          createMockFile('src/services/AuthService.ts', [createMockClass('AuthService')]),
          createMockFile('src/models/Product.ts', [createMockClass('Product')]),
          createMockFile('src/repositories/OrderRepository.ts', [
            createMockClass('OrderRepository'),
          ]),
        ],
        totalFiles: 4,
        totalLinesOfCode: 400,
        parseErrors: [],
        parseDurationMs: 100,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const controllerComp = analysis.components.find((c: any) => c.name === 'UserController');
      expect(controllerComp.type).toBe('controller');

      const serviceComp = analysis.components.find((c: any) => c.name === 'AuthService');
      expect(serviceComp.type).toBe('service');

      const modelComp = analysis.components.find((c: any) => c.name === 'Product');
      expect(modelComp.type).toBe('model');

      const repoComp = analysis.components.find((c: any) => c.name === 'OrderRepository');
      expect(repoComp.type).toBe('repository');
    });
  });

  describe('Mermaid diagram generation', () => {
    it('should generate valid Mermaid syntax', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('src/controllers/UserController.ts', [
            createMockClass('UserController'),
          ]),
          createMockFile('src/services/UserService.ts', [createMockClass('UserService')]),
        ],
        totalFiles: 2,
        totalLinesOfCode: 200,
        parseErrors: [],
        parseDurationMs: 50,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.diagram).toContain('graph TD');
      expect(analysis.diagram).toContain('subgraph');
      expect(analysis.diagram).toContain('UserController');
    });
  });

  describe('Performance', () => {
    it('should analyze 100 files in <2 seconds', () => {
      const files: ParsedFile[] = [];
      for (let i = 0; i < 100; i++) {
        files.push(createMockFile(`src/file${i}.ts`, [createMockClass(`Class${i}`)]));
      }

      const parseResult: ParseResult = {
        files,
        totalFiles: 100,
        totalLinesOfCode: 10000,
        parseErrors: [],
        parseDurationMs: 500,
      };

      const result = analyzer.analyze(parseResult);

      expect(result.executionTimeMs).toBeLessThan(2000);
    });
  });
});

// Helper functions

function createMockFile(filePath: string, elements: any[] = []): ParsedFile {
  return {
    filePath,
    language: 'typescript',
    elements,
    dependencies: [],
    linesOfCode: 50,
    parseErrors: [],
  };
}

function createMockClass(name: string): any {
  return {
    type: ElementType.CLASS,
    name,
    location: { filePath: '', line: 1, column: 1 },
    documentation: `${name} class`,
    metadata: {},
    properties: [],
    methods: [],
    isAbstract: false,
    isExported: true,
  };
}
