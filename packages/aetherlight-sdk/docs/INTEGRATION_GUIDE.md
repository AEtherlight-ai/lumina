# ÆtherLight SDK Integration Guide
## From Zero to Intelligence in 30 Minutes

**VERSION:** 1.0
**DATE:** 2025-10-07
**STATUS:** Step-by-Step Integration Instructions
**CLASSIFICATION:** 🌐 PUBLIC (Developer Documentation)
**PATTERN:** Pattern-SDK-002 (Rapid Integration Methodology)

---

## What You'll Build

By following this guide, you'll add ÆtherLight intelligence to your application in **~30 minutes**:

✅ Pattern recognition with confidence scoring
✅ Chain of Thought reasoning (understand WHY each match)
✅ Architecture analysis (instant codebase review)
✅ Auto-generated documentation (API reference + architecture guide)
✅ Optional: Join neural network (contribute + discover patterns)

**Time breakdown:**
- Basic pattern matching: 10 minutes
- Architecture analysis: +5 minutes
- Network integration: +15 minutes
- **Total: 30 minutes**

---

## Prerequisites

```bash
# Node.js 18+ required
node --version  # Should be >= 18.0.0

# Package manager (npm, yarn, or pnpm)
npm --version

# Optional: Rust (if building from source)
rustc --version  # Should be >= 1.70.0
```

---

## Step 1: Install SDK (2 minutes)

### Option A: Full SDK (Recommended)

```bash
npm install @aetherlight/sdk
```

Includes:
- Pattern recognition engine
- Architecture advisor
- Neural network integration
- All features

### Option B: Lightweight (Pattern Matching Only)

```bash
npm install @aetherlight/sdk-core
```

Includes:
- Pattern matching
- Confidence scoring
- Chain of Thought reasoning
- No architecture analysis, no network features

### Option C: Architecture Analysis Only

```bash
npm install @aetherlight/sdk-advisor
```

Includes:
- Codebase analysis
- Security scanning
- Performance benchmarking
- Documentation generation
- No pattern matching runtime

---

## Step 2: Configure Domain (3 minutes)

Create `aetherlight.config.js` in your project root:

```javascript
/**
 * ÆtherLight SDK Configuration
 *
 * DESIGN DECISION: Domain-specific configuration enables targeted pattern matching
 * WHY: Each domain (legal, analytics, medical) has unique patterns and confidence dimensions
 *
 * REASONING CHAIN:
 * 1. Choose domain closest to your application's purpose
 * 2. Configure confidence threshold (0.0-1.0, higher = more selective)
 * 3. Define confidence dimensions (what makes a "good match")
 * 4. SDK loads domain-specific pattern library automatically
 * 5. Result: Accurate pattern matching tailored to your use case
 *
 * PATTERN: Pattern-CONFIG-001 (Domain Configuration)
 */

module.exports = {
  // Choose your domain
  domain: 'legal',  // Options: 'legal', 'analytics', 'medical', 'support', 'engineering', 'marketing', 'generic'

  // Confidence threshold (only return matches >= this score)
  confidence: {
    threshold: 0.85,  // 85% confidence minimum
    dimensions: [
      'semantic',      // Text similarity (always included)
      'jurisdiction',  // Domain-specific (legal: state/country)
      'recency',       // How recent is the pattern (newer = better)
      'citations'      // How often is this pattern used (popular = better)
    ]
  },

  // Pattern library (optional, defaults to domain library)
  patternLibrary: './patterns/my-custom-patterns.json',

  // Privacy settings
  privacy: {
    localOnly: true,          // Default: Don't join network
    contributePatterns: false // Default: Don't share patterns
  }
};
```

**Available domains:**

| Domain | Use Case | Example Apps |
|--------|----------|--------------|
| `legal` | Legal research, case law, contracts | LexisNexis, Westlaw |
| `analytics` | Data analysis, NL → SQL, dashboards | Tableau, Looker |
| `medical` | Medical records, diagnoses, HIPAA | Epic, Cerner |
| `support` | Customer support, ticket routing | Zendesk, Intercom |
| `engineering` | Code search, documentation | GitHub, GitLab |
| `marketing` | Campaign analytics, A/B testing | HubSpot, Marketo |
| `generic` | General-purpose (when domain unclear) | Any app |

---

## Step 3: Basic Pattern Matching (5 minutes)

### Example: Legal Research Platform

