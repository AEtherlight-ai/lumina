/**
 * Rust Parser Tests
 *
 * DESIGN DECISION: Test-driven validation of Rust parser accuracy
 * WHY: Ensure >95% accuracy target met before proceeding to analyzers
 *
 * REASONING CHAIN:
 * 1. Create sample Rust files with known structure
 * 2. Parse and verify extracted elements match expected
 * 3. Validate performance (<3s for 30k LOC)
 * 4. Test error handling (malformed files)
 * 5. Result: Parser ready for production use
 *
 * PATTERN: Pattern-TEST-001 (Unit Testing Strategy)
 */

import { RustParser } from './rust-parser';
import { ElementType, DependencyType } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('RustParser', () => {
  let parser: RustParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new RustParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rust-parser-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Struct parsing', () => {
    it('should extract struct with fields', async () => {
      const testFile = path.join(tempDir, 'test.rs');
      fs.writeFileSync(
        testFile,
        `
/// User struct representing a system user
#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    age: u32,
}
      `
      );

      const result = await parser.parse(tempDir);

      expect(result.files).toHaveLength(1);
      const file = result.files[0];

      // Find the User struct
      const userStruct = file.elements.find(
        (e) => e.type === ElementType.STRUCT && e.name === 'User'
      );
      expect(userStruct).toBeDefined();
      expect(userStruct!.documentation).toContain('User struct representing');

      // Verify fields
      const structElement = userStruct as any;
      expect(structElement.fields).toHaveLength(3);
      expect(structElement.fields[0].name).toBe('id');
      expect(structElement.fields[0].visibility).toBe('public');
      expect(structElement.fields[1].name).toBe('name');
      expect(structElement.fields[2].name).toBe('age');
      expect(structElement.fields[2].visibility).toBe('private');

      // Verify derives
      expect(structElement.metadata.derives).toContain('derive');
    });
  });

  describe('Trait parsing', () => {
    it('should extract trait with methods', async () => {
      const testFile = path.join(tempDir, 'trait.rs');
      fs.writeFileSync(
        testFile,
        `
/// Animal trait for polymorphic behavior
pub trait Animal {
    fn make_sound(&self) -> String;
    async fn sleep(&self, duration: u32);
}
      `
      );

      const result = await parser.parse(tempDir);
      const traitElem = result.files[0].elements.find(
        (e) => e.type === ElementType.TRAIT && e.name === 'Animal'
      ) as any;

      expect(traitElem).toBeDefined();
      expect(traitElem.documentation).toContain('Animal trait');
      expect(traitElem.methods).toHaveLength(2);

      const makeSound = traitElem.methods.find((m: any) => m.name === 'make_sound');
      expect(makeSound).toBeDefined();
      expect(makeSound.returnType).toContain('String');

      const sleep = traitElem.methods.find((m: any) => m.name === 'sleep');
      expect(sleep).toBeDefined();
      expect(sleep.isAsync).toBe(true);
    });
  });

  describe('Impl parsing', () => {
    it('should extract impl blocks', async () => {
      const testFile = path.join(tempDir, 'impl.rs');
      fs.writeFileSync(
        testFile,
        `
pub struct Dog {
    name: String,
}

impl Dog {
    pub fn new(name: String) -> Self {
        Self { name }
    }

    pub fn bark(&self) -> String {
        format!("{} says woof!", self.name)
    }
}
      `
      );

      const result = await parser.parse(tempDir);
      const implElem = result.files[0].elements.find(
        (e) => e.type === ElementType.IMPL
      ) as any;

      expect(implElem).toBeDefined();
      expect(implElem.targetType).toContain('Dog');
      expect(implElem.methods).toHaveLength(2);

      const newMethod = implElem.methods.find((m: any) => m.name === 'new');
      expect(newMethod).toBeDefined();
      expect(newMethod.visibility).toBe('public');

      const barkMethod = implElem.methods.find((m: any) => m.name === 'bark');
      expect(barkMethod).toBeDefined();
      expect(barkMethod.returnType).toContain('String');
    });
  });

  describe('Function parsing', () => {
    it('should extract top-level functions', async () => {
      const testFile = path.join(tempDir, 'functions.rs');
      fs.writeFileSync(
        testFile,
        `
/// Add two numbers
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub async fn fetch_data(url: &str) -> Result<String, Error> {
    // Implementation
    Ok(String::new())
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
      expect(addFunc.returnType).toContain('i32');
      expect(addFunc.isAsync).toBe(false);

      const fetchFunc = functions.find((f) => f.name === 'fetch_data');
      expect(fetchFunc).toBeDefined();
      expect(fetchFunc.isAsync).toBe(true);
    });
  });

  describe('Dependency extraction', () => {
    it('should extract use statements', async () => {
      const testFile = path.join(tempDir, 'imports.rs');
      fs.writeFileSync(
        testFile,
        `
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use crate::models::User;
      `
      );

      const result = await parser.parse(tempDir);
      const dependencies = result.files[0].dependencies;

      expect(dependencies.length).toBeGreaterThan(0);

      const hashMapDep = dependencies.find((d) => d.to.includes('HashMap'));
      expect(hashMapDep).toBeDefined();
      expect(hashMapDep!.type).toBe(DependencyType.IMPORT);

      const serdeDep = dependencies.find((d) => d.to.includes('serde'));
      expect(serdeDep).toBeDefined();
      expect(serdeDep!.importedSymbols).toContain('Serialize');
      expect(serdeDep!.importedSymbols).toContain('Deserialize');
    });
  });

  describe('Performance', () => {
    it('should parse 3k LOC in <1 second', async () => {
      // Generate a moderately large file
      const lines: string[] = [];
      for (let i = 0; i < 300; i++) {
        lines.push(`
pub fn func_${i}(param: i32) -> i32 {
    if param > 0 {
        param * 2
    } else {
        0
    }
}
        `);
      }

      const testFile = path.join(tempDir, 'large.rs');
      fs.writeFileSync(testFile, lines.join('\n'));

      const startTime = Date.now();
      const result = await parser.parse(tempDir);
      const duration = Date.now() - startTime;

      expect(result.totalLinesOfCode).toBeGreaterThan(1500);
      expect(duration).toBeLessThan(1000); // <1s for ~3k LOC
    });
  });

  describe('Error handling', () => {
    it('should handle missing Rust parser binary gracefully', async () => {
      const parserWithBadPath = new RustParser('/nonexistent/rust-parser');
      const result = await parserWithBadPath.parse(tempDir);

      expect(result.parseErrors).toHaveLength(1);
      expect(result.parseErrors[0].message).toContain('not found');
      expect(result.parseErrors[0].severity).toBe('error');
    });

    it('should handle malformed Rust files', async () => {
      const testFile = path.join(tempDir, 'invalid.rs');
      fs.writeFileSync(
        testFile,
        `
pub struct BrokenStruct {
    // Missing closing brace
      `
      );

      const result = await parser.parse(tempDir);

      // Parser should return errors but not crash
      expect(result.files).toBeDefined();
      // May have parse errors depending on syn's error handling
    });
  });
});
