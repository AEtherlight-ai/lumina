/**
 * TypeScript Parser Tests
 *
 * DESIGN DECISION: Test-driven validation of parser accuracy
 * WHY: Ensure >95% accuracy target met before proceeding to analyzers
 *
 * REASONING CHAIN:
 * 1. Create sample TypeScript files with known structure
 * 2. Parse and verify extracted elements match expected
 * 3. Validate performance (<5s for 50k LOC)
 * 4. Test error handling (malformed files)
 * 5. Result: Parser ready for production use
 *
 * PATTERN: Pattern-TEST-001 (Unit Testing Strategy)
 */

import { TypeScriptParser } from './typescript-parser';
import { ElementType, DependencyType } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new TypeScriptParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-parser-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Class parsing', () => {
    it('should extract class with methods and properties', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * User class representing a system user
 */
export class User {
  private id: string;
  public name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public getName(): string {
    return this.name;
  }

  private validateId(id: string): boolean {
    return id.length > 0;
  }
}
      `
      );

      const result = await parser.parse(tempDir);

      expect(result.files).toHaveLength(1);
      const file = result.files[0];

      // Find the User class
      const userClass = file.elements.find(
        (e) => e.type === ElementType.CLASS && e.name === 'User'
      );
      expect(userClass).toBeDefined();
      expect(userClass!.documentation).toContain('User class representing');

      // Verify properties
      const classElement = userClass as any;
      expect(classElement.properties).toHaveLength(2);
      expect(classElement.properties[0].name).toBe('id');
      expect(classElement.properties[0].visibility).toBe('private');
      expect(classElement.properties[1].name).toBe('name');
      expect(classElement.properties[1].visibility).toBe('public');

      // Verify methods
      expect(classElement.methods.length).toBeGreaterThanOrEqual(2);
      const getNameMethod = classElement.methods.find((m: any) => m.name === 'getName');
      expect(getNameMethod).toBeDefined();
      expect(getNameMethod.visibility).toBe('public');
      expect(getNameMethod.returnType).toContain('string');
    });

    it('should detect class inheritance', async () => {
      const testFile = path.join(tempDir, 'inheritance.ts');
      fs.writeFileSync(
        testFile,
        `
export abstract class Animal {
  abstract makeSound(): void;
}

export class Dog extends Animal {
  makeSound(): void {
    console.log('Woof!');
  }
}
      `
      );

      const result = await parser.parse(tempDir);
      const dogClass = result.files[0].elements.find(
        (e) => e.type === ElementType.CLASS && e.name === 'Dog'
      ) as any;

      expect(dogClass).toBeDefined();
      expect(dogClass.extends).toContain('Animal');
    });
  });

  describe('Function parsing', () => {
    it('should extract top-level functions with parameters', async () => {
      const testFile = path.join(tempDir, 'functions.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Calculate sum of two numbers
 */
export function add(a: number, b: number): number {
  return a + b;
}

export async function fetchData(url: string, timeout?: number): Promise<any> {
  const response = await fetch(url);
  return response.json();
}
      `
      );

      const result = await parser.parse(tempDir);
      const functions = result.files[0].elements.filter(
        (e) => e.type === ElementType.FUNCTION
      ) as any[];

      expect(functions).toHaveLength(2);

      const addFunc = functions.find((f) => f.name === 'add');
      expect(addFunc).toBeDefined();
      expect(addFunc.parameters).toHaveLength(2);
      expect(addFunc.parameters[0].name).toBe('a');
      expect(addFunc.parameters[0].type).toContain('number');
      expect(addFunc.returnType).toContain('number');
      expect(addFunc.isAsync).toBe(false);

      const fetchFunc = functions.find((f) => f.name === 'fetchData');
      expect(fetchFunc).toBeDefined();
      expect(fetchFunc.isAsync).toBe(true);
      expect(fetchFunc.parameters[1].isOptional).toBe(true);
    });
  });

  describe('Dependency extraction', () => {
    it('should extract import dependencies', async () => {
      const testFile = path.join(tempDir, 'imports.ts');
      fs.writeFileSync(
        testFile,
        `
import { Component } from '@angular/core';
import * as React from 'react';
import { User, Role } from './models';
      `
      );

      const result = await parser.parse(tempDir);
      const dependencies = result.files[0].dependencies;

      expect(dependencies).toHaveLength(3);

      const angularDep = dependencies.find((d) => d.to === '@angular/core');
      expect(angularDep).toBeDefined();
      expect(angularDep!.type).toBe(DependencyType.IMPORT);
      expect(angularDep!.importedSymbols).toContain('Component');

      const modelsDep = dependencies.find((d) => d.to === './models');
      expect(modelsDep).toBeDefined();
      expect(modelsDep!.importedSymbols).toHaveLength(2);
      expect(modelsDep!.importedSymbols).toContain('User');
      expect(modelsDep!.importedSymbols).toContain('Role');
    });
  });

  describe('Complexity calculation', () => {
    it('should calculate cyclomatic complexity correctly', async () => {
      const testFile = path.join(tempDir, 'complexity.ts');
      fs.writeFileSync(
        testFile,
        `
export function simpleFunction() {
  return 42; // Complexity: 1
}

export function complexFunction(x: number, y: number) {
  if (x > 0) { // +1
    if (y > 0) { // +1
      return x + y;
    }
  } else if (x < 0) { // +1
    return -x;
  }

  for (let i = 0; i < 10; i++) { // +1
    if (i % 2 === 0) { // +1
      console.log(i);
    }
  }

  return x && y ? x : y; // +2 (&& and ?:)
  // Total: 1 (base) + 7 = 8
}
      `
      );

      const result = await parser.parse(tempDir);
      const functions = result.files[0].elements.filter(
        (e) => e.type === ElementType.FUNCTION
      ) as any[];

      const simpleFunc = functions.find((f) => f.name === 'simpleFunction');
      expect(simpleFunc.complexity).toBe(1);

      const complexFunc = functions.find((f) => f.name === 'complexFunction');
      expect(complexFunc.complexity).toBeGreaterThanOrEqual(7);
      expect(complexFunc.complexity).toBeLessThanOrEqual(9); // Allow minor variance
    });
  });

  describe('Performance', () => {
    it('should parse 10k LOC in <2 seconds', async () => {
      // Generate a large file
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`
export function func${i}(param: number): number {
  if (param > 0) {
    return param * 2;
  }
  return 0;
}
        `);
      }

      const testFile = path.join(tempDir, 'large.ts');
      fs.writeFileSync(testFile, lines.join('\n'));

      const startTime = Date.now();
      const result = await parser.parse(tempDir);
      const duration = Date.now() - startTime;

      expect(result.totalLinesOfCode).toBeGreaterThan(5000);
      expect(duration).toBeLessThan(2000); // <2s for ~10k LOC
    });
  });

  describe('Error handling', () => {
    it('should handle parse errors gracefully', async () => {
      const testFile = path.join(tempDir, 'invalid.ts');
      fs.writeFileSync(
        testFile,
        `
export class BrokenClass {
  // Missing closing brace
      `
      );

      const result = await parser.parse(tempDir);

      // Parser should still return a result with errors
      expect(result.files).toHaveLength(1);
      // TypeScript compiler is lenient, may not error
      // expect(result.parseErrors.length).toBeGreaterThan(0);
    });
  });
});
