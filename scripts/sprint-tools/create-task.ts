#!/usr/bin/env ts-node
/**
 * Interactive Task Creation Wizard
 *
 * DESIGN DECISION: Interactive CLI wizard with Chain of Thought fields
 * WHY: Enable rapid task creation with comprehensive context (<5 min vs 20+ min manual)
 *
 * REASONING CHAIN:
 * 1. ENORM-010 added CoT fields to tasks (why, context, reasoning_chain, success_impact)
 * 2. Manual task creation is slow and error-prone (copy-paste from template)
 * 3. Interactive wizard guides users through all required fields
 * 4. Validates input and generates properly formatted TOML
 * 5. Optionally appends to ACTIVE_SPRINT.toml
 * 6. Result: Tasks created in <5 min with complete Chain of Thought
 *
 * PATTERN: Pattern-SPRINT-001 (Systematic Daily Work Tracking)
 * RELATED: ENORM-010, enhanced-task-template.toml, SOP-009
 * PERFORMANCE: Task creation <5 min (vs 20+ min manual)
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

interface TaskData {
  id: string;
  short_id?: string;
  name: string;
  phase: string;
  assigned_engineer: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  estimated_lines: number;
  estimated_time: string;
  why: string;
  context: string;
  reasoning_chain: string[];
  success_impact: string;
  dependencies: string[];
  agent?: string;
  deliverables: string[];
  performance_target?: string;
  patterns: string[];
  files_to_create: string[];
  validation_criteria: string[];
  notes?: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function parseArray(input: string): string[] {
  return input.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

async function promptForTask(): Promise<TaskData> {
  console.log('\n=== ÆtherLight Sprint Task Creation Wizard ===\n');
  console.log('This wizard will guide you through creating a new sprint task with Chain of Thought context.\n');

  // Basic Info
  console.log('--- Basic Information ---');
  const id = await question('Task ID (e.g., ENORM-011): ');
  const short_id = await question('Short ID (optional, e.g., task-rls-validation): ');
  const name = await question('Task Name: ');
  const phase = await question('Phase (e.g., Enforcement Normalization - Skills Builder): ');
  const assigned_engineer = await question('Assigned Engineer (e.g., engineer_1): ');
  const status = await question('Status (pending/in_progress/completed) [pending]: ') || 'pending';
  const description = await question('Description (1-2 sentences): ');

  // Estimates
  console.log('\n--- Estimates ---');
  const estimated_lines = parseInt(await question('Estimated Lines of Code: '), 10);
  const estimated_time = await question('Estimated Time (e.g., 1-2 hours, 2-3 days): ');

  // Chain of Thought Fields
  console.log('\n--- Chain of Thought Context ---');
  console.log('(These fields help readers understand the task without external docs)\n');

  const why = await question('WHY: Why does this task exist? (1-3 sentences): ');

  const context = await question('CONTEXT: How does this fit into the bigger picture? (2-4 sentences): ');

  console.log('\nREASONING CHAIN: Enter each step (press Enter after each, type "done" when finished):');
  const reasoning_chain: string[] = [];
  let step_num = 1;
  while (true) {
    const step = await question(`  ${step_num}. `);
    if (step.toLowerCase() === 'done') break;
    if (step.trim()) {
      reasoning_chain.push(`${step_num}. ${step}`);
      step_num++;
    }
  }

  const success_impact = await question('SUCCESS IMPACT: What unlocks when this completes? (3-5 bullet points, separate with commas): ');

  // Dependencies & Relationships
  console.log('\n--- Dependencies & Relationships ---');
  const dependencies_str = await question('Dependencies (comma-separated task IDs, e.g., ENORM-005,ENORM-006): ');
  const dependencies = parseArray(dependencies_str);

  const agent = await question('Agent (optional, e.g., rust-core-dev, documentation-enforcer): ');

  const patterns_str = await question('Patterns (comma-separated, e.g., Pattern-META-001,Pattern-TRACKING-001): ');
  const patterns = parseArray(patterns_str);

  // Deliverables
  console.log('\n--- Deliverables ---');
  console.log('Enter deliverables (press Enter after each, type "done" when finished):');
  const deliverables: string[] = [];
  while (true) {
    const deliverable = await question('  - ');
    if (deliverable.toLowerCase() === 'done') break;
    if (deliverable.trim()) {
      deliverables.push(deliverable);
    }
  }

  // Files to Create
  console.log('\nEnter files to create (press Enter after each, type "done" when finished):');
  const files_to_create: string[] = [];
  while (true) {
    const file = await question('  - ');
    if (file.toLowerCase() === 'done') break;
    if (file.trim()) {
      files_to_create.push(file);
    }
  }

  // Validation Criteria
  console.log('\nEnter validation criteria (press Enter after each, type "done" when finished):');
  const validation_criteria: string[] = [];
  while (true) {
    const criterion = await question('  - ');
    if (criterion.toLowerCase() === 'done') break;
    if (criterion.trim()) {
      validation_criteria.push(criterion);
    }
  }

  // Optional Fields
  console.log('\n--- Optional Fields ---');
  const performance_target = await question('Performance Target (optional, e.g., <10ms response time): ');
  const notes = await question('Notes (optional, additional context): ');

  return {
    id,
    short_id: short_id || undefined,
    name,
    phase,
    assigned_engineer,
    status: status as 'pending' | 'in_progress' | 'completed',
    description,
    estimated_lines,
    estimated_time,
    why,
    context,
    reasoning_chain,
    success_impact,
    dependencies,
    agent: agent || undefined,
    deliverables,
    performance_target: performance_target || undefined,
    patterns,
    files_to_create,
    validation_criteria,
    notes: notes || undefined
  };
}

function generateTOML(task: TaskData): string {
  let toml = `\n[tasks.${task.id}]\n`;
  toml += `id = "${task.id}"\n`;
  if (task.short_id) toml += `short_id = "${task.short_id}"\n`;
  toml += `name = "${task.name}"\n`;
  toml += `phase = "${task.phase}"\n`;
  toml += `assigned_engineer = "${task.assigned_engineer}"\n`;
  toml += `status = "${task.status}"\n`;
  toml += `description = "${task.description}"\n`;
  toml += `estimated_lines = ${task.estimated_lines}\n`;
  toml += `estimated_time = "${task.estimated_time}"\n`;

  // Chain of Thought fields
  toml += `why = """\n${task.why}\n"""\n`;
  toml += `context = """\n${task.context}\n"""\n`;
  toml += `reasoning_chain = [\n`;
  task.reasoning_chain.forEach(step => {
    toml += `    "${step}",\n`;
  });
  toml += `]\n`;
  toml += `success_impact = """\n${task.success_impact}\n"""\n`;

  // Dependencies
  toml += `dependencies = [${task.dependencies.map(d => `"${d}"`).join(', ')}]\n`;
  if (task.agent) toml += `agent = "${task.agent}"\n`;

  // Deliverables
  toml += `deliverables = [\n`;
  task.deliverables.forEach(d => {
    toml += `    "${d}",\n`;
  });
  toml += `]\n`;

  if (task.performance_target) {
    toml += `performance_target = "${task.performance_target}"\n`;
  }

  // Patterns
  toml += `patterns = [${task.patterns.map(p => `"${p}"`).join(', ')}]\n`;

  // Files to create
  toml += `files_to_create = [\n`;
  task.files_to_create.forEach(f => {
    toml += `    "${f}",\n`;
  });
  toml += `]\n`;

  // Validation criteria
  toml += `validation_criteria = [\n`;
  task.validation_criteria.forEach(c => {
    toml += `    "${c}",\n`;
  });
  toml += `]\n`;

  if (task.notes) {
    toml += `notes = "${task.notes}"\n`;
  }

  return toml;
}

async function main() {
  try {
    const task = await promptForTask();
    const toml = generateTOML(task);

    console.log('\n--- Generated TOML ---');
    console.log(toml);

    const append = await question('\nAppend to ACTIVE_SPRINT.toml? (y/n) [n]: ');

    if (append.toLowerCase() === 'y') {
      const sprintPath = path.join(process.cwd(), 'sprints', 'ACTIVE_SPRINT.toml');

      if (!fs.existsSync(sprintPath)) {
        console.error(`Error: ${sprintPath} not found`);
        process.exit(1);
      }

      fs.appendFileSync(sprintPath, toml);
      console.log(`\n✅ Task ${task.id} appended to ACTIVE_SPRINT.toml`);
    } else {
      const filename = `${task.id.toLowerCase()}.toml`;
      fs.writeFileSync(filename, toml);
      console.log(`\n✅ Task written to ${filename}`);
    }

    console.log('\n--- Next Steps ---');
    console.log('1. Review the generated task in ACTIVE_SPRINT.toml');
    console.log('2. Adjust any fields if needed');
    console.log('3. Run: git add sprints/ACTIVE_SPRINT.toml');
    console.log('4. Commit with Chain of Thought message');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}
