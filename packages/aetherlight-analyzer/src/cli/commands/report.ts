/**
 * Report Command - Generate summary report from analysis
 *
 * DESIGN DECISION: Support multiple output formats (markdown, HTML, JSON)
 * WHY: Different stakeholders need different formats (devs want markdown, execs want HTML)
 *
 * REASONING CHAIN:
 * 1. Load analysis results from .aetherlight/analysis.json
 * 2. Generate executive summary (high-level metrics)
 * 3. Include detailed sections (architecture, complexity, debt)
 * 4. Add visualizations (ASCII charts for terminal, HTML charts for web)
 * 5. Output in requested format (markdown default)
 * 6. Result: Comprehensive analysis report ready for stakeholders
 *
 * PATTERN: Pattern-ANALYZER-001
 */

import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

interface ReportOptions {
  input: string;
  output: string;
  format: 'md' | 'html' | 'json';
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  console.log(chalk.blue('\n📊 Generating Analysis Report\n'));

  const spinner = ora('Loading analysis results...').start();

  try {
    // Load analysis results
    const inputPath = path.resolve(options.input);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Analysis file not found: ${inputPath}\nRun 'aetherlight-analyzer analyze' first`);
    }

    const analysisResults = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    spinner.succeed(chalk.green('✅ Analysis loaded'));

    // Generate report
    spinner.start(`Generating ${options.format.toUpperCase()} report...`);

    let reportContent: string;

    switch (options.format) {
      case 'md':
        reportContent = generateMarkdownReport(analysisResults);
        break;
      case 'html':
        reportContent = generateHTMLReport(analysisResults);
        break;
      case 'json':
        reportContent = JSON.stringify(analysisResults, null, 2);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Save report
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, reportContent);

    spinner.succeed(chalk.green(`✅ Report saved to ${path.basename(outputPath)}`));

    // Summary
    console.log(chalk.blue('\n📋 Report Summary:\n'));
    console.log(chalk.white(`  Project: ${analysisResults.project.name}`));
    console.log(chalk.white(`  Files analyzed: ${analysisResults.parsing.totalFiles}`));
    console.log(chalk.white(`  Lines of code: ${analysisResults.parsing.totalLinesOfCode.toLocaleString()}`));
    console.log(chalk.white(`  Format: ${options.format.toUpperCase()}`));
    console.log(chalk.white(`  Output: ${path.relative(process.cwd(), outputPath)}`));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('❌ Report generation failed'));
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    process.exit(1);
  }
}

function generateMarkdownReport(analysisResults: any): string {
  const { project, parsing, analyzers } = analysisResults;
  const arch = analyzers.find((a: any) => a.name === 'architecture')?.data || {};
  const complexity = analyzers.find((a: any) => a.name === 'complexity')?.data || {};
  const debt = analyzers.find((a: any) => a.name === 'technical_debt')?.data || {};

  return `# ÆtherLight Code Analysis Report

**Project:** ${project.name}
**Generated:** ${new Date(analysisResults.timestamp).toLocaleString()}
**Path:** ${project.path}

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| Files Analyzed | ${parsing.totalFiles} |
| Lines of Code | ${parsing.totalLinesOfCode.toLocaleString()} |
| Parse Duration | ${parsing.parseDurationMs}ms |
| Architecture Pattern | ${arch.pattern || 'Unknown'} (${arch.confidence ? (arch.confidence * 100).toFixed(0) : 0}% confidence) |
| Average Complexity | ${complexity.averageComplexity?.toFixed(1) || 'N/A'} |
| Technical Debt Score | ${debt.score || 0}/100 |

---

## 🏗️ Architecture Analysis

**Detected Pattern:** ${arch.pattern || 'Unknown'}
**Confidence:** ${arch.confidence ? (arch.confidence * 100).toFixed(0) : 0}%

### Layers Detected:
${arch.layers ? arch.layers.map((layer: string) => `- ${layer}`).join('\n') : '- None detected'}

### Key Findings:
${arch.findings ? arch.findings.map((finding: string) => `- ${finding}`).join('\n') : '- No findings'}

---

## 🔢 Complexity Analysis

**Average Complexity:** ${complexity.averageComplexity?.toFixed(1) || 'N/A'}
**Maximum Complexity:** ${complexity.maxComplexity || 'N/A'}
**Functions Over Threshold (>15):** ${complexity.functionsOverThreshold?.length || 0}

### Top Complex Functions:
${complexity.functionsOverThreshold ? complexity.functionsOverThreshold.slice(0, 10).map((fn: any) =>
  `- \`${fn.name}\` (complexity: ${fn.complexity}) - ${fn.location.file}:${fn.location.line}`
).join('\n') : '- None'}

---

## 🔧 Technical Debt Analysis

**Debt Score:** ${debt.score || 0}/100
**Total Issues:** ${debt.totalIssues || 0}

### Breakdown by Category:
${debt.categories ? Object.entries(debt.categories).map(([category, count]) =>
  `- ${category}: ${count}`
).join('\n') : '- No categories'}

### High-Priority Issues:
${debt.issues ? debt.issues.slice(0, 10).map((issue: any) =>
  `- [${issue.severity}] ${issue.message} - ${issue.location.file}:${issue.location.line}`
).join('\n') : '- None'}

---

## 📈 Recommendations

### Immediate Actions:
1. **Refactor high-complexity functions** (>${complexity.threshold || 15} complexity)
2. **Address critical technical debt** (${debt.categories?.CRITICAL || 0} issues)
3. **Improve architecture alignment** (${arch.confidence ? (arch.confidence * 100).toFixed(0) : 0}% confidence could be higher)

### Long-Term Improvements:
1. Establish coding standards (reduce debt accumulation)
2. Implement automated complexity checks (CI/CD gates)
3. Regular refactoring sessions (reduce complexity over time)

---

## 🚀 Next Steps

1. **Generate Sprint Plans:**
   \`\`\`bash
   aetherlight-analyzer generate-sprints
   \`\`\`

2. **Review Generated Plans:**
   - \`PHASE_A_ENHANCEMENT.md\` - Add new features
   - \`PHASE_B_RETROFIT.md\` - Refactor existing code
   - \`PHASE_C_DOGFOOD.md\` - Integrate ÆtherLight SDK

3. **Execute Sprint (Optional):**
   \`\`\`bash
   aetherlight-analyzer execute-sprint A
   \`\`\`

---

*Generated by ÆtherLight Analyzer v0.1.0*
`;
}

function generateHTMLReport(analysisResults: any): string {
  const { project, parsing, analyzers } = analysisResults;
  const arch = analyzers.find((a: any) => a.name === 'architecture')?.data || {};
  const complexity = analyzers.find((a: any) => a.name === 'complexity')?.data || {};
  const debt = analyzers.find((a: any) => a.name === 'technical_debt')?.data || {};

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ÆtherLight Analysis Report - ${project.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .metric-label {
      color: #666;
      margin-top: 5px;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h2 {
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .issue-list {
      list-style: none;
      padding: 0;
    }
    .issue-item {
      padding: 10px;
      margin: 5px 0;
      background: #f9f9f9;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ÆtherLight Code Analysis Report</h1>
    <p><strong>Project:</strong> ${project.name}</p>
    <p><strong>Generated:</strong> ${new Date(analysisResults.timestamp).toLocaleString()}</p>
  </div>

  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-value">${parsing.totalFiles}</div>
      <div class="metric-label">Files Analyzed</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${parsing.totalLinesOfCode.toLocaleString()}</div>
      <div class="metric-label">Lines of Code</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${arch.confidence ? (arch.confidence * 100).toFixed(0) : 0}%</div>
      <div class="metric-label">Architecture Confidence</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${complexity.averageComplexity?.toFixed(1) || 'N/A'}</div>
      <div class="metric-label">Avg Complexity</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${debt.score || 0}/100</div>
      <div class="metric-label">Technical Debt Score</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${debt.totalIssues || 0}</div>
      <div class="metric-label">Total Issues</div>
    </div>
  </div>

  <div class="section">
    <h2>🏗️ Architecture Analysis</h2>
    <p><strong>Detected Pattern:</strong> ${arch.pattern || 'Unknown'}</p>
    <p><strong>Confidence:</strong> ${arch.confidence ? (arch.confidence * 100).toFixed(0) : 0}%</p>
    <h3>Layers Detected:</h3>
    <ul>
      ${arch.layers ? arch.layers.map((layer: string) => `<li>${layer}</li>`).join('') : '<li>None detected</li>'}
    </ul>
  </div>

  <div class="section">
    <h2>🔢 Complexity Analysis</h2>
    <p><strong>Average:</strong> ${complexity.averageComplexity?.toFixed(1) || 'N/A'}</p>
    <p><strong>Maximum:</strong> ${complexity.maxComplexity || 'N/A'}</p>
    <p><strong>Functions Over Threshold:</strong> ${complexity.functionsOverThreshold?.length || 0}</p>
    <h3>Top Complex Functions:</h3>
    <ul class="issue-list">
      ${complexity.functionsOverThreshold ? complexity.functionsOverThreshold.slice(0, 10).map((fn: any) =>
        `<li class="issue-item"><code>${fn.name}</code> (complexity: ${fn.complexity}) - ${fn.location.file}:${fn.location.line}</li>`
      ).join('') : '<li>None</li>'}
    </ul>
  </div>

  <div class="section">
    <h2>🔧 Technical Debt Analysis</h2>
    <p><strong>Debt Score:</strong> ${debt.score || 0}/100</p>
    <p><strong>Total Issues:</strong> ${debt.totalIssues || 0}</p>
    <h3>High-Priority Issues:</h3>
    <ul class="issue-list">
      ${debt.issues ? debt.issues.slice(0, 10).map((issue: any) =>
        `<li class="issue-item">[${issue.severity}] ${issue.message} - ${issue.location.file}:${issue.location.line}</li>`
      ).join('') : '<li>None</li>'}
    </ul>
  </div>

  <div class="section">
    <h2>🚀 Next Steps</h2>
    <ol>
      <li>Generate sprint plans: <code>aetherlight-analyzer generate-sprints</code></li>
      <li>Review generated plans (PHASE_A/B/C_*.md)</li>
      <li>Execute sprints: <code>aetherlight-analyzer execute-sprint A</code></li>
    </ol>
  </div>

  <footer style="text-align: center; color: #666; margin-top: 40px;">
    <p><em>Generated by ÆtherLight Analyzer v0.1.0</em></p>
  </footer>
</body>
</html>
`;
}
