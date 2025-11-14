/**
 * Task Document Migration Script (Pattern-DOCS-002 v1.1)
 *
 * Migrates existing task documents to sprint-aware naming convention.
 *
 * Old: BUG-011_ENHANCED_PROMPT.md
 * New: 17.1-BUGS_BUG-011_ENHANCED_PROMPT.md
 *
 * Also updates all TOML references automatically.
 *
 * Usage:
 *   node scripts/migrate-task-docs.js --dry-run   # Preview changes
 *   node scripts/migrate-task-docs.js              # Execute migration
 */

const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');

const SPRINTS_DIR = 'internal/sprints';
const DOC_TYPES = {
  'enhanced_prompts': 'enhanced_prompt',
  'questions': 'questions_doc',
  'test_plans': 'test_plan',
  'design': 'design_doc',
  'retrospectives': 'retrospective',
  'notes': 'notes',
  'audits': 'audit_report_doc',
  'completion': 'completion_report_doc'
};

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Extract sprint ID from TOML filename
 */
function extractSprintId(filename) {
  const match = filename.match(/^ACTIVE_SPRINT_(.+)\.toml$/);
  if (!match) return 'UNKNOWN';
  return match[1].replace(/_/g, '-');
}

/**
 * Parse old-style filename: {TASK_ID}_{TYPE}.md
 */
function parseOldFilename(filename) {
  if (filename.includes('TEMPLATE') || filename.includes('MVP-')) {
    return null;
  }

  // Check if already migrated (contains sprint ID prefix)
  if (filename.match(/^[A-Z0-9.-]+_[A-Z]+-\d/)) {
    return null;
  }

  const match = filename.match(/^([A-Z]+-\d+[A-Z.]*)_([A-Z_]+)\.md$/);
  if (!match) return null;

  const [, taskId, docType] = match;
  return { taskId, docType };
}

/**
 * Find which sprint owns a task
 */
function findTaskOwner(taskId, allTasks) {
  return allTasks.get(taskId);
}

/**
 * Update TOML file with new document path
 */
function updateTomlReference(sprintPath, taskId, field, oldPath, newPath) {
  const content = fs.readFileSync(sprintPath, 'utf-8');

  // Replace old path with new path
  const oldPathEscaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${field}\\s*=\\s*")${oldPathEscaped}(")`, 'g');
  const updatedContent = content.replace(regex, `$1${newPath}$2`);

  if (!DRY_RUN) {
    fs.writeFileSync(sprintPath, updatedContent, 'utf-8');
  }

  return updatedContent !== content;
}

/**
 * Main migration function
 */
async function migrateTaskDocs() {
  console.log(DRY_RUN ? '🔍 DRY RUN: Preview migration (no changes)\n' : '🚀 Migrating task documents to sprint-aware naming...\n');

  const changes = [];

  // Step 1: Load all sprint TOML files
  const sprintFiles = fs.readdirSync(SPRINTS_DIR)
    .filter(f => f.startsWith('ACTIVE_SPRINT') && f.endsWith('.toml'));

  const allTasks = new Map();

  for (const sprintFile of sprintFiles) {
    const sprintId = extractSprintId(sprintFile);
    const sprintPath = path.join(SPRINTS_DIR, sprintFile);
    const content = fs.readFileSync(sprintPath, 'utf-8');
    const data = toml.parse(content);

    if (!data.tasks) continue;

    for (const [taskId, task] of Object.entries(data.tasks)) {
      allTasks.set(taskId, { sprint: sprintFile, sprintId, sprintPath, task });
    }
  }

  console.log(`Found ${allTasks.size} tasks in ${sprintFiles.length} sprint files\n`);

  // Step 2: Find all old-format documents
  let filesRenamed = 0;
  let tomlUpdates = 0;

  for (const [dirName, tomlField] of Object.entries(DOC_TYPES)) {
    const dirPath = path.join(SPRINTS_DIR, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const parsed = parseOldFilename(file);
      if (!parsed) continue; // Skip templates or already migrated

      const { taskId, docType } = parsed;
      const owner = findTaskOwner(taskId, allTasks);

      if (!owner) {
        console.log(`⚠️  Skipping ${file}: Task ${taskId} not found in any sprint`);
        continue;
      }

      // Generate new filename
      const newFilename = `${owner.sprintId}_${taskId}_${docType}.md`;
      const oldPath = path.join(dirPath, file);
      const newPath = path.join(dirPath, newFilename);

      // Check if already migrated
      if (file.includes(owner.sprintId)) {
        console.log(`✅ Already migrated: ${file}`);
        continue;
      }

      // Rename file
      console.log(`📝 Renaming: ${file}`);
      console.log(`   → ${newFilename}`);

      if (!DRY_RUN) {
        fs.renameSync(oldPath, newPath);
      }
      filesRenamed++;

      // Update TOML reference
      const oldTomlPath = `internal/sprints/${dirName}/${file}`;
      const newTomlPath = `internal/sprints/${dirName}/${newFilename}`;

      console.log(`   Updating TOML: [tasks.${taskId}].${tomlField}`);
      console.log(`   ${owner.sprint}`);

      const updated = updateTomlReference(
        owner.sprintPath,
        taskId,
        tomlField,
        oldTomlPath,
        newTomlPath
      );

      if (updated) {
        tomlUpdates++;
      }

      console.log();

      changes.push({
        taskId,
        oldFile: file,
        newFile: newFilename,
        sprint: owner.sprint
      });
    }
  }

  // Step 3: Summary
  console.log('━'.repeat(60));
  console.log('\n📊 Migration Summary:\n');
  console.log(`Files renamed: ${filesRenamed}`);
  console.log(`TOML references updated: ${tomlUpdates}`);
  console.log(`Total changes: ${changes.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN: No changes made. Run without --dry-run to execute migration.');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Run validation: node scripts/validate-task-docs.js');
    console.log('2. Review changes: git status && git diff');
    console.log('3. Commit changes: git add . && git commit -m "docs: Migrate to sprint-aware naming (INFRA-003)"');
  }

  return changes.length;
}

// Run migration
migrateTaskDocs()
  .then(count => {
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
