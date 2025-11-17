const fs = require('fs');
const path = require('path');

// Fix PUBLISH-001 notes - replace inline content with file reference
const bugs17Path = path.join(__dirname, '..', 'internal', 'sprints', 'ACTIVE_SPRINT_17.1_BUGS.toml');
let bugsContent = fs.readFileSync(bugs17Path, 'utf8');

// Replace PUBLISH-001 inline notes with file reference
bugsContent = bugsContent.replace(
  /(\[tasks\.PUBLISH-001\][\s\S]*?notes = """)[^"]*?"""/m,
  '$1internal/sprints/notes/17.1-BUGS_PUBLISH-001_NOTES.md"""'
);

// Add missing enhanced_prompt fields for 17.1-BUGS tasks
const tasksToFix = [
  { id: 'UI-001', field: 'enhanced_prompt = "internal/sprints/enhanced_prompts/17.1-BUGS_UI-001_ENHANCED_PROMPT.md"' },
  { id: 'UI-002', field: 'enhanced_prompt = "internal/sprints/enhanced_prompts/17.1-BUGS_UI-002_ENHANCED_PROMPT.md"' },
  { id: 'BUG-001', field: 'enhanced_prompt = "internal/sprints/enhanced_prompts/17.1-BUGS_BUG-001_ENHANCED_PROMPT.md"' },
  { id: 'BUG-002B', field: 'enhanced_prompt = "internal/sprints/enhanced_prompts/17.1-BUGS_BUG-002B_ENHANCED_PROMPT.md"' },
  { id: 'BUG-002C', field: 'enhanced_prompt = "internal/sprints/enhanced_prompts/17.1-BUGS_BUG-002C_ENHANCED_PROMPT.md"' },
  { id: 'BUG-014', field: 'enhanced_prompt = "internal/sprints/enhanced_prompts/17.1-BUGS_BUG-014_ENHANCED_PROMPT.md"' },
  { id: 'VAL-002', field: 'enhanced_prompt = "internal/sprints/enhanced_prompts/17.1-BUGS_VAL-002_ENHANCED_PROMPT.md"' }
];

tasksToFix.forEach(task => {
  // Find the task and add enhanced_prompt field after agent or dependencies line
  const taskRegex = new RegExp(`(\\[tasks\\.${task.id}\\][\\s\\S]*?(?:agent = "[^"]*"|dependencies = \\[[^\\]]*\\]))\\n`, 'm');
  if (taskRegex.test(bugsContent)) {
    bugsContent = bugsContent.replace(taskRegex, `$1\n${task.field}\n`);
    console.log(`Added enhanced_prompt for ${task.id}`);
  }
});

fs.writeFileSync(bugs17Path, bugsContent, 'utf8');
console.log('Fixed ACTIVE_SPRINT_17.1_BUGS.toml');

// Fix REFACTOR-001 notes in WALKTHROUGH sprint
const walkthroughPath = path.join(__dirname, '..', 'internal', 'sprints', 'ACTIVE_SPRINT_WALKTHROUGH.toml');
let walkthroughContent = fs.readFileSync(walkthroughPath, 'utf8');

// Replace REFACTOR-001 inline notes with file reference
walkthroughContent = walkthroughContent.replace(
  /(\[tasks\.REFACTOR-001\][\s\S]*?notes = """)[^"]*?"""/m,
  '$1internal/sprints/notes/WALKTHROUGH_REFACTOR-001_NOTES.md"""'
);

fs.writeFileSync(walkthroughPath, walkthroughContent, 'utf8');
console.log('Fixed ACTIVE_SPRINT_WALKTHROUGH.toml');

// Check for MVP-003.enhanced_prompt and remove if it references missing file
if (bugsContent.includes('MVP-003_ENHANCED_PROMPT_v1.3.md')) {
  bugsContent = bugsContent.replace(
    /enhanced_prompt = "internal\/sprints\/enhanced_prompts\/MVP-003_ENHANCED_PROMPT_v1\.3\.md"\n/g,
    ''
  );
  fs.writeFileSync(bugs17Path, bugsContent, 'utf8');
  console.log('Removed broken MVP-003 enhanced_prompt reference');
}

console.log('All fixes applied!');
