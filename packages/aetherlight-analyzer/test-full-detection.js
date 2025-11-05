const { PlanningDocumentDetector } = require('./dist/generators/planning-document-detector');
const path = require('path');

async function test() {
  console.log('Testing full PlanningDocumentDetector pipeline');
  console.log('');

  const rootDir = path.resolve('../..');
  console.log('Root dir:', rootDir);
  console.log('');

  const detector = new PlanningDocumentDetector();
  console.log('Calling detectPlanningDocuments()...');
  const docs = await detector.detectPlanningDocuments(rootDir);

  console.log('');
  console.log('Result:', docs.length, 'documents detected (>80% confidence)');

  if (docs.length > 0) {
    console.log('');
    console.log('First 10 detected documents:');
    docs.slice(0, 10).forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.type.toUpperCase().padEnd(10)} ${path.basename(doc.path).padEnd(40)} (${(doc.confidence * 100).toFixed(0)}% ${doc.detectionMethod})`);
    });
  } else {
    console.log('');
    console.log('❌ NO DOCUMENTS DETECTED - Investigating why...');
    console.log('');
    console.log('Testing individual file:');
    const testFile = path.join(rootDir, 'PHASE_1_IMPLEMENTATION.md');
    console.log('File:', testFile);

    const fs = require('fs');
    if (fs.existsSync(testFile)) {
      const content = fs.readFileSync(testFile, 'utf-8');
      console.log('File exists, length:', content.length);

      // Test filename pattern matching
      const filename = path.basename(testFile);
      const matches = detector.FILENAME_PATTERNS.some(p => p.test(filename));
      console.log('Filename matches pattern:', matches);
    } else {
      console.log('File does not exist!');
    }
  }
}

test().catch(console.error);
