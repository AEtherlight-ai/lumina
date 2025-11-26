/**
 * JEPA PoC - Pattern Prediction Research
 *
 * This script validates the hypothesis that JEPA principles can predict
 * which patterns will be needed for a task before coding starts.
 *
 * Research Question: Can we predict patterns from task descriptions with >60% accuracy?
 *
 * Approach: k-NN similarity search in embedding space (baseline)
 *
 * Success Criteria: Accuracy@3 > 60%
 *
 * Pattern-TASK-ANALYSIS-001: Pre-task analysis completed (see enhanced prompt)
 * Pattern-CODE-001: Workflow announcement completed
 *
 * Usage: node scripts/jepa_poc.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as toml from '@iarna/toml';

// ------------------------------------------------------------------------------
// Step 1: Select 10 Most-Used Patterns from Sprint History
// ------------------------------------------------------------------------------

interface PatternFrequency {
  patternId: string;
  count: number;
  tasks: string[];
}

/**
 * Parse all sprint TOML files and count pattern frequency
 */
function analyzePatternUsage(): Map<string, PatternFrequency> {
  console.log('📊 Step 1: Analyzing pattern usage across all sprints...\n');

  const sprintsDir = path.join(__dirname, '../internal/sprints');
  const sprintFiles = fs.readdirSync(sprintsDir)
    .filter(f => f.startsWith('ACTIVE_SPRINT') && f.endsWith('.toml'));

  console.log(`Found ${sprintFiles.length} sprint files\n`);

  const patternFrequency = new Map<string, PatternFrequency>();

  for (const sprintFile of sprintFiles) {
    const sprintPath = path.join(sprintsDir, sprintFile);
    const content = fs.readFileSync(sprintPath, 'utf-8');

    let sprint: any;
    try {
      sprint = toml.parse(content);
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${sprintFile}: ${error}`);
      continue;
    }

    if (!sprint.tasks) {
      continue;
    }

    // Count patterns in each task
    for (const [taskId, task] of Object.entries(sprint.tasks as Record<string, any>)) {
      const patterns = task.patterns || [];

      for (const patternId of patterns) {
        if (!patternFrequency.has(patternId)) {
          patternFrequency.set(patternId, {
            patternId,
            count: 0,
            tasks: []
          });
        }

        const freq = patternFrequency.get(patternId)!;
        freq.count++;
        freq.tasks.push(taskId);
      }
    }
  }

  return patternFrequency;
}

/**
 * Select top 10 most-used patterns
 */
function selectTop10Patterns(): string[] {
  const patternFrequency = analyzePatternUsage();

  // Sort by frequency (descending)
  const sorted = Array.from(patternFrequency.values())
    .sort((a, b) => b.count - a.count);

  console.log('📈 Pattern Frequency Analysis:\n');
  console.log('Rank | Pattern ID                      | Count | Sample Tasks');
  console.log('-----|--------------------------------|-------|---------------------------');

  sorted.slice(0, 20).forEach((freq, i) => {
    const rank = (i + 1).toString().padStart(4);
    const patternId = freq.patternId.padEnd(30);
    const count = freq.count.toString().padStart(5);
    const sampleTasks = freq.tasks.slice(0, 3).join(', ');
    console.log(`${rank} | ${patternId} | ${count} | ${sampleTasks}`);
  });

  // Select top 10
  const top10 = sorted.slice(0, 10).map(f => f.patternId);

  console.log(`\n✅ Selected top 10 patterns: ${top10.join(', ')}\n`);

  return top10;
}

// ------------------------------------------------------------------------------
// Step 2: Generate Embeddings for Patterns (PLACEHOLDER - requires LLM API)
// ------------------------------------------------------------------------------

interface PatternEmbedding {
  patternId: string;
  embedding: number[];
  dimensions: number;
}

/**
 * Generate embedding for a pattern
 *
 * NOTE: This is a PoC placeholder. In production, this would call the LLM API.
 * For now, we'll simulate embeddings with random vectors.
 */
async function embedPattern(patternId: string): Promise<PatternEmbedding> {
  console.log(`  Embedding pattern: ${patternId}...`);

  // TODO: Call LLM API to generate real embeddings
  // const patternPath = path.join(__dirname, '../docs/patterns', `${patternId}.md`);
  // const content = fs.readFileSync(patternPath, 'utf-8');
  // const embedding = await callLLMAPI(content);

  // For PoC: Simulate with random embedding (512 dimensions)
  const dimensions = 512;
  const embedding = Array.from({ length: dimensions }, () => Math.random());

  return {
    patternId,
    embedding,
    dimensions
  };
}

/**
 * Generate embeddings for all patterns
 */
async function generatePatternEmbeddings(patternIds: string[]): Promise<Map<string, number[]>> {
  console.log('📊 Step 2: Generating embeddings for patterns...\n');

  const embeddings = new Map<string, number[]>();

  for (const patternId of patternIds) {
    try {
      const result = await embedPattern(patternId);
      embeddings.set(patternId, result.embedding);
    } catch (error) {
      console.error(`❌ Failed to embed ${patternId}:`, error);
    }
  }

  console.log(`\n✅ Generated ${embeddings.size} pattern embeddings\n`);

  return embeddings;
}

// ------------------------------------------------------------------------------
// Step 3: Select 5 Recent Tasks with Known Pattern Usage
// ------------------------------------------------------------------------------

interface ValidationTask {
  taskId: string;
  sprintId: string;
  name: string;
  why: string;
  context: string;
  reasoningChain: string[];
  groundTruthPatterns: string[];
}

/**
 * Select 5 validation tasks from recent sprints
 */
function selectValidationTasks(): ValidationTask[] {
  console.log('📊 Step 3: Selecting 5 validation tasks with known pattern usage...\n');

  const tasks: ValidationTask[] = [];

  // Target sprints (most recent with good pattern annotations)
  const targetSprints = [
    'ACTIVE_SPRINT_18.2_RESOURCE_BUNDLING_BUGS.toml',
    'ACTIVE_SPRINT_v0.17.2_BUG_FIXES.toml',
    'ACTIVE_SPRINT_17.1_BUGS.toml'
  ];

  const sprintsDir = path.join(__dirname, '../internal/sprints');

  for (const sprintFile of targetSprints) {
    const sprintPath = path.join(sprintsDir, sprintFile);

    if (!fs.existsSync(sprintPath)) {
      continue;
    }

    const content = fs.readFileSync(sprintPath, 'utf-8');
    let sprint: any;

    try {
      sprint = toml.parse(content);
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${sprintFile}:`, error);
      continue;
    }

    if (!sprint.tasks) {
      continue;
    }

    // Find tasks with explicit patterns field
    for (const [taskId, task] of Object.entries(sprint.tasks as Record<string, any>)) {
      if (!task.patterns || task.patterns.length === 0) {
        continue; // Skip tasks without ground truth patterns
      }

      if (tasks.length >= 5) {
        break; // We have enough validation tasks
      }

      tasks.push({
        taskId,
        sprintId: sprintFile.replace('ACTIVE_SPRINT_', '').replace('.toml', ''),
        name: task.name || '',
        why: task.why || '',
        context: task.context || '',
        reasoningChain: task.reasoning_chain || [],
        groundTruthPatterns: task.patterns
      });
    }

    if (tasks.length >= 5) {
      break;
    }
  }

  console.log(`✅ Selected ${tasks.length} validation tasks:\n`);
  tasks.forEach((task, i) => {
    console.log(`${i + 1}. ${task.taskId} (${task.sprintId}): ${task.name}`);
    console.log(`   Ground truth patterns: ${task.groundTruthPatterns.join(', ')}\n`);
  });

  return tasks;
}

