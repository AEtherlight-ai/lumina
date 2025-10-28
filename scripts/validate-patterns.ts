#!/usr/bin/env ts-node
/**
 * Pattern Validation Script - Enforce Chain of Thought Standards
 *
 * DESIGN DECISION: Strict validation BEFORE pattern creation/sync
 * WHY: Prevent incomplete patterns from polluting the network, ensure quality consistency
 *
 * REASONING CHAIN:
 * 1. Every pattern MUST have complete Chain of Thought (DESIGN DECISION + WHY + REASONING CHAIN)
 * 2. Validation runs at two points: (a) During pattern creation (pre-commit hook), (b) Before network sync
 * 3. Failed validation → detailed error report → automated fix suggestions
 * 4. Result: 100% pattern quality, zero incomplete patterns in network
 *
 * PATTERN: Pattern-VALIDATION-002 (Chain of Thought Validation)
 * RELATED: Pattern-META-001 (Documentation Feedback Loop)
 * PERFORMANCE: <100ms per pattern validation
 *
 * USAGE:
 * ```bash
 * # Validate all patterns
 * ts-node scripts/validate-patterns.ts
 *
 * # Validate specific pattern
 * ts-node scripts/validate-patterns.ts Pattern-EXAMPLE-001
 *
 * # CI/CD integration
 * ts-node scripts/validate-patterns.ts --strict  # Exit 1 on any failure
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  pattern_id: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  has_design_decision: boolean;
  has_why: boolean;
  has_reasoning_chain: boolean;
  reasoning_chain_steps: number;
}

interface ValidationReport {
  total_patterns: number;
  valid_patterns: number;
  invalid_patterns: number;
  results: ValidationResult[];
}

/**
 * Validate a single pattern file
 *
 * DESIGN DECISION: Three mandatory fields + quality checks
 * WHY: Chain of Thought requires all three for reasoning transparency
 */
