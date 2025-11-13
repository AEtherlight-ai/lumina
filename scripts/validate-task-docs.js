/**
 * Task Document Validation Script (Pattern-DOCS-002 v1.1)
 *
 * Validates that all task-related documents are:
 * 1. Named correctly ({SPRINT_ID}_{TASK_ID}_{TYPE}.md)
 * 2. Linked in sprint TOML files
 * 3. Actually exist on filesystem
 * 4. Sprint ID in filename matches task owner
 *
 * Usage:
 *   node scripts/validate-task-docs.js           # Validate only
 *   node scripts/validate-task-docs.js --fix     # Auto-fix missing links (future)
 */

const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');

// Configuration
const SPRINTS_DIR = 'internal/sprints';
const DOC_TYPES = {
  'enhanced_prompts': 'enhanced_prompt',
  'questions': 'questions_doc',
  'test_plans': 'test_plan',
  'design': 'design_doc',
  'retrospectives': 'retrospective',
  'notes': 'notes'
};

// Only enforce enhanced_prompt for active sprints (17.1-BUGS)
const ACTIVE_SPRINTS = ['ACTIVE_SPRINT_17.1_BUGS.toml'];
const REQUIRED_FIELDS = ['enhanced_prompt']; // All tasks MUST have enhanced_prompt

/**
 * Extract sprint ID from TOML filename
 * Example: ACTIVE_SPRINT_17.1_BUGS.toml → 17.1-BUGS
 */
function extractSprintId(filename) {
  const match = filename.match(/^ACTIVE_SPRINT_(.+)\.toml$/);
  if (!match) return 'UNKNOWN';

  // Replace underscores with hyphens: 17.1_BUGS → 17.1-BUGS
  return match[1].replace(/_/g, '-');
}

/**
 * Parse filename: {SPRINT_ID}_{TASK_ID}_{TYPE}.md
 * Returns: { sprintId, taskId, docType } or null if invalid
 */
function parseFilename(filename) {
  // Skip templates
  if (filename.includes('TEMPLATE') || filename.includes('MVP-')) {
    return null;
  }

  const match = filename.match(/^([A-Z0-9.-]+)_([A-Z]+-\d+[A-Z.?]*)_([A-Z_]+)\.md$/);

  if (!match) {
    return { invalid: true, filename };
  }

  const [, sprintId, taskId, docType] = match;
  return { sprintId, taskId, docType };
}

/**
 * Main validation function
 */