// ------------------------------------------------------------------------------
// Step 4: Generate Task Embeddings (PLACEHOLDER - requires LLM API)
// ------------------------------------------------------------------------------

interface TaskEmbedding {
  taskId: string;
  embedding: number[];
  groundTruthPatterns: string[];
}

/**
 * Generate embedding for a task
 *
 * NOTE: This is a PoC placeholder. In production, this would call the LLM API.
 */
async function embedTask(task: ValidationTask): Promise<TaskEmbedding> {
  console.log(`  Embedding task: ${task.taskId}...`);

  // TODO: Call LLM API to generate real embeddings
  // const taskDescription = `Task: ${task.name}\nWhy: ${task.why}\nContext: ${task.context}`;
  // const embedding = await callLLMAPI(taskDescription);

  // For PoC: Simulate with random embedding (512 dimensions)
  const dimensions = 512;
  const embedding = Array.from({ length: dimensions }, () => Math.random());

  return {
    taskId: task.taskId,
    embedding,
    groundTruthPatterns: task.groundTruthPatterns
  };
}

/**
 * Generate embeddings for all validation tasks
 */
async function generateTaskEmbeddings(tasks: ValidationTask[]): Promise<Map<string, TaskEmbedding>> {
  console.log('📊 Step 4: Generating embeddings for tasks...\n');

  const embeddings = new Map<string, TaskEmbedding>();

  for (const task of tasks) {
    try {
      const result = await embedTask(task);
      embeddings.set(task.taskId, result);
    } catch (error) {
      console.error(`❌ Failed to embed ${task.taskId}:`, error);
    }
  }

  console.log(`\n✅ Generated ${embeddings.size} task embeddings\n`);

  return embeddings;
}

