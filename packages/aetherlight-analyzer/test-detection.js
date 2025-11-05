const { glob } = require('glob');
const path = require('path');

async function test() {
  const rootDir = path.resolve('../..');
  const pattern = path.join(rootDir, '**/*.md').replace(/\\/g, '/');
  console.log('Testing glob pattern for PHASE file detection');
  console.log('Root dir:', rootDir);
  console.log('Pattern:', pattern);
  console.log('');

  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    withFileTypes: false,
  });

  console.log('Total .md files found:', files.length);
  const phaseFiles = files.filter(f => /PHASE/i.test(path.basename(f)));
  console.log('PHASE files found:', phaseFiles.length);

  if (phaseFiles.length > 0) {
    console.log('\\nFirst 10 PHASE files:');
    phaseFiles.slice(0, 10).forEach(f => console.log('  -', path.basename(f)));
  } else {
    console.log('\\n❌ NO PHASE FILES FOUND - This is the bug!');
    console.log('\\nDebugging info:');
    console.log('Pattern used:', pattern);
    console.log('Ignore patterns:', ['**/node_modules/**', '**/dist/**', '**/build/**']);
  }
}

test().catch(console.error);
