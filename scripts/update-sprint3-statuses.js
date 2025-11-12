const fs = require('fs');
const path = require('path');

const sprintPath = path.join(__dirname, '..', 'internal', 'sprints', 'ACTIVE_SPRINT.toml');
let content = fs.readFileSync(sprintPath, 'utf-8');

// Tasks to mark as completed
const completed = ['DOC-006', 'AGENT-001', 'AGENT-002', 'DOC-008'];
completed.forEach(id => {
  const regex = new RegExp(`(\\[tasks\\.${id}\\][\\s\\S]*?status = ")pending(")`, 'g');
  content = content.replace(regex, '$1completed$2');
});

// Mark DOC-007 as not_applicable
const notApplicableRegex = /(\[tasks\.DOC-007\][\s\S]*?status = ")pending(")/g;
content = content.replace(notApplicableRegex, '$1not_applicable$2');

// Mark SELF-022 through SELF-025 and RETRO tasks as deferred
const deferred = ['SELF-022', 'SELF-023', 'SELF-024', 'SELF-025', 'RETRO-001', 'RETRO-002'];
deferred.forEach(id => {
  const regex = new RegExp(`(\\[tasks\\.${id}\\][\\s\\S]*?status = ")pending(")`, 'g');
  content = content.replace(regex, '$1deferred$2');
});

fs.writeFileSync(sprintPath, content, 'utf-8');
console.log('✅ Updated Sprint 3 task statuses');
console.log(`  - Completed: ${completed.join(', ')}`);
console.log(`  - Not Applicable: DOC-007`);
console.log(`  - Deferred: ${deferred.join(', ')}`);