```typescript
/**
 * Basic Pattern Matching Integration
 *
 * DESIGN DECISION: Single-function API for pattern matching
 * WHY: Most customers just need: query → confidence-scored matches
 *
 * REASONING CHAIN:
 * 1. User enters query (text or voice)
 * 2. SDK searches pattern library (local or network)
 * 3. Returns matches with confidence scores
 * 4. Each match includes Chain of Thought reasoning (WHY this match)
 * 5. Display results in your existing UI
 *
 * PATTERN: Pattern-INTEGRATION-002 (Simple Pattern Matching)
 */

import { AetherlightCore } from '@aetherlight/sdk';

// Initialize SDK (do this once at app startup)
const core = new AetherlightCore();  // Loads config from aetherlight.config.js

// Pattern matching function (call whenever user searches)
async function searchLegalCases(query: string, jurisdiction?: string) {
  try {
    const match = await core.matchPattern({
      query,
      context: {
        jurisdiction,  // Domain-specific context
        practiceArea: 'employment-law'
      }
    });

    return {
      success: true,
      results: match.patterns,  // Array of matching patterns
      reasoning: match.chainOfThought  // WHY these matches
    };

  } catch (error) {
    console.error('Pattern matching failed:', error);
    return { success: false, error: error.message };
  }
}

// Example usage in your API
app.post('/api/search', async (req, res) => {
  const { query, jurisdiction } = req.body;

  const results = await searchLegalCases(query, jurisdiction);

  res.json(results);
});
```

**What you get back:**

```json
{
  "success": true,
  "results": [
    {
      "id": "legal-001",
      "name": "Non-Compete Unenforceability (California)",
      "confidence": 0.97,
      "reasoning": {
        "semantic": 0.95,       // Text similarity to query
        "jurisdiction": 1.0,     // Exact jurisdiction match
        "recency": 0.89,        // Pattern from 2021 (reasonably recent)
        "citations": 0.98       // Highly cited pattern
      },
      "chainOfThought": {
        "designDecision": "California strictly prohibits non-compete agreements",
        "why": "Cal. Bus. & Prof. Code §16600 creates strong public policy favoring employee mobility",
        "reasoningChain": [
          "1. California Business & Professions Code §16600 voids non-compete agreements",
          "2. Narrow exceptions: sale of business (§16601), partnership dissolution (§16602)",
          "3. Edwards v. Arthur Andersen (2008) established 'narrow restraint' doctrine",
          "4. Courts strictly construe exceptions"
        ],
        "alternatives": [
          "Trade secret protection via CUTSA",
          "Non-solicitation of employees (if narrowly tailored)"
        ]
      },
      "metadata": {
        "jurisdiction": "California",
        "practiceArea": "Employment Law",
        "keyStatute": "Cal. Bus. & Prof. Code §16600",
        "landmarkCases": ["Edwards v. Arthur Andersen (2008)"]
      }
    }
  ]
}
```

---

## Step 4: Architecture Analysis (5 minutes)

### Add Instant Codebase Review

```typescript
/**
 * Architecture Analysis Integration
 *
 * DESIGN DECISION: Analyze customer codebase against domain patterns
 * WHY: Deliver $70K+ value instantly (architecture review + security + docs)
 *
 * REASONING CHAIN:
 * 1. Customer integrates SDK
 * 2. SDK analyzes their codebase (tree-sitter AST parsing)
 * 3. Compare to domain pattern library (find missing features)
 * 4. Security scan (detect vulnerabilities)
 * 5. Performance benchmark (compare to domain standards)
 * 6. Generate documentation (API reference + architecture guide)
 * 7. Result: Comprehensive analysis in <5 minutes
 *
 * PATTERN: Pattern-ADVISOR-001 (Architecture Analysis)
 */

import { ArchitectureAdvisor } from '@aetherlight/sdk/advisor';

// Initialize advisor (do this once)
const advisor = new ArchitectureAdvisor({
  domain: 'legal',  // Use legal domain patterns
  targetApp: './src'  // Your codebase root
});

// Run analysis (can be part of CI/CD pipeline)
async function analyzeCodebase() {
  try {
    const analysis = await advisor.analyzeCodebase({
      includeSecurityScan: true,
      includePerformanceBench: true,
      generateDocs: true
    });

    console.log(`Analysis complete!`);
    console.log(`- Missing features: ${analysis.missingFeatures.length}`);
    console.log(`- Security issues: ${analysis.securityIssues.length}`);
    console.log(`- Performance issues: ${analysis.performanceIssues.length}`);
    console.log(`- Documentation generated: ${analysis.documentation}`);

    return analysis;

  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// Example: Run in GitHub Actions
// (Add to .github/workflows/analyze.yml)
```

**GitHub Actions Integration:**

```yaml
name: ÆtherLight Architecture Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install @aetherlight/sdk-advisor
      - run: npm run aetherlight:analyze  # Runs your analysis script

      - name: Upload Analysis Report
        uses: actions/upload-artifact@v3
        with:
          name: architecture-analysis
          path: ./analysis-report.json
```

