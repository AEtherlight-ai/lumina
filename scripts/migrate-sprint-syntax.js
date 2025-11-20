#!/usr/bin/env node

/**
 * Sprint Syntax Migration Script
 *
 * Converts old {text} placeholder syntax to new <text> syntax in all sprint TOML files.
 *
 * WHY: {text} conflicts with TOML table headers, causes parse errors
 * FIX: Change to <text> which has no special meaning in TOML
 *
 * USAGE:
 *   node scripts/migrate-sprint-syntax.js           # Dry run (shows changes, doesn't modify)
 *   node scripts/migrate-sprint-syntax.js --apply   # Apply changes to files
 *
 * SAFETY:
 *   - Creates backups before modifying (.toml.backup)
 *   - Only modifies files in internal/sprints/ directory
 *   - Only replaces {text} inside quoted strings (not TOML table headers)
 *   - Shows diff before applying changes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SPRINT_DIR = path.join(__dirname, '..', 'internal', 'sprints');
const DRY_RUN = !process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Find all sprint TOML files
 */
function findSprintFiles() {
    if (!fs.existsSync(SPRINT_DIR)) {
        console.error(`❌ Sprint directory not found: ${SPRINT_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(SPRINT_DIR)
        .filter(file => file.endsWith('.toml'))
        .filter(file => !file.endsWith('.backup'))  // Skip backups
        .map(file => path.join(SPRINT_DIR, file));

    return files;
}

/**
 * Convert {text} to <text> in TOML string values
 *
 * Pattern explanation:
 * - Matches {anything} inside double quotes: "..{text}.."
 * - Matches {anything} inside single quotes: '..{text}..'
 * - Matches {anything} inside triple quotes: """..{text}..."""
 * - Replaces with <text> while preserving surrounding content
 */
function migrateSyntax(content) {
    let modified = content;

    // Replace {text} in double-quoted strings
    modified = modified.replace(/"([^"]*)\{([^}]+)\}([^"]*)"/g, '"$1<$2>$3"');

    // Replace {text} in single-quoted strings
    modified = modified.replace(/'([^']*)\{([^}]+)\}([^']*)'/g, "'$1<$2>$3'");

    // Replace {text} in triple-quoted strings (multiline)
    modified = modified.replace(/"""([^"]*)\{([^}]+)\}([^"]*)"""/gs, '"""$1<$2>$3"""');

    return modified;
}

/**
 * Detect if file has old {text} syntax
 */
function hasOldSyntax(content) {
    // Check for {text} inside quoted strings only
    const inDoubleQuotes = /"[^"]*\{[^}]+\}[^"]*"/.test(content);
    const inSingleQuotes = /'[^']*\{[^}]+\}[^']*'/.test(content);
    const inTripleQuotes = /"""[^"]*\{[^}]+\}[^"]*"""/.test(content);

    return inDoubleQuotes || inSingleQuotes || inTripleQuotes;
}

/**
 * Show diff between original and modified content
 */
function showDiff(filePath, original, modified) {
    const fileName = path.basename(filePath);
    const lines = original.split('\n');
    const modifiedLines = modified.split('\n');

    console.log(`\n📄 ${fileName}`);
    console.log('─'.repeat(80));

    let changesFound = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i] !== modifiedLines[i]) {
            changesFound = true;
            console.log(`Line ${i + 1}:`);
            console.log(`  - ${lines[i]}`);
            console.log(`  + ${modifiedLines[i]}`);
        }
    }

    if (!changesFound && VERBOSE) {
        console.log('  (no changes needed)');
    }

    return changesFound;
}

/**
 * Migrate a single sprint file
 */
function migrateFile(filePath) {
    const fileName = path.basename(filePath);

    // Read original content
    const original = fs.readFileSync(filePath, 'utf-8');

    // Check if migration needed
    if (!hasOldSyntax(original)) {
        if (VERBOSE) {
            console.log(`✅ ${fileName} - Already using new syntax`);
        }
        return { migrated: false, changes: 0 };
    }

    // Migrate syntax
    const modified = migrateSyntax(original);

    // Count changes
    const originalMatches = original.match(/\{[^}]+\}/g) || [];
    const modifiedMatches = modified.match(/<[^>]+>/g) || [];
    const changes = originalMatches.length;

    // Show diff
    const hasChanges = showDiff(filePath, original, modified);

    if (!hasChanges) {
        return { migrated: false, changes: 0 };
    }

    // Apply changes if not dry run
    if (!DRY_RUN) {
        // Create backup
        const backupPath = `${filePath}.backup`;
        fs.writeFileSync(backupPath, original, 'utf-8');
        console.log(`  📦 Backup created: ${path.basename(backupPath)}`);

        // Write modified content
        fs.writeFileSync(filePath, modified, 'utf-8');
        console.log(`  ✅ Changes applied`);
    }

    return { migrated: true, changes };
}

/**
 * Main migration function
 */
function main() {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   Sprint Syntax Migration Tool       ║');
    console.log('╚═══════════════════════════════════════╝\n');

    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE (no files will be modified)');
        console.log('   Run with --apply to apply changes\n');
    } else {
        console.log('⚠️  APPLY MODE (files will be modified)');
        console.log('   Backups will be created (.toml.backup)\n');
    }

    // Find sprint files
    const files = findSprintFiles();
    console.log(`📁 Found ${files.length} sprint files in ${SPRINT_DIR}\n`);

    // Migrate each file
    let totalMigrated = 0;
    let totalChanges = 0;

    for (const file of files) {
        const result = migrateFile(file);
        if (result.migrated) {
            totalMigrated++;
            totalChanges += result.changes;
        }
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Files scanned:  ${files.length}`);
    console.log(`Files migrated: ${totalMigrated}`);
    console.log(`Total changes:  ${totalChanges} ({text} → <text>)`);

    if (DRY_RUN && totalMigrated > 0) {
        console.log('\n💡 To apply these changes, run:');
        console.log('   node scripts/migrate-sprint-syntax.js --apply');
    } else if (!DRY_RUN && totalMigrated > 0) {
        console.log('\n✅ Migration complete! Backups saved as .toml.backup files');
        console.log('   Test your sprint files to ensure they work correctly');
        console.log('   If needed, restore from backups');
    } else {
        console.log('\n✅ No migration needed - all files already use <text> syntax');
    }

    console.log('');
}

// Run migration
try {
    main();
} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
