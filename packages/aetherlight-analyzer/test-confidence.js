const { PlanningDocumentDetector } = require('./dist/generators/planning-document-detector');
const path = require('path');
const fs = require('fs');

async function test() {
  console.log('Testing confidence scoring on PHASE_1_IMPLEMENTATION.md');
  console.log('');

  const rootDir = path.resolve('../..');
  const testFile = path.join(rootDir, 'PHASE_1_IMPLEMENTATION.md');

  const detector = new PlanningDocumentDetector();

  // Read content
  const content = await fs.promises.readFile(testFile, 'utf-8');
  const filename = path.basename(testFile);

  console.log('File:', filename);
  console.log('Content length:', content.length, 'chars');
  console.log('');

  // Test filename pattern
  const filenameMatch = detector.matchesFilenamePattern(filename);
  console.log('1. Filename matches pattern:', filenameMatch, '(30% if true)');

  // Test directory
  const dirname = path.basename(path.dirname(testFile));
  const dirMatch = ['sprints', 'phases', 'iterations', 'milestones', 'roadmaps', 'planning', 'backlog']
    .some(ind => dirname.toLowerCase().includes(ind));
  console.log('2. Directory indicates planning:', dirMatch, '(10% if true)');
  console.log('   Directory name:', dirname);

  // Test structural markers
  console.log('3. Structural markers:');
  const markers = {
    hasTasks: /^#+\s*Task\s+[A-Z0-9-]+:/mi,
    hasTimeline: /^#+\s*Timeline/mi,
    hasDuration: /\*\*ESTIMATED DURATION:\*\*/i,
    hasDependencies: /\*\*Dependencies:\*\*/i,
    hasValidation: /\*\*Validation Criteria:\*\*/i,
    hasAgents: /\*\*Agent:\*\*/i,
    hasWeekBreakdown: /^#+\s*Week\s+\d+/mi,
    hasMermaidDiagram: /```mermaid/i,
    hasSuccessMetrics: /^#+\s*Success\s+(Metrics|Criteria)/mi,
    hasRiskAnalysis: /^#+\s*Risk\s+Analysis/mi,
  };

  let structuralMatches = 0;
  Object.entries(markers).forEach(([name, pattern]) => {
    const match = pattern.test(content);
    if (match) structuralMatches++;
    console.log(`   ${name}:`, match);
  });
  const structuralScore = structuralMatches / Object.keys(markers).length;
  console.log('   Total structural score:', (structuralScore * 100).toFixed(0) + '%', '(40% weight)');

  // Test semantic phrases
  console.log('4. Semantic phrases:');
  const phrases = [
    'sprint plan', 'phase implementation', 'task breakdown', 'estimated duration',
    'completion criteria', 'success metrics', 'implementation steps', 'validation criteria',
    'dependency graph', 'risk analysis', 'rollback plan', 'deployment strategy',
    'testing strategy', 'architecture context', 'technical debt', 'refactoring targets'
  ];

  let semanticMatches = 0;
  const lowerContent = content.toLowerCase();
  phrases.forEach(phrase => {
    if (lowerContent.includes(phrase)) semanticMatches++;
  });
  const semanticScore = Math.min(semanticMatches / phrases.length, 1.0);
  console.log('   Phrases found:', semanticMatches, '/', phrases.length);
  console.log('   Semantic score:', (semanticScore * 100).toFixed(0) + '%', '(20% weight)');

  // Calculate total
  let total = 0;
  if (filenameMatch) total += 0.3;
  if (dirMatch) total += 0.1;
  total += structuralScore * 0.4;
  total += semanticScore * 0.2;

  console.log('');
  console.log('TOTAL CONFIDENCE SCORE:', (total * 100).toFixed(1) + '%');
  console.log('Threshold: 80%');
  console.log('Would be detected:', total >= 0.8 ? 'YES ✓' : 'NO ✗');
}

test().catch(console.error);