**What you get:**

- **Missing features report:** Compare your app to domain best practices
- **Security vulnerabilities:** Critical/high/medium/low issues with fixes
- **Performance bottlenecks:** Slow queries, N+1 problems, missing indexes
- **Auto-generated docs:** API reference, architecture guide, voice command list

---

## Step 5: Join Neural Network (Optional, 15 minutes)

### Enable Pattern Discovery + Contribution

```typescript
/**
 * Neural Network Integration
 *
 * DESIGN DECISION: Opt-in network participation with zero-knowledge encryption
 * WHY: Network effects - your patterns improve others, their patterns improve you
 *
 * REASONING CHAIN:
 * 1. Customer opts into network (default: local-only)
 * 2. Their patterns are anonymized + encrypted
 * 3. Shared with trusted circle (Shamir 3-of-5 threshold)
 * 4. Optionally shared with global DHT (wider discovery)
 * 5. They can discover patterns from network (not just local library)
 * 6. Result: Access to 1,000+ patterns across all domains
 *
 * PATTERN: Pattern-NETWORK-001 (Network Participation)
 */

import { AetherlightCore } from '@aetherlight/sdk';
import { NeuralNetwork } from '@aetherlight/sdk/network';

// Initialize core + network
const core = new AetherlightCore({ domain: 'legal' });

const network = new NeuralNetwork({
  contributePatterns: true,  // Opt-in: Share anonymized patterns
  privacyLevel: 'zero-knowledge',  // Encrypt before sharing
  trustCircle: [
    'legal-firm-a',
    'legal-firm-b',
    'legal-firm-c'
  ]  // Shamir 3-of-5: Need 3 to decrypt
});

// Search local + network patterns
async function searchWithNetwork(query: string) {
  try {
    // Search: local library + trusted circle + global DHT
    const matches = await network.discoverPatterns({
      query,
      localOnly: false,  // Enable network search
      trustCircleOnly: false  // Include global DHT
    });

    console.log(`Found ${matches.length} patterns`);
    console.log(`Sources: ${matches.map(m => m.source).join(', ')}`);
    // Sources: "local", "trust-circle", "global-dht"

    return matches;

  } catch (error) {
    console.error('Network search failed:', error);
    throw error;
  }
}

// Contribute your patterns back to network
async function contributePattern(pattern: any) {
  try {
    await network.contributePattern({
      domain: 'legal',
      name: pattern.name,
      chainOfThought: pattern.chainOfThought,
      anonymize: true,  // Remove client-specific data
      metadata: {
        jurisdiction: pattern.jurisdiction,
        practiceArea: pattern.practiceArea
      }
    });

    console.log('Pattern contributed to network');

  } catch (error) {
    console.error('Contribution failed:', error);
  }
}
```

**Privacy guarantees:**

✅ **Zero-knowledge encryption:** Your key encrypts, network can't decrypt
✅ **Shamir secret sharing:** 3-of-5 trusted nodes required to decrypt
✅ **Anonymization:** Remove names, emails, case numbers before sharing
✅ **Opt-in default:** Must explicitly enable network features

---

## Common Integration Patterns

### Pattern 1: API Server (Backend)

**Use case:** Existing REST API needs pattern matching

```typescript
// server.ts
import express from 'express';
import { AetherlightCore } from '@aetherlight/sdk';

const app = express();
const core = new AetherlightCore();

app.post('/api/match', async (req, res) => {
  const { query, context } = req.body;

  const match = await core.matchPattern({ query, context });

  res.json(match);
});

app.listen(3000);
```

**Time to integrate:** 10 minutes

---

### Pattern 2: React Frontend

**Use case:** Single-page app needs pattern matching UI

```typescript
// usePatternMatching.ts
import { useState } from 'react';
import { AetherlightCore } from '@aetherlight/sdk';

const core = new AetherlightCore();

export function usePatternMatching() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const search = async (query: string) => {
    setLoading(true);
    try {
      const match = await core.matchPattern({ query });
      setResults(match.patterns);
    } finally {
      setLoading(false);
    }
  };

  return { search, loading, results };
}

// SearchComponent.tsx
function SearchComponent() {
  const { search, loading, results } = usePatternMatching();

  return (
    <div>
      <input onChange={(e) => search(e.target.value)} />
      {loading && <p>Searching...</p>}
      {results.map(r => (
        <div key={r.id}>
          <h3>{r.name}</h3>
          <p>Confidence: {(r.confidence * 100).toFixed(0)}%</p>
        </div>
      ))}
    </div>
  );
}
```

**Time to integrate:** 15 minutes

---

### Pattern 3: CLI Tool

