/**
 * DESIGN DECISION: Hybrid Rust parser using CLI wrapper around syn crate
 * WHY: TypeScript can't parse Rust natively, need Rust tooling via subprocess
 *
 * REASONING CHAIN:
 * 1. Rust has complex syntax (lifetimes, macros, trait bounds)
 * 2. Only way to parse correctly is using Rust's `syn` crate
 * 3. Create Rust CLI tool that outputs JSON (using syn)
 * 4. Call CLI from TypeScript, parse JSON output
 * 5. Transform to unified CodeElement types
 * 6. Result: Accurate Rust parsing with <3s for 30k LOC
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 * RELATED: PHASE_0_CODE_ANALYZER.md (Task A-002)
 * PERFORMANCE: Target <3s for 30k LOC Rust code
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  ParseResult,
  ParsedFile,
  CodeElement,
  StructElement,
  TraitElement,
  ImplElement,
  FunctionElement,
  MethodElement,
  PropertyElement,
  Dependency,
  DependencyType,
  ElementType,
  SourceLocation,
  ParseError,
  ParameterInfo,
} from './types';

interface RustParseOutput {
  files: RustParsedFile[];
  errors: string[];
}

interface RustParsedFile {
  path: string;
  items: RustItem[];
  uses: RustUse[];
  loc: number;
}

interface RustItem {
  kind: 'struct' | 'trait' | 'impl' | 'fn' | 'mod' | 'enum' | 'type';
  name: string;
  visibility: 'pub' | 'crate' | 'private';
  location: { line: number; column: number };
  documentation?: string;
  attrs?: string[]; // Attributes like #[derive(...)]
  fields?: RustField[];
  methods?: RustMethod[];
  params?: RustParam[];
  return_type?: string;
  impl_trait?: string;
  impl_target?: string;
}

interface RustField {
  name: string;
  type: string;
  visibility: 'pub' | 'private';
  location: { line: number; column: number };
}

interface RustMethod {
  name: string;
  visibility: 'pub' | 'private';
  params: RustParam[];
  return_type?: string;
  is_async: boolean;
  location: { line: number; column: number };
}

interface RustParam {
  name: string;
  type: string;
}

interface RustUse {
  path: string;
  items: string[];
}

export class RustParser {
  private rustParserPath: string;

  constructor(rustParserPath?: string) {
    /**
     * DESIGN DECISION: Locate Rust parser binary in project or PATH
     * WHY: Flexible deployment - bundled binary or system-installed
     */
    this.rustParserPath =
      rustParserPath ||
      path.join(__dirname, '../../../bin/rust-parser') ||
      'rust-parser'; // Fallback to PATH
  }

  /**
   * Parse all Rust files in directory
   *
   * DESIGN DECISION: Call Rust CLI tool via subprocess, parse JSON output
   * WHY: Only accurate way to parse Rust is using Rust's syn crate
   *
   * @param directoryPath - Root directory to scan
   * @returns ParseResult with all parsed files and dependencies
   */
  public async parse(directoryPath: string): Promise<ParseResult> {
    const startTime = Date.now();

    // Check if Rust parser binary exists
    if (!this.checkRustParserExists()) {
      return {
        files: [],
        totalFiles: 0,
        totalLinesOfCode: 0,
        parseErrors: [
          {
            message: `Rust parser binary not found at: ${this.rustParserPath}. Run 'npm run build:rust-parser' to compile it.`,
            location: { filePath: directoryPath, line: 1, column: 1 },
            severity: 'error',
          },
        ],
        parseDurationMs: Date.now() - startTime,
      };
    }

    try {
      // Call Rust parser CLI
      const output = await this.callRustParser(directoryPath);
      const parsedFiles = this.transformRustOutput(output);
      const totalLoc = parsedFiles.reduce((sum, f) => sum + f.linesOfCode, 0);

      return {
        files: parsedFiles,
        totalFiles: parsedFiles.length,
        totalLinesOfCode: totalLoc,
        parseErrors: output.errors.map((msg) => ({
          message: msg,
          location: { filePath: directoryPath, line: 1, column: 1 },
          severity: 'warning' as const,
        })),
        parseDurationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        files: [],
        totalFiles: 0,
        totalLinesOfCode: 0,
        parseErrors: [
          {
            message: `Rust parser execution failed: ${error}`,
            location: { filePath: directoryPath, line: 1, column: 1 },
            severity: 'error',
          },
        ],
        parseDurationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if Rust parser binary exists
   */
  private checkRustParserExists(): boolean {
    try {
      return fs.existsSync(this.rustParserPath);
    } catch {
      return false;
    }
  }

  /**
   * Call Rust parser CLI and get JSON output
   */
  private callRustParser(directoryPath: string): Promise<RustParseOutput> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.rustParserPath, [directoryPath, '--json']);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const output = JSON.parse(stdout);
            resolve(output);
          } catch (error) {
            reject(new Error(`Failed to parse Rust parser output: ${error}`));
          }
        } else {
          reject(new Error(`Rust parser failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn Rust parser: ${error}`));
      });
    });
  }

  /**
   * Transform Rust parser output to unified CodeElement types
   *
   * REASONING CHAIN:
   * 1. Rust output has different structure (structs, traits, impls)
   * 2. Need to map to unified types (ClassElement, FunctionElement, etc.)
   * 3. Preserve Rust-specific info in metadata
   * 4. Result: Analyzers work on same types regardless of language
   */
  private transformRustOutput(output: RustParseOutput): ParsedFile[] {
    return output.files.map((file) => this.transformFile(file));
  }

  private transformFile(file: RustParsedFile): ParsedFile {
    const elements: CodeElement[] = [];
    const dependencies: Dependency[] = [];

    // Transform structs
    file.items
      .filter((item) => item.kind === 'struct')
      .forEach((item) => {
        const structElement: StructElement = {
          type: ElementType.STRUCT,
          name: item.name,
          location: this.convertLocation(file.path, item.location),
          documentation: item.documentation,
          metadata: {
            derives: item.attrs?.filter((a) => a.startsWith('derive')),
          },
          fields: (item.fields || []).map((f) => this.transformField(f, file.path)),
          isPublic: item.visibility === 'pub',
          genericParams: [], // TODO: Extract from item.attrs if present
        };
        elements.push(structElement);
      });

    // Transform traits
    file.items
      .filter((item) => item.kind === 'trait')
      .forEach((item) => {
        const traitElement: TraitElement = {
          type: ElementType.TRAIT,
          name: item.name,
          location: this.convertLocation(file.path, item.location),
          documentation: item.documentation,
          metadata: {},
          methods: (item.methods || []).map((m) => this.transformMethod(m, file.path)),
          isPublic: item.visibility === 'pub',
        };
        elements.push(traitElement);
      });

    // Transform impls
    file.items
      .filter((item) => item.kind === 'impl')
      .forEach((item) => {
        const implElement: ImplElement = {
          type: ElementType.IMPL,
          name: `impl ${item.impl_trait || ''} for ${item.impl_target}`.trim(),
          location: this.convertLocation(file.path, item.location),
          documentation: item.documentation,
          metadata: {},
          targetType: item.impl_target || '',
          traitName: item.impl_trait,
          methods: (item.methods || []).map((m) => this.transformMethod(m, file.path)),
        };
        elements.push(implElement);
      });

    // Transform free functions
    file.items
      .filter((item) => item.kind === 'fn')
      .forEach((item) => {
        const funcElement: FunctionElement = {
          type: ElementType.FUNCTION,
          name: item.name,
          location: this.convertLocation(file.path, item.location),
          documentation: item.documentation,
          metadata: {},
          parameters: (item.params || []).map((p) => ({
            name: p.name,
            type: p.type,
            isOptional: false,
          })),
          returnType: item.return_type,
          isAsync: item.attrs?.includes('async') || false,
          isExported: item.visibility === 'pub',
        };
        elements.push(funcElement);
      });

    // Transform dependencies (uses)
    file.uses.forEach((use_stmt) => {
      dependencies.push({
        from: file.path,
        to: use_stmt.path,
        type: DependencyType.IMPORT,
        importedSymbols: use_stmt.items,
      });
    });

    return {
      filePath: file.path,
      language: 'rust',
      elements,
      dependencies,
      linesOfCode: file.loc,
      parseErrors: [],
    };
  }

  private transformField(field: RustField, filePath: string): PropertyElement {
    return {
      type: ElementType.PROPERTY,
      name: field.name,
      location: this.convertLocation(filePath, field.location),
      documentation: undefined,
      metadata: {},
      propertyType: field.type,
      visibility: field.visibility === 'pub' ? 'public' : 'private',
      isStatic: false,
      isReadonly: false, // Rust doesn't have explicit readonly, handle via &references
    };
  }

  private transformMethod(method: RustMethod, filePath: string): MethodElement {
    return {
      type: ElementType.METHOD,
      name: method.name,
      location: this.convertLocation(filePath, method.location),
      documentation: undefined,
      metadata: {},
      parameters: method.params.map((p) => ({
        name: p.name,
        type: p.type,
        isOptional: false,
      })),
      returnType: method.return_type,
      isAsync: method.is_async,
      isExported: method.visibility === 'pub',
      visibility: method.visibility === 'pub' ? 'public' : 'private',
      isStatic: false, // TODO: Detect from params (no &self)
      isAbstract: false,
      complexity: 1, // TODO: Calculate complexity in Rust parser
    };
  }

  private convertLocation(
    filePath: string,
    location: { line: number; column: number }
  ): SourceLocation {
    return {
      filePath,
      line: location.line,
      column: location.column,
    };
  }
}