function validatePattern(filePath: string): ValidationResult {
  const filename = path.basename(filePath, '.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  const result: ValidationResult = {
    pattern_id: filename,
    valid: true,
    errors: [],
    warnings: [],
    has_design_decision: false,
    has_why: false,
    has_reasoning_chain: false,
    reasoning_chain_steps: 0
  };

  // EDGE CASE HANDLING: Check for CoT both inside and outside code blocks
  // Some patterns (like Pattern-CLI-001) have CoT in code blocks

  // Check #1: DESIGN DECISION exists (check everywhere, including code blocks)
  const designMatchOutside = content.match(/\*\*DESIGN DECISION:\*\*\s*(.+?)(?:\n\n|\n\*\*|$)/s);
  const designMatchInside = content.match(/```[\w]*\r?\n[\s\S]*?\*\s*DESIGN DECISION:\s*(.+?)(?:\r?\n|\*)/);
  // Also check for multi-line comment blocks (/** ... */) inside code fences (Windows CRLF support)
  const designMatchComment = content.match(/```[\w]*\r?\n\/\*\*[\s\S]*?DESIGN DECISION:\s*(.+?)(?:\r?\n)/);
  const designMatch = designMatchOutside || designMatchInside || designMatchComment;

  if (!designMatch) {
    result.valid = false;
    result.errors.push('Missing DESIGN DECISION section (checked both outside and inside code blocks)');
  } else {
    result.has_design_decision = true;
    const decision = designMatch[1].trim();

    // Quality check: DESIGN DECISION should be substantial (>10 chars)
    if (decision.length < 10) {
      result.warnings.push('DESIGN DECISION is too short (should be a complete sentence)');
    }

    // If CoT is only in code block, warn about preferred format
    if ((designMatchInside || designMatchComment) && !designMatchOutside) {
      result.warnings.push('Chain of Thought found only in code block - prefer markdown format outside code blocks');
    }
  }

  // Check #2: WHY exists (check everywhere, including code blocks)
  const whyMatchOutside = content.match(/\*\*WHY:\*\*\s*(.+?)(?:\n\n|\n\*\*|$)/s);
  const whyMatchInside = content.match(/```[\w]*\r?\n[\s\S]*?\*\s*WHY:\s*(.+?)(?:\r?\n|\*)/);
  // Also check for multi-line comment blocks (/** ... */) inside code fences (Windows CRLF support)
  const whyMatchComment = content.match(/```[\w]*\r?\n\/\*\*[\s\S]*?WHY:\s*(.+?)(?:\r?\n)/);
  const whyMatch = whyMatchOutside || whyMatchInside || whyMatchComment;

  if (!whyMatch) {
    result.valid = false;
    result.errors.push('Missing WHY section (checked both outside and inside code blocks)');
  } else {
    result.has_why = true;
    const why = whyMatch[1].trim();

    // Quality check: WHY should explain reasoning (>20 chars)
    if (why.length < 20) {
      result.warnings.push('WHY is too short (should explain the reasoning)');
    }
  }

  // Check #3: REASONING CHAIN exists (check everywhere, including code blocks)
  const reasoningMatchOutside = content.match(/\*\*REASONING CHAIN:\*\*\s*\n((?:\d+\..+\n?)+)/);
  const reasoningMatchInside = content.match(/```[\w]*\r?\n[\s\S]*?\*\s*REASONING CHAIN:\s*\r?\n((?:\s*\*\s*\d+\..+[\r\n]?)+)/);
  // Also check for multi-line comment blocks (/** ... */) inside code fences (Windows CRLF support)
  const reasoningMatchComment = content.match(/```[\w]*\r?\n\/\*\*[\s\S]*?REASONING CHAIN:\s*\r?\n((?:\s*\*\s*\d+\..+[\r\n]?)+)/);
  const reasoningMatch = reasoningMatchOutside || reasoningMatchInside || reasoningMatchComment;

  if (!reasoningMatch) {
    result.valid = false;
    result.errors.push('Missing REASONING CHAIN section (checked both outside and inside code blocks)');
  } else {
    result.has_reasoning_chain = true;
    const steps = reasoningMatch[1]
      .split('\n')
      .filter(line => line.trim() && line.match(/\d+\./))
      .length;

    result.reasoning_chain_steps = steps;

    // Quality check: REASONING CHAIN should have at least 3 steps
    if (steps < 3) {
      result.warnings.push(`REASONING CHAIN has only ${steps} steps (should have at least 3)`);
    }
  }

  // Check #4: Pattern header exists
  if (!content.match(/^#\s+.+$/m)) {
    result.warnings.push('Missing pattern title (# heading)');
  }

  // Check #5: Pattern ID format
  if (!filename.match(/^Pattern-[A-Z-]+-\d+$/)) {
    result.warnings.push('Pattern ID format incorrect (should be Pattern-CATEGORY-###)');
  }

  return result;
}

/**
 * Validate all patterns in directory
 */
function validateAllPatterns(patternsDir: string): ValidationReport {
  const files = fs
    .readdirSync(patternsDir)
    .filter(file => file.endsWith('.md') && file.startsWith('Pattern-'))
    .sort();

  const results: ValidationResult[] = [];

  for (const file of files) {
    const filePath = path.join(patternsDir, file);
    const result = validatePattern(filePath);
    results.push(result);
  }

  const validPatterns = results.filter(r => r.valid).length;

  return {
    total_patterns: files.length,
    valid_patterns: validPatterns,
    invalid_patterns: files.length - validPatterns,
    results
  };
}

/**
 * Print validation report
 */
function printReport(report: ValidationReport, verbose: boolean = false) {
  console.log('\n━'.repeat(60));
  console.log('📊 PATTERN VALIDATION REPORT\n');
  console.log(`Total patterns:    ${report.total_patterns}`);
  console.log(`✅ Valid:          ${report.valid_patterns} (${Math.round(report.valid_patterns / report.total_patterns * 100)}%)`);
  console.log(`❌ Invalid:        ${report.invalid_patterns} (${Math.round(report.invalid_patterns / report.total_patterns * 100)}%)`);
  console.log('━'.repeat(60));

  // Print invalid patterns
  const invalidPatterns = report.results.filter(r => !r.valid);
  if (invalidPatterns.length > 0) {
    console.log('\n❌ INVALID PATTERNS:\n');

    for (const result of invalidPatterns) {
      console.log(`${result.pattern_id}:`);
      for (const error of result.errors) {
        console.log(`   ❌ ${error}`);
      }
      if (verbose && result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.log(`   ⚠️  ${warning}`);
        }
      }
      console.log('');
    }
  }

  // Print warnings (if verbose)
  if (verbose) {
    const patternsWithWarnings = report.results.filter(r => r.valid && r.warnings.length > 0);
    if (patternsWithWarnings.length > 0) {
      console.log('\n⚠️  PATTERNS WITH WARNINGS:\n');

      for (const result of patternsWithWarnings) {
        console.log(`${result.pattern_id}:`);
        for (const warning of result.warnings) {
          console.log(`   ⚠️  ${warning}`);
        }
        console.log('');
      }
    }
  }

  // Print summary statistics
  console.log('\n📈 STATISTICS:\n');
  const totalValid = report.results.filter(r => r.valid).length;
  const withDesignDecision = report.results.filter(r => r.has_design_decision).length;
  const withWhy = report.results.filter(r => r.has_why).length;
  const withReasoningChain = report.results.filter(r => r.has_reasoning_chain).length;

  console.log(`Patterns with DESIGN DECISION: ${withDesignDecision}/${report.total_patterns} (${Math.round(withDesignDecision / report.total_patterns * 100)}%)`);
  console.log(`Patterns with WHY:              ${withWhy}/${report.total_patterns} (${Math.round(withWhy / report.total_patterns * 100)}%)`);
  console.log(`Patterns with REASONING CHAIN:  ${withReasoningChain}/${report.total_patterns} (${Math.round(withReasoningChain / report.total_patterns * 100)}%)`);

  const avgSteps = report.results
    .filter(r => r.has_reasoning_chain)
    .reduce((sum, r) => sum + r.reasoning_chain_steps, 0) / withReasoningChain;

  console.log(`Average REASONING CHAIN steps:  ${avgSteps.toFixed(1)} steps`);
  console.log('━'.repeat(60));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const strictMode = args.includes('--strict');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const specificPattern = args.find(arg => !arg.startsWith('--'));

  const patternsDir = path.join(__dirname, '../docs/patterns');

  if (specificPattern) {
    // Validate single pattern
    const filePath = path.join(patternsDir, `${specificPattern}.md`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Pattern not found: ${specificPattern}`);
      process.exit(1);
    }

    console.log(`\n🔍 Validating ${specificPattern}...\n`);
    const result = validatePattern(filePath);

    if (result.valid) {
      console.log('✅ Pattern is VALID\n');
      console.log(`   ✅ DESIGN DECISION: ${result.has_design_decision ? 'Present' : 'Missing'}`);
      console.log(`   ✅ WHY: ${result.has_why ? 'Present' : 'Missing'}`);
      console.log(`   ✅ REASONING CHAIN: ${result.has_reasoning_chain ? `Present (${result.reasoning_chain_steps} steps)` : 'Missing'}`);

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`   ⚠️  ${warning}`);
        }
      }
    } else {
      console.log('❌ Pattern is INVALID\n');
      for (const error of result.errors) {
        console.log(`   ❌ ${error}`);
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`   ⚠️  ${warning}`);
        }
      }

      process.exit(1);
    }
  } else {
    // Validate all patterns
    console.log('\n🔍 Validating all patterns...\n');
    const report = validateAllPatterns(patternsDir);
    printReport(report, verbose);

    if (strictMode && report.invalid_patterns > 0) {
      console.log('\n❌ Strict mode enabled: Exiting with error code 1');
      process.exit(1);
    }
  }
}

// Run validation
main();