**Use case:** Command-line tool for codebase analysis

```typescript
#!/usr/bin/env node

// analyze-codebase.ts
import { ArchitectureAdvisor } from '@aetherlight/sdk/advisor';

const advisor = new ArchitectureAdvisor({
  domain: process.argv[2] || 'generic',  // e.g., node analyze legal
  targetApp: process.cwd()
});

(async () => {
  console.log('Analyzing codebase...');

  const analysis = await advisor.analyzeCodebase();

  console.log('\n=== Analysis Report ===');
  console.log(`Missing Features: ${analysis.missingFeatures.length}`);
  console.log(`Security Issues: ${analysis.securityIssues.length}`);
  console.log(`Performance Issues: ${analysis.performanceIssues.length}`);

  console.log('\n=== Top 3 Recommendations ===');
  analysis.missingFeatures.slice(0, 3).forEach((f, i) => {
    console.log(`${i + 1}. ${f.feature} (${f.effort} effort)`);
    console.log(`   ${f.recommendation}`);
  });
})();
```

**Usage:**
```bash
npm install -g @aetherlight/sdk-advisor
aetherlight analyze legal
```

**Time to integrate:** 5 minutes

---

## Troubleshooting

### Issue 1: SDK Not Finding Configuration

**Error:**
```
Error: aetherlight.config.js not found
```

**Solution:**
```bash
# Ensure config file is in project root
ls aetherlight.config.js  # Should exist

# Or specify config path explicitly
const core = new AetherlightCore({
  configPath: './config/aetherlight.config.js'
});
```

---

### Issue 2: Pattern Library Not Loading

**Error:**
```
Error: Pattern library not found for domain 'legal'
```

**Solution:**
```bash
# Install domain-specific patterns
npm install @aetherlight/patterns-legal  # For legal domain
npm install @aetherlight/patterns-analytics  # For analytics
npm install @aetherlight/patterns-medical  # For medical

# Or provide custom pattern library
const core = new AetherlightCore({
  patternLibrary: './my-patterns.json'
});
```

---

### Issue 3: Network Connection Failed

**Error:**
```
Error: Failed to connect to neural network (DHT unreachable)
```

**Solution:**
```typescript
// Disable network features temporarily
const network = new NeuralNetwork({
  fallbackToLocal: true  // Use local-only if network fails
});

// Or explicitly check connectivity first
if (await network.isReachable()) {
  const matches = await network.discoverPatterns({ query });
} else {
  // Fall back to local search
  const matches = await core.matchPattern({ query });
}
```

---

## Performance Tuning

### Optimize Pattern Matching Speed

```typescript
// Default: Search all patterns (can be slow for large libraries)
const match = await core.matchPattern({ query });

// Optimize: Pre-filter by domain-specific criteria
const match = await core.matchPattern({
  query,
  filters: {
    jurisdiction: 'California',  // Only search CA patterns
    practiceArea: 'employment-law',  // Only employment law
    minConfidence: 0.90  // Only return 90%+ matches
  }
});

// Optimize: Enable caching
const core = new AetherlightCore({
  cache: {
    enabled: true,
    ttl: 300  // Cache results for 5 minutes
  }
});
```

**Result:** 10-50× faster queries for large pattern libraries

---

### Optimize Architecture Analysis

```typescript
// Default: Full analysis (can take 5-10 minutes for large codebases)
const analysis = await advisor.analyzeCodebase();

// Optimize: Incremental analysis (only changed files)
const analysis = await advisor.analyzeCodebase({
  incremental: true,
  since: 'HEAD~1'  // Only analyze files changed in last commit
});

// Optimize: Parallel analysis
const analysis = await advisor.analyzeCodebase({
  parallel: true,
  threads: 4  // Use 4 CPU cores
});
```

**Result:** 5-10× faster analysis for CI/CD pipelines

---

## Next Steps

✅ **You've integrated ÆtherLight!** Your app now has:
- Pattern recognition with confidence scoring
- Chain of Thought reasoning
- Architecture analysis
- Optional network integration

**What's next:**

1. **Customize patterns:** Add domain-specific patterns to `./patterns/`
2. **Join network:** Enable `contributePatterns: true` to share anonymized patterns
3. **Explore templates:** See [DOMAIN_TEMPLATES.md](DOMAIN_TEMPLATES.md) for industry-specific examples
4. **Get support:** Join our Discord (discord.gg/aetherlight) or email support@aetherlight.ai

---

**STATUS:** Integration guide complete, ready for developers
**PATTERN:** Pattern-SDK-002 (Rapid Integration Methodology)
**RELATED:** SDK_ARCHITECTURE.md (Architecture overview), DOMAIN_TEMPLATES.md (Industry examples)