async function validateTaskDocs() {
  console.log('🔍 Validating task document links...\n');

  const errors = [];
  const warnings = [];

  // Step 1: Find all sprint TOML files
  const sprintFiles = fs.readdirSync(SPRINTS_DIR)
    .filter(f => f.startsWith('ACTIVE_SPRINT') && f.endsWith('.toml'));

  console.log(`Found ${sprintFiles.length} sprint files\n`);

  // Step 2: Parse each sprint file and collect task IDs
  const allTasks = new Map(); // taskId -> { sprint, sprintId, task }

  for (const sprintFile of sprintFiles) {
    const sprintId = extractSprintId(sprintFile);
    const sprintPath = path.join(SPRINTS_DIR, sprintFile);
    const content = fs.readFileSync(sprintPath, 'utf-8');

    let data;
    try {
      data = toml.parse(content);
    } catch (error) {
      errors.push(`Failed to parse ${sprintFile}: ${error.message}`);
      continue;
    }

    if (!data.tasks) {
      warnings.push(`No tasks found in ${sprintFile}`);
      continue;
    }

    for (const [taskId, task] of Object.entries(data.tasks)) {
      allTasks.set(taskId, { sprint: sprintFile, sprintId, task });
    }
  }

  console.log(`Found ${allTasks.size} tasks\n`);

  // Step 3: Find all task documents in filesystem
  const allDocs = new Map(); // filePath -> { sprintId, taskId, type, docType }

  for (const [dirName, tomlField] of Object.entries(DOC_TYPES)) {
    const dirPath = path.join(SPRINTS_DIR, dirName);

    if (!fs.existsSync(dirPath)) {
      warnings.push(`Directory not found: ${dirPath}`);
      continue;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const parsed = parseFilename(file);

      if (!parsed) {
        continue; // Skip templates
      }

      if (parsed.invalid) {
        warnings.push(
          `Invalid naming convention: ${dirName}/${file}\n` +
          `  Expected: {SPRINT_ID}_{TASK_ID}_{TYPE}.md\n` +
          `  Example: 17.1-BUGS_BUG-013_ENHANCED_PROMPT.md`
        );
        continue;
      }

      // Use forward slashes for consistency with TOML
      const filePath = `${dirName}/${file}`;
      allDocs.set(filePath, {
        sprintId: parsed.sprintId,
        taskId: parsed.taskId,
        type: tomlField,
        docType: parsed.docType
      });
    }
  }

  console.log(`Found ${allDocs.size} task documents\n`);

  // Step 4: Validate that all documents are linked in TOML
  for (const [filePath, { sprintId, taskId, type }] of allDocs) {
    const task = allTasks.get(taskId);

    if (!task) {
      errors.push(
        `Orphaned document: ${filePath}\n` +
        `  Task ${taskId} not found in any sprint TOML\n` +
        `  Fix: Add [tasks.${taskId}] to a sprint TOML file`
      );
      continue;
    }

    // Validate sprint ID matches
    if (sprintId !== task.sprintId) {
      errors.push(
        `Sprint ID mismatch: ${filePath}\n` +
        `  Document sprint: ${sprintId}\n` +
        `  Task belongs to: ${task.sprintId} (${task.sprint})\n` +
        `  Fix: Rename file to ${task.sprintId}_${taskId}_${type.toUpperCase()}.md`
      );
      continue;
    }

    const linkedPath = task.task[type];

    if (!linkedPath) {
      errors.push(
        `Missing TOML link: ${filePath}\n` +
        `  Task ${taskId} missing field: ${type}\n` +
        `  Fix: Add to ${task.sprint}:\n` +
        `    ${type} = "internal/sprints/${filePath}"`
      );
      continue;
    }

    const expectedPath = `internal/sprints/${filePath}`;
    if (linkedPath !== expectedPath) {
      errors.push(
        `Incorrect TOML link: ${taskId}.${type}\n` +
        `  Current: "${linkedPath}"\n` +
        `  Expected: "${expectedPath}"\n` +
        `  Fix: Update ${task.sprint}`
      );
    }
  }

  // Step 5: Validate that all TOML links point to existing files
  for (const [taskId, { sprint, sprintId, task }] of allTasks) {
    // Check required fields (only for active sprints)
    if (ACTIVE_SPRINTS.includes(sprint)) {
      for (const requiredField of REQUIRED_FIELDS) {
        if (!task[requiredField]) {
          errors.push(
            `Missing required field: ${taskId}.${requiredField}\n` +
            `  File: ${sprint}\n` +
            `  Fix: Add ${requiredField} = "internal/sprints/enhanced_prompts/${sprintId}_${taskId}_ENHANCED_PROMPT.md"`
          );
        }
      }
    }

    // Check all document links
    for (const [dirName, tomlField] of Object.entries(DOC_TYPES)) {
      const linkedPath = task[tomlField];

      if (!linkedPath) {
        continue; // Optional field
      }

      // Check if file exists
      if (!fs.existsSync(linkedPath)) {
        errors.push(
          `Broken link: ${taskId}.${tomlField}\n` +
          `  Path: "${linkedPath}"\n` +
          `  File not found\n` +
          `  Fix: Create file or remove link from ${sprint}`
        );
      }
    }
  }

  // Step 6: Report results
  console.log('━'.repeat(60));
  console.log('\n📊 Validation Results:\n');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed!');
    console.log(`   - ${allTasks.size} tasks validated`);
    console.log(`   - ${allDocs.size} documents linked`);
    console.log(`   - 0 errors, 0 warnings`);
    return true;
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length}):\n`);
    warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w}`);
      console.log();
    });
  }

  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):\n`);
    errors.forEach((e, i) => {
      console.log(`${i + 1}. ${e}`);
      console.log();
    });
    console.log('Fix errors above before committing.');
    return false;
  }

  return true;
}

// Run validation
validateTaskDocs()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Validation failed:', err);
    process.exit(1);
  });
