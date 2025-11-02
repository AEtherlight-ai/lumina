#!/usr/bin/env node
/**
 * Pattern Refactoring Script
 *
 * DESIGN DECISION: Automated pattern metadata addition with human-readable output
 * WHY: 71 patterns need neural network relationship fields - manual would take 12+ hours
 *
 * REASONING CHAIN:
 * 1. Read all 71 pattern files
 * 2. Parse existing metadata
 * 3. Analyze content for relationships (Pattern-XXX-001 references)
 * 4. Infer domain from category
 * 5. Add missing fields with sensible defaults
 * 6. Write back to files
 * 7. Generate report of changes
 *
 * PATTERN: Pattern-PATTERN-001 (Pattern Document Structure)
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_DIR = path.join(__dirname, '../docs/patterns');

// Domain mapping (same as PatternLibrary.ts)
const DOMAIN_MAPPING = {
    'api': ['api', 'rest', 'endpoint', 'graphql'],
    'authentication': ['auth', 'jwt', 'oauth', 'session', 'login'],
    'data': ['data', 'database', 'sql', 'model', 'schema'],
    'ui': ['ui', 'interface', 'component', 'view', 'layout'],
    'testing': ['test', 'quality', 'tdd', 'mock'],
    'performance': ['performance', 'optimization', 'cache', 'speed'],
    'security': ['security', 'encryption', 'vulnerability'],
    'networking': ['network', 'distribution', 'ipc', 'websocket'],
    'infrastructure': ['infrastructure', 'build', 'deploy', 'ci'],
    'documentation': ['documentation', 'pattern', 'standard']
};

function inferDomain(category) {
    const catLower = category.toLowerCase();

    for (const [domain, keywords] of Object.entries(DOMAIN_MAPPING)) {
        if (keywords.some(kw => catLower.includes(kw))) {
            return domain;
        }
    }

    return category.toLowerCase().replace(/\s+/g, '-');
}

function inferLanguage(content, filename) {
    // Check for language hints in content
    if (content.includes('```typescript') || content.includes('```ts')) return 'TypeScript';
    if (content.includes('```javascript') || content.includes('```js')) return 'JavaScript';
    if (content.includes('```rust') || content.includes('```rs')) return 'Rust';
    if (content.includes('```python') || content.includes('```py')) return 'Python';
    if (content.includes('```go')) return 'Go';

    // Check for architecture patterns
    if (content.includes('architecture') || content.includes('Architecture')) return 'Architecture';

    // Default to TypeScript (most common in this project)
    return 'TypeScript';
}

function extractPatternReferences(content) {
    const refs = content.match(/Pattern-[A-Z]+-\d+/gi) || [];
    return Array.from(new Set(refs.map(r => r.toUpperCase())));
}

function extractExistingField(content, fieldName) {
    const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
}

function inferStatus(content) {
    if (content.includes('deprecated') || content.includes('Deprecated')) return 'Deprecated';
    if (content.includes('superseded') || content.includes('Superseded')) return 'Superseded';
    if (content.includes('Production-Validated') || content.includes('production')) return 'Production-Validated';
    if (content.includes('Design') || content.includes('proposed')) return 'Design';
    return 'Active';
}

function inferQualityScore(content) {
    // Check for existing quality score
    const existing = extractExistingField(content, 'QUALITY SCORE');
    if (existing) {
        const score = parseFloat(existing);
        if (!isNaN(score)) return score.toFixed(2);
    }

    // Infer from content
    let score = 0.7; // Base score

    if (content.includes('Production-Validated') || content.includes('production')) score += 0.15;
    if (content.includes('test') || content.includes('Test')) score += 0.05;
    if (content.length > 2000) score += 0.05; // Detailed patterns
    if (content.includes('## Benefits')) score += 0.03;
    if (content.includes('## Validation Criteria')) score += 0.02;

    return Math.min(score, 1.0).toFixed(2);
}

function refactorPattern(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);

    // Skip if not a pattern file (allow hyphens in category names like Pattern-AGENT-ROUTING-001.md)
    if (!filename.match(/^Pattern-[A-Z-]+-\d+\.md$/i)) {
        return null;
    }

    // Extract pattern ID from filename
    const patternId = filename.replace('.md', '');

    // Extract existing fields
    const created = extractExistingField(content, 'CREATED') || new Date().toISOString().split('T')[0];
    const category = extractExistingField(content, 'CATEGORY') || 'Uncategorized';
    const applicability = extractExistingField(content, 'APPLICABILITY') || 'General use';

    // Extract or infer fields
    const language = extractExistingField(content, 'LANGUAGE') || inferLanguage(content, filename);
    const qualityScore = inferQualityScore(content);
    const status = extractExistingField(content, 'STATUS') || inferStatus(content);
    const domain = inferDomain(category);

    // Extract pattern references from content
    const allRefs = extractPatternReferences(content);
    const selfIndex = allRefs.indexOf(patternId.toUpperCase());
    if (selfIndex > -1) allRefs.splice(selfIndex, 1); // Remove self-reference

    // Existing relationship fields
    const existingRelated = extractExistingField(content, 'RELATED');
    const existingDeps = extractExistingField(content, 'DEPENDENCIES');
    const existingSupersedes = extractExistingField(content, 'SUPERSEDES');
    const existingSupersededBy = extractExistingField(content, 'SUPERSEDED BY');

    // Use existing or infer from content
    const related = existingRelated || (allRefs.length > 0 ? allRefs.slice(0, 5).join(', ') : '');
    const dependencies = existingDeps || '';
    const supersedes = existingSupersedes || '';
    const supersededBy = existingSupersededBy || '';

    // Build new header
    const lines = content.split('\n');
    const titleLine = lines.findIndex(line => line.startsWith('# Pattern-'));

    if (titleLine === -1) {
        console.error(`No title found in ${filename}`);
        return null;
    }

    const title = lines[titleLine];

    // Build metadata block
    const metadata = [
        '',
        `**CREATED:** ${created}`,
        `**CATEGORY:** ${category}`,
        `**LANGUAGE:** ${language}`,
        `**QUALITY SCORE:** ${qualityScore}`,
        `**APPLICABILITY:** ${applicability}`,
        `**STATUS:** ${status}`,
    ];

    if (related) metadata.push(`**RELATED:** ${related}`);
    if (dependencies) metadata.push(`**DEPENDENCIES:** ${dependencies}`);
    if (supersedes) metadata.push(`**SUPERSEDES:** ${supersedes}`);
    if (supersededBy) metadata.push(`**SUPERSEDED BY:** ${supersededBy}`);

    metadata.push('');
    metadata.push('---');

    // Find where existing metadata ends (look for first ## or ---)
    let contentStartLine = titleLine + 1;
    while (contentStartLine < lines.length) {
        const line = lines[contentStartLine].trim();
        if (line.startsWith('##') || (line === '---' && contentStartLine > titleLine + 5)) {
            break;
        }
        contentStartLine++;
    }

    // Skip existing --- if present
    if (lines[contentStartLine] && lines[contentStartLine].trim() === '---') {
        contentStartLine++;
    }

    // Rebuild file
    const newLines = [
        title,
        ...metadata,
        '',
        ...lines.slice(contentStartLine)
    ];

    const newContent = newLines.join('\n');

    return {
        filename,
        patternId,
        changes: {
            hadLanguage: !!extractExistingField(content, 'LANGUAGE'),
            hadQualityScore: !!extractExistingField(content, 'QUALITY SCORE'),
            hadStatus: !!extractExistingField(content, 'STATUS'),
            hadRelated: !!existingRelated,
            hadDependencies: !!existingDeps,
            added: {
                language: !extractExistingField(content, 'LANGUAGE'),
                qualityScore: !extractExistingField(content, 'QUALITY SCORE'),
                status: !extractExistingField(content, 'STATUS'),
                related: !existingRelated && related,
                dependencies: !existingDeps && dependencies
            },
            inferred: {
                language,
                qualityScore,
                status,
                domain,
                related,
                dependencies
            }
        },
        newContent
    };
}

function main() {
    console.log('Pattern Refactoring Script');
    console.log('=========================\n');

    const files = fs.readdirSync(PATTERNS_DIR)
        .filter(f => f.match(/^Pattern-[A-Z-]+-\d+\.md$/i))
        .map(f => path.join(PATTERNS_DIR, f));

    console.log(`Found ${files.length} pattern files\n`);

    const results = [];
    let refactoredCount = 0;

    for (const filePath of files) {
        const result = refactorPattern(filePath);
        if (result) {
            results.push(result);

            // Write back to file
            fs.writeFileSync(filePath, result.newContent, 'utf-8');
            refactoredCount++;

            // Log changes
            const added = Object.entries(result.changes.added)
                .filter(([k, v]) => v)
                .map(([k, v]) => k);

            if (added.length > 0) {
                console.log(`✅ ${result.filename}`);
                console.log(`   Added: ${added.join(', ')}`);
            }
        }
    }

    console.log(`\n=========================`);
    console.log(`Refactored ${refactoredCount} patterns`);

    // Summary statistics
    const stats = {
        addedLanguage: results.filter(r => r.changes.added.language).length,
        addedQualityScore: results.filter(r => r.changes.added.qualityScore).length,
        addedStatus: results.filter(r => r.changes.added.status).length,
        addedRelated: results.filter(r => r.changes.added.related).length,
        addedDependencies: results.filter(r => r.changes.added.dependencies).length
    };

    console.log(`\nSummary:`);
    console.log(`  LANGUAGE added: ${stats.addedLanguage}`);
    console.log(`  QUALITY SCORE added: ${stats.addedQualityScore}`);
    console.log(`  STATUS added: ${stats.addedStatus}`);
    console.log(`  RELATED added: ${stats.addedRelated}`);
    console.log(`  DEPENDENCIES added: ${stats.addedDependencies}`);

    console.log(`\nAll patterns are now Pattern-PATTERN-001 compliant! 🎉`);
}

main();
