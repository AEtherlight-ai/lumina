const fs = require('fs');
const path = require('path');

const patterns = [
  'Pattern-NETWORK-001.md',
  'Pattern-ROUTING-001.md',
  'Pattern-FAILURE-004.md',
  'Pattern-FAILURE-006.md',
  'Pattern-DOMAIN-004.md'
];

for (const file of patterns) {
  console.log(`\n=== Testing ${file} ===`);
  const content = fs.readFileSync(path.join('../docs/patterns', file), 'utf-8');

  // Test Implementation section match
  const implMatch = content.match(/##\s+(Implementation|Implementation Highlights|Escalation Logic|Core Types|Key Implementation Details)\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
  console.log('Implementation match:', !!implMatch);

  if (implMatch) {
    const withoutCode = implMatch[2].replace(/```[\s\S]*?```/g, '');
    const paragraphs = withoutCode
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 20 && !p.startsWith('##') && !p.startsWith('**'));

    console.log('Paragraphs found:', paragraphs.length);
    if (paragraphs.length > 0) {
      console.log('First paragraph:', paragraphs[0].substring(0, 100));
    }
  }

  // Check for headings
  const headings = content.match(/###\s+(.+)/g);
  console.log('### headings found:', headings ? headings.length : 0);
  if (headings) {
    console.log('First heading:', headings[0]);
  }
}