// ------------------------------------------------------------------------------
// Step 5: Predict Patterns using k-NN
// ------------------------------------------------------------------------------

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  return dotProduct / (magnitudeA * magnitudeB);
}

interface PatternPrediction {
  patternId: string;
  similarity: number;
}

/**
 * Predict top k patterns for a task using k-NN
 */
function predictPatterns(
  taskEmbedding: number[],
  patternEmbeddings: Map<string, number[]>,
  k: number = 3
): PatternPrediction[] {
  // Calculate similarity to all patterns
  const similarities: PatternPrediction[] = [];

  for (const [patternId, patternEmb] of patternEmbeddings.entries()) {
    try {
      const similarity = cosineSimilarity(taskEmbedding, patternEmb);
      similarities.push({ patternId, similarity });
    } catch (error) {
      console.error(`❌ Failed to calculate similarity for ${patternId}:`, error);
    }
  }

  // Sort by similarity (descending) and return top k
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Predict patterns for all validation tasks
 */
function predictPatternsForAllTasks(
  taskEmbeddings: Map<string, TaskEmbedding>,
  patternEmbeddings: Map<string, number[]>
): Map<string, PatternPrediction[]> {
  console.log('📊 Step 5: Predicting patterns using k-NN (k=3)...\n');

  const predictions = new Map<string, PatternPrediction[]>();

  for (const [taskId, taskEmb] of taskEmbeddings.entries()) {
    const predicted = predictPatterns(taskEmb.embedding, patternEmbeddings, 3);
    predictions.set(taskId, predicted);

    console.log(`Task: ${taskId}`);
    console.log(`  Predicted (top 3):`);
    predicted.forEach((pred, i) => {
      console.log(`    ${i + 1}. ${pred.patternId} (similarity: ${pred.similarity.toFixed(4)})`);
    });
    console.log(`  Ground truth: ${taskEmb.groundTruthPatterns.join(', ')}\n`);
  }

  return predictions;
}

// ------------------------------------------------------------------------------
// Step 6 & 7: Evaluate Predictions and Calculate Accuracy@3
// ------------------------------------------------------------------------------

interface EvaluationResult {
  taskId: string;
  predictedPatterns: string[];
  groundTruthPatterns: string[];
  correctPredictions: string[];
  accuracyAtK: number;
  similarities: number[];
}

/**
 * Evaluate predictions against ground truth
 */
function evaluatePredictions(
  predictions: Map<string, PatternPrediction[]>,
  taskEmbeddings: Map<string, TaskEmbedding>
): EvaluationResult[] {
  console.log('📊 Step 6 & 7: Evaluating predictions and calculating Accuracy@3...\n');

  const results: EvaluationResult[] = [];

  for (const [taskId, predicted] of predictions.entries()) {
    const taskEmb = taskEmbeddings.get(taskId);
    if (!taskEmb) {
      continue;
    }

    const predictedPatterns = predicted.map(p => p.patternId);
    const groundTruth = taskEmb.groundTruthPatterns;
    const correct = predictedPatterns.filter(p => groundTruth.includes(p));
    const similarities = predicted.map(p => p.similarity);

    results.push({
      taskId,
      predictedPatterns,
      groundTruthPatterns: groundTruth,
      correctPredictions: correct,
      accuracyAtK: correct.length > 0 ? 1.0 : 0.0,
      similarities
    });
  }

  return results;
}

/**
 * Calculate overall Accuracy@3
 */
function calculateAccuracyAtK(results: EvaluationResult[]): number {
  const correctCount = results.filter(r => r.accuracyAtK === 1.0).length;
  return correctCount / results.length;
}

/**
 * Print detailed evaluation results
 */
function printEvaluationResults(results: EvaluationResult[], accuracyAtK: number): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    JEPA PoC RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  results.forEach((result, i) => {
    const match = result.correctPredictions.length > 0 ? '✅ MATCH' : '❌ NO MATCH';

    console.log(`Task ${i + 1}: ${result.taskId} - ${match}`);
    console.log(`  Predicted: [${result.predictedPatterns.join(', ')}]`);
    console.log(`  Ground Truth: [${result.groundTruthPatterns.join(', ')}]`);

    if (result.correctPredictions.length > 0) {
      console.log(`  Correct: [${result.correctPredictions.join(', ')}] (${result.correctPredictions.length}/${result.predictedPatterns.length})`);
    }

    console.log(`  Similarities: ${result.similarities.map(s => s.toFixed(4)).join(', ')}\n`);
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Total tasks tested: ${results.length}`);
  console.log(`Tasks with correct prediction: ${results.filter(r => r.accuracyAtK === 1.0).length}`);
  console.log(`Accuracy@3: ${(accuracyAtK * 100).toFixed(1)}%`);
  console.log(`Success threshold: 60%`);

  if (accuracyAtK >= 0.6) {
    console.log(`\n✅ RESULT: PASS - Hypothesis validated!`);
    console.log(`✅ Recommendation: Proceed to JEPA-002 (full infrastructure)`);
  } else {
    console.log(`\n❌ RESULT: FAIL - Hypothesis not validated with k-NN baseline`);
    console.log(`⚠️  Recommendation: Analyze failures, try linear transformation (JEPA-002B)`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ------------------------------------------------------------------------------
// Main PoC Execution
// ------------------------------------------------------------------------------

async function runJEPAPoC(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('    JEPA PoC - Pattern Prediction Hypothesis Validation');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Research Question: Can we predict patterns from task descriptions');
  console.log('with >60% accuracy using k-NN similarity search?\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Select 10 most-used patterns
    const top10Patterns = selectTop10Patterns();

    // Step 2: Generate pattern embeddings
    const patternEmbeddings = await generatePatternEmbeddings(top10Patterns);

    // Step 3: Select 5 validation tasks
    const validationTasks = selectValidationTasks();

    if (validationTasks.length < 5) {
      console.warn(`⚠️  Only found ${validationTasks.length} validation tasks. Need 5 for robust validation.`);
    }

    // Step 4: Generate task embeddings
    const taskEmbeddings = await generateTaskEmbeddings(validationTasks);

    // Step 5: Predict patterns using k-NN
    const predictions = predictPatternsForAllTasks(taskEmbeddings, patternEmbeddings);

    // Step 6 & 7: Evaluate and calculate Accuracy@3
    const results = evaluatePredictions(predictions, taskEmbeddings);
    const accuracyAtK = calculateAccuracyAtK(results);

    // Print results
    printEvaluationResults(results, accuracyAtK);

    // Step 8: Document findings
    console.log('📝 Next step: Update internal/research/JEPA_PATTERN_PREDICTION_RESEARCH.md');
    console.log('   with these findings in a new "Results" section.\n');

  } catch (error) {
    console.error('❌ PoC failed:', error);
    process.exit(1);
  }
}

// Run the PoC
runJEPAPoC()
  .then(() => {
    console.log('✅ JEPA PoC completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ PoC execution failed:', error);
    process.exit(1);
  });
