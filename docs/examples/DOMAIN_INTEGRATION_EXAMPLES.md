# ÆtherLight Integration Guide
## Plug-and-Play Conversational AI for Any Domain

```markdown
/**
 * ÆtherLight Integration Guide
 *
 * DESIGN DECISION: Provide step-by-step integration guides for common domains
 * WHY: Lower barrier to adoption - developers can copy-paste and customize
 *
 * REASONING CHAIN:
 * 1. ÆtherLight core is domain-agnostic (works for code, legal, SQL, medical, etc.)
 * 2. Each domain has unique patterns, metadata, and confidence dimensions
 * 3. Provide complete examples showing: setup, configuration, pattern library, usage
 * 4. Developers customize examples for their specific needs
 * 5. Time to integration: <1 hour (vs weeks building from scratch)
 *
 * PATTERN: Pattern-INTEGRATION-001 (Domain-Specific Integration Templates)
 * RELATED: PHASE_1_IMPLEMENTATION.md, PHASE_2_IMPLEMENTATION.md, PHASE_3_IMPLEMENTATION.md
 * FUTURE: Integration generator tool (CLI that scaffolds domain-specific setup)
 *
 * CREATED: 2025-10-04
 * LAST UPDATED: 2025-10-04
 * VERSION: 1.0
 * STATUS: Active
 */
```

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Integration 1: Legal Research Platform](#integration-1-legal-research-platform)
4. [Integration 2: Data Analytics Platform (NL → SQL)](#integration-2-data-analytics-platform-nl--sql)
5. [Integration 3: Medical Records System](#integration-3-medical-records-system)
6. [Integration 4: Customer Support Platform](#integration-4-customer-support-platform)
7. [Integration 5: Generic Application](#integration-5-generic-application)
8. [Upgrade Path](#upgrade-path)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### **What ÆtherLight Provides**

**Phase 1 (Weeks 1-2):** Text-based pattern matching
- Install: `npm install @aetherlight/node`
- Use: Text queries → Pattern matches with confidence scores
- **Integration time:** ~30 minutes

**Phase 2 (Weeks 3-4):** + Voice input
- Install: `npm install @aetherlight/voice`
- Use: Voice queries → Transcription → Pattern matches
- **Integration time:** +15 minutes (add voice to Phase 1 integration)

**Phase 3 (Weeks 5-6):** + Semantic search + Analytics
- Install: `npm install @aetherlight/intelligence`
- Use: Index YOUR data, semantic search, ROI dashboard
- **Integration time:** +30 minutes (add intelligence features)

**Total integration time:** ~1.25 hours for complete voice-to-intelligence platform

---

## Prerequisites

### **Phase 1 Requirements**

```bash
# Node.js 18+ (for bindings)
node --version  # Should be >= 18.0.0

# Rust (if building from source)
rustc --version  # Should be >= 1.70.0

# Package manager
npm --version  # or yarn, pnpm
```

### **Phase 2 Additional Requirements**

```bash
# Whisper model (for transcription)
# Downloaded automatically on first run
# Base model: ~74MB, Small: ~244MB, Medium: ~769MB

# Audio device (microphone)
# Automatically detected by cpal library
```

### **Phase 3 Additional Requirements**

```bash
# Disk space for indexed data
# ~100MB per 10,000 documents (embeddings + vector store)

# PostgreSQL (optional, for cloud deployment)
# Not required for local-first operation
```

---

## Integration 1: Legal Research Platform

### **Use Case**

Attorney speaks or types query → ÆtherLight matches legal precedents with confidence scores → Display relevant cases with reasoning.

### **Example Query**

```
"Find cases where non-compete agreements were deemed unenforceable in California"
```

**Expected Result:**
```json
{
  "matches": [
    {
      "case": "Edwards v. Arthur Andersen (2008)",
      "citation": "44 Cal. 4th 937",
      "confidence": 0.97,
      "reasoning": {
        "semantic_match": 0.95,
        "jurisdiction_match": 1.0,
        "citation_count": 0.98,
        "recency": 0.89
      },
      "key_holdings": [
        "Non-compete agreements generally void under Cal. Bus. & Prof. Code §16600",
        "Narrow exceptions for sale of business or partnership dissolution",
        "Courts strictly construe exceptions"
      ]
    }
  ]
}
```

---

### **Step 1: Install ÆtherLight (Phase 1)**

```bash
npm install @aetherlight/node
```

---

### **Step 2: Create Pattern Library (Legal Domain)**

Create `patterns/legal-precedents.json`:

```json
/**
 * Legal Pattern Library
 *
 * DESIGN DECISION: Structure legal patterns with jurisdiction, case law, holdings
 * WHY: Legal research requires jurisdiction-specific precedents with clear reasoning
 *
 * REASONING CHAIN:
 * 1. Each pattern represents a legal precedent (case or statute)
 * 2. Include metadata: jurisdiction, citation, practice area
 * 3. Chain of Thought captures: key holdings, procedural posture, distinguishing factors
 * 4. Confidence dimensions: jurisdiction match, citation count, recency, factual similarity
 * 5. Enables: "Find non-compete cases" → ranked by relevance with WHY
 *
 * PATTERN: Pattern-LEGAL-001 (Legal Precedent Structure)
 */
{
  "patterns": [
    {
      "id": "legal-001",
      "domain": "legal-research",
      "name": "Non-Compete Unenforceability (California)",
      "chainOfThought": {
        "designDecision": "California strictly prohibits non-compete agreements",
        "why": "Cal. Bus. & Prof. Code §16600 creates strong public policy favoring employee mobility",
        "reasoningChain": [
          "1. California Business & Professions Code §16600 voids non-compete agreements",
          "2. Narrow exceptions: sale of business (§16601), partnership dissolution (§16602), LLC member withdrawal (§16602.5)",
          "3. Edwards v. Arthur Andersen (2008) established 'narrow restraint' doctrine",
          "4. Courts strictly construe exceptions - burden on employer to prove exception applies",
          "5. Post-employment restrictions on client solicitation also disfavored"
        ],
        "alternatives": [
          "Trade secret protection: Available via CUTSA (uniform trade secrets act)",
          "Non-solicitation of employees: May be enforceable if narrowly tailored",
          "Confidentiality agreements: Enforceable if reasonable scope"
        ]
      },
      "metadata": {
        "jurisdiction": "California",
        "practiceArea": "Employment Law",
        "keyStatute": "Cal. Bus. & Prof. Code §16600",
        "landmarkCases": [
          {
            "case": "Edwards v. Arthur Andersen",
            "citation": "44 Cal. 4th 937 (2008)",
            "citationCount": 124,
            "year": 2008
          },
          {
            "case": "Kolani v. Gluska",
            "citation": "64 Cal. App. 4th 402 (1998)",
            "citationCount": 87,
            "year": 1998
          }
        ],
        "practicalGuidance": "Advise clients: Non-competes generally unenforceable in CA; focus on trade secret protection and narrowly-tailored confidentiality agreements instead"
      },
      "confidenceWeights": {
        "jurisdiction_match": 0.30,
        "practice_area_match": 0.20,
        "citation_count": 0.15,
        "recency": 0.10,
        "factual_similarity": 0.25
      }
    }
  ]
}
```

---

### **Step 3: Initialize ÆtherLight**

```typescript
/**
 * Legal Research Integration
 *
 * DESIGN DECISION: Local-first with attorney-client privilege compliance
 * WHY: Legal research must protect attorney-client privilege (no cloud uploads)
 *
 * REASONING CHAIN:
 * 1. Use local embeddings (all-MiniLM-L6-v2) - no API calls to OpenAI
 * 2. Use local vector store (ChromaDB) - data stays on device
 * 3. Transcription local (Whisper.cpp) - voice never sent to cloud
 * 4. Pattern matching local - no external API calls
 * 5. RESULT: Attorney-client privilege preserved, HIPAA/GDPR compliant
 *
 * PATTERN: Pattern-LEGAL-002 (Attorney-Client Privilege Compliance)
 */
import { LuminaClient } from '@aetherlight/lumina';

const client = new LuminaClient({
  domain: 'legal-research',
  patternLibrary: './patterns/legal-precedents.json',

  // Local-first (attorney-client privilege compliant)
  embeddingsProvider: 'local',  // No cloud API calls
  vectorStore: 'chromadb',      // Local SQLite-backed storage

  // Custom confidence dimensions for legal domain
  customDimensions: [
    { name: 'jurisdiction_match', weight: 0.30 },  // Critical for legal
    { name: 'practice_area_match', weight: 0.20 },
    { name: 'citation_count', weight: 0.15 },
    { name: 'recency', weight: 0.10 },
    { name: 'factual_similarity', weight: 0.25 }
  ],

  // Compliance mode
  complianceMode: 'attorney-client-privilege'
});
```

---

### **Step 4: Create API Endpoint**

```typescript
/**
 * Legal Research API Endpoint
 *
 * DESIGN DECISION: RESTful API with Chain of Thought responses
 * WHY: Frontend needs confidence breakdown to show attorney WHY each case is relevant
 *
 * REASONING CHAIN:
 * 1. Receive query from frontend (text or voice)
 * 2. ÆtherLight matches against legal pattern library
 * 3. Return ranked cases with confidence breakdown
 * 4. Frontend displays: case name, holdings, confidence breakdown, reasoning
 * 5. Attorney validates relevance, provides feedback (accepted/rejected)
 *
 * PATTERN: Pattern-API-001 (Legal Research Endpoint)
 */
import express from 'express';

const app = express();

app.post('/api/legal/search', async (req, res) => {
  const { query, jurisdiction, practiceArea, clientMatterId } = req.body;

  try {
    // Find matching precedents
    const matches = await aetherlight.findMatches(query, {
      jurisdiction,
      practiceArea,
      clientMatterId,  // For conflict checking
      userId: req.user.id
    });

    // Format response with Chain of Thought reasoning
    const results = matches.map(match => ({
      // Case information
      case: match.pattern.metadata.landmarkCases[0].case,
      citation: match.pattern.metadata.landmarkCases[0].citation,

      // Confidence score
      confidence: match.confidence,

      // Confidence breakdown (show attorney WHY this match)
      confidenceBreakdown: match.confidenceBreakdown,

      // Chain of Thought reasoning
      keyHoldings: match.pattern.chainOfThought.reasoningChain,
      practicalGuidance: match.pattern.metadata.practicalGuidance,

      // Related cases
      relatedCases: match.pattern.metadata.landmarkCases.slice(1),

      // Timeline context
      year: match.pattern.metadata.landmarkCases[0].year,
      citationCount: match.pattern.metadata.landmarkCases[0].citationCount
    }));

    res.json({ results });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record attorney feedback (for learning loop)
app.post('/api/legal/feedback', async (req, res) => {
  const { matchId, helpful, notes } = req.body;

  await aetherlight.recordOutcome(matchId, {
    accepted: helpful,
    feedback: notes,
    userId: req.user.id,
    timestamp: new Date()
  });

  res.json({ success: true });
});
```

---

### **Step 5: Add Voice Support (Phase 2)**

```typescript
/**
 * Voice-Enabled Legal Research
 *
 * DESIGN DECISION: Add voice input to existing text-based endpoint
 * WHY: Attorneys often research while reviewing documents (hands-free is valuable)
 *
 * REASONING CHAIN:
 * 1. Existing endpoint handles text queries (Phase 1) ✅
 * 2. Add voice endpoint that transcribes THEN calls text endpoint
 * 3. Transcription local (Whisper.cpp) - attorney-client privilege preserved
 * 4. Zero code changes to existing logic (voice is just another input method)
 *
 * PATTERN: Pattern-VOICE-004 (Voice as Input Layer)
 */
import { VoiceCapture } from '@aetherlight/voice';

app.post('/api/legal/voice-search', async (req, res) => {
  const audioBuffer = req.body.audio;  // Audio from client (base64 or buffer)

  try {
    // Transcribe audio (local, attorney-client privilege compliant)
    const text = await VoiceCapture.transcribe(audioBuffer, {
      language: 'en',  // or auto-detect
      model: 'base'    // base model: 74MB, good accuracy
    });

    // Use existing text search endpoint logic
    const matches = await aetherlight.findMatches(text, {
      jurisdiction: req.body.jurisdiction,
      practiceArea: req.body.practiceArea,
      clientMatterId: req.body.clientMatterId,
      userId: req.user.id
    });

    res.json({
      transcription: text,  // Show attorney what was heard
      results: formatResults(matches)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Zero changes to Phase 1 code** - voice is additive.

---

### **Step 6: Add Semantic Search (Phase 3)**

```typescript
/**
 * Semantic Document Search
 *
 * DESIGN DECISION: Index attorney's case files for semantic search
 * WHY: "Find where we discussed statute of limitations" → relevant passages
 *
 * REASONING CHAIN:
 * 1. Attorney has case files (briefs, memos, depositions)
 * 2. Index documents with ÆtherLight (chunk by paragraph/section)
 * 3. Semantic search: "Find statute of limitations arguments" → relevant passages
 * 4. Much faster than reading entire case file
 *
 * PATTERN: Pattern-LEGAL-003 (Case File Semantic Search)
 */
import { DocumentIndexer } from '@aetherlight/intelligence';

// Index case files
app.post('/api/legal/index-case', async (req, res) => {
  const { caseId, documents } = req.body;

  const indexer = new DocumentIndexer(aetherlight);

  for (const doc of documents) {
    await indexer.indexDocument({
      id: doc.id,
      content: doc.content,
      metadata: {
        caseId,
        documentType: doc.type,  // brief, memo, deposition, etc.
        date: doc.date,
        author: doc.author
      }
    }, 'legal');
  }

  res.json({ success: true, documentsIndexed: documents.length });
});

// Semantic search within case files
app.post('/api/legal/search-case', async (req, res) => {
  const { query, caseId } = req.body;

  const results = await aetherlight.searchDocuments(query, {
    domain: 'legal',
    filters: { caseId }  // Search only this case's documents
  });

  res.json({ results });
});
```

---

### **Step 7: Add Analytics Dashboard (Phase 3)**

```typescript
/**
 * Attorney Impact Dashboard
 *
 * DESIGN DECISION: Show time savings to justify subscription cost
 * WHY: Attorneys bill by the hour - ROI must be clear
 *
 * REASONING CHAIN:
 * 1. Track: queries submitted, precedents accepted, time spent
 * 2. Estimate: time saved per accepted precedent (vs manual research)
 * 3. Calculate: "You saved 2.5 hours this week"
 * 4. Attorney shows ROI to managing partner → justifies $15/month cost
 *
 * PATTERN: Pattern-ANALYTICS-002 (Legal ROI Dashboard)
 */
app.get('/api/legal/analytics', async (req, res) => {
  const { period } = req.query;  // 'week', 'month', 'year'

  const report = await aetherlight.getImpactReport(period, {
    userId: req.user.id
  });

  res.json({
    period,
    totalQueries: report.total_queries,
    acceptedPrecedents: report.accepted_patterns,
    successRate: `${(report.success_rate * 100).toFixed(0)}%`,
    timeSavedHours: report.total_time_saved_hours,
    topPrecedents: report.top_patterns,

    // Legal-specific metrics
    billableHoursSaved: report.total_time_saved_hours,
    revenueImpact: report.total_time_saved_hours * attorneyHourlyRate,
    roiMultiplier: (report.total_time_saved_hours * attorneyHourlyRate) / subscriptionCost
  });
});
```

---

## Integration 2: Data Analytics Platform (NL → SQL)

### **Use Case**

Analyst speaks or types natural language query → ÆtherLight matches SQL patterns → Generate validated SQL with confidence score.

### **Example Query**

```
"Show Q4 2024 sales trends grouped by region in the Western US"
```

**Expected Result:**
```sql
-- Confidence: 94%
-- Pattern: Time-Series Analysis with Geographic Filter
-- Reasoning: Matched time range (Q4), metric (sales), geographic scope (Western US)

SELECT
  DATE_TRUNC('day', order_date) as date,
  region_name,
  SUM(order_total) as daily_sales
FROM orders o
JOIN regions r ON o.region_id = r.region_id
WHERE
  order_date BETWEEN '2024-10-01' AND '2024-12-31'
  AND r.region_name IN ('California', 'Oregon', 'Washington', 'Nevada', 'Arizona')
GROUP BY 1, 2
ORDER BY 1, 2;

-- Estimated execution time: ~450ms
-- Estimated rows: ~920
```

---

### **Step 1: Install ÆtherLight**

```bash
npm install @aetherlight/node
```

---

### **Step 2: Create Pattern Library (SQL Domain)**

Create `patterns/sql-queries.json`:

```json
/**
 * SQL Pattern Library
 *
 * DESIGN DECISION: Store proven SQL patterns with execution context
 * WHY: SQL generation requires understanding schema, performance, business rules
 *
 * REASONING CHAIN:
 * 1. Each pattern represents a proven SQL query template
 * 2. Include metadata: tables used, typical execution time, business context
 * 3. Chain of Thought captures: why this approach, alternatives considered
 * 4. Confidence dimensions: schema match, keyword overlap, historical success
 * 5. Enables: "Show sales by region" → validated SQL with confidence
 *
 * PATTERN: Pattern-SQL-001 (SQL Query Pattern Structure)
 */
{
  "patterns": [
    {
      "id": "sql-001",
      "domain": "data-analytics",
      "name": "Time-Series Analysis with Geographic Filter",
      "chainOfThought": {
        "designDecision": "Use DATE_TRUNC for time grouping + WHERE clause for geographic filter",
        "why": "93% faster than subqueries; explicit date ranges optimize query planner",
        "reasoningChain": [
          "1. Parse natural language time range (Q4 2024) → SQL date range",
          "2. Identify geographic scope (Western US) → region filter",
          "3. Determine aggregation level (daily/weekly/monthly based on time range)",
          "4. Use DATE_TRUNC for clean time grouping (vs EXTRACT which is slower)",
          "5. JOIN regions table for human-readable region names",
          "6. GROUP BY date and region for pivot-ready output"
        ],
        "alternatives": [
          "Subquery approach: 3x slower due to query planner inefficiency",
          "EXTRACT(MONTH): Works but loses day-level granularity",
          "Window functions: Overkill for simple aggregation, slower"
        ]
      },
      "sqlTemplate": "SELECT DATE_TRUNC('{{timeGranularity}}', order_date) as date, region_name, SUM({{metric}}) as total FROM orders o JOIN regions r ON o.region_id = r.region_id WHERE order_date BETWEEN '{{startDate}}' AND '{{endDate}}' AND r.region_name IN ({{regions}}) GROUP BY 1, 2 ORDER BY 1, 2",
      "metadata": {
        "tables": ["orders", "regions"],
        "avgExecutionTime": "450ms",
        "avgRowsReturned": 920,
        "successRate": 0.96,
        "usageCount": 47,
        "createdBy": "Data team",
        "lastUsed": "2025-10-03",
        "businessContext": "Regional sales analysis for quarterly board reporting"
      },
      "confidenceWeights": {
        "schema_match": 0.30,
        "keyword_overlap": 0.20,
        "historical_success": 0.20,
        "execution_cost": 0.15,
        "user_permission": 0.15
      }
    }
  ]
}
```

---

### **Step 3: Initialize ÆtherLight**

```typescript
/**
 * Data Analytics Integration
 *
 * DESIGN DECISION: Validate SQL against schema before execution
 * WHY: Incorrect SQL can be expensive (full table scans, timeouts, wrong data)
 *
 * REASONING CHAIN:
 * 1. Match natural language query to SQL patterns
 * 2. Populate template variables (dates, metrics, filters)
 * 3. Validate against schema (tables exist, columns exist, joins valid)
 * 4. Estimate execution cost (explain plan)
 * 5. Show confidence + estimated cost BEFORE execution
 * 6. User confirms → execute → track outcome
 *
 * PATTERN: Pattern-SQL-002 (SQL Validation Pipeline)
 */
import { AetherlightCore } from '@aetherlight/node';

const aetherlight = new AetherlightCore({
  domain: 'data-analytics',
  patternLibrary: './patterns/sql-queries.json',

  // Can use cloud embeddings (data is internal, not customer-facing)
  embeddingsProvider: 'openai',  // or 'local' for offline
  vectorStore: 'chromadb',

  // Custom confidence dimensions for SQL domain
  customDimensions: [
    { name: 'schema_match', weight: 0.30 },       // Critical - tables/columns exist
    { name: 'keyword_overlap', weight: 0.20 },
    { name: 'historical_success', weight: 0.20 },
    { name: 'execution_cost', weight: 0.15 },     // Prevent expensive queries
    { name: 'user_permission', weight: 0.15 }     // User can access these tables
  ]
});
```

---

### **Step 4: Create API Endpoint**

```typescript
/**
 * Natural Language to SQL API
 *
 * DESIGN DECISION: Two-step process (suggest → confirm → execute)
 * WHY: Show user the SQL and confidence BEFORE running it
 *
 * REASONING CHAIN:
 * 1. User submits natural language query
 * 2. ÆtherLight returns SQL suggestions with confidence scores
 * 3. User reviews SQL, sees confidence breakdown
 * 4. User confirms → execute query → return results
 * 5. User provides feedback (correct/incorrect) → learning loop
 *
 * PATTERN: Pattern-API-002 (Two-Step SQL Generation)
 */
import express from 'express';
import { Client as PostgresClient } from 'pg';

const app = express();
const dbClient = new PostgresClient({ /* connection config */ });

// Step 1: Suggest SQL
app.post('/api/analytics/suggest-sql', async (req, res) => {
  const { query, userId } = req.body;

  try {
    // Get database schema for validation
    const schema = await getDatabaseSchema();

    // Match natural language to SQL patterns
    const matches = await aetherlight.findMatches(query, {
      schema,
      userId,
      userPermissions: await getUserTablePermissions(userId)
    });

    // Populate SQL templates with extracted parameters
    const suggestions = await Promise.all(matches.map(async match => {
      const sql = populateSQLTemplate(match.pattern.sqlTemplate, query);
      const explainPlan = await dbClient.query(`EXPLAIN ${sql}`);

      return {
        sql,
        confidence: match.confidence,
        confidenceBreakdown: match.confidenceBreakdown,
        reasoning: match.pattern.chainOfThought.reasoningChain,
        estimatedTime: match.pattern.metadata.avgExecutionTime,
        estimatedRows: match.pattern.metadata.avgRowsReturned,
        explainPlan: explainPlan.rows
      };
    }));

    res.json({ suggestions });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Execute confirmed SQL
app.post('/api/analytics/execute-sql', async (req, res) => {
  const { sql, matchId } = req.body;

  try {
    const startTime = Date.now();
    const result = await dbClient.query(sql);
    const executionTime = Date.now() - startTime;

    // Track execution for learning loop
    await aetherlight.recordOutcome(matchId, {
      accepted: true,
      executionTime,
      rowsReturned: result.rows.length,
      userId: req.user.id
    });

    res.json({
      rows: result.rows,
      executionTime,
      rowCount: result.rows.length
    });

  } catch (error) {
    // Track failure
    await aetherlight.recordOutcome(matchId, {
      accepted: false,
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({ error: error.message });
  }
});
```

---

### **Step 5: Add Voice Support (Phase 2)**

```typescript
/**
 * Voice-to-SQL
 *
 * DESIGN DECISION: Identical to legal integration - voice is just input layer
 * WHY: Code reuse, consistent UX across domains
 *
 * PATTERN: Pattern-VOICE-004 (Voice as Input Layer) - REUSED
 */
import { VoiceCapture } from '@aetherlight/voice';

app.post('/api/analytics/voice-to-sql', async (req, res) => {
  const audioBuffer = req.body.audio;

  // Transcribe
  const text = await VoiceCapture.transcribe(audioBuffer);

  // Use existing suggest-sql logic
  const schema = await getDatabaseSchema();
  const matches = await aetherlight.findMatches(text, {
    schema,
    userId: req.user.id,
    userPermissions: await getUserTablePermissions(req.user.id)
  });

  res.json({
    transcription: text,
    suggestions: await formatSuggestions(matches)
  });
});
```

**Same pattern as legal integration** - voice is domain-agnostic.

---

### **Step 6: Add Query History Search (Phase 3)**

```typescript
/**
 * Semantic SQL Query History Search
 *
 * DESIGN DECISION: Index past queries for semantic search
 * WHY: "Find queries about customer churn" → relevant past queries
 *
 * PATTERN: Pattern-SQL-003 (Query History Semantic Search)
 */
app.post('/api/analytics/index-query', async (req, res) => {
  const { sql, description, userId } = req.body;

  await aetherlight.indexDocument({
    id: generateQueryId(),
    content: `${description}\n\n${sql}`,
    metadata: {
      userId,
      sql,
      executedAt: new Date(),
      tables: extractTables(sql)
    }
  }, 'sql');

  res.json({ success: true });
});

app.post('/api/analytics/search-history', async (req, res) => {
  const { query, userId } = req.body;

  const results = await aetherlight.searchDocuments(query, {
    domain: 'sql',
    filters: { userId }  // Only search this user's queries
  });

  res.json({ results });
});
```

---

## Integration 3: Medical Records System

### **Use Case**

Doctor speaks query → ÆtherLight matches patient records with HIPAA compliance → Display relevant records.

**Example Query:**
```
"Find all diabetes patients with A1C greater than 7 who missed their last appointment"
```

### **Key Requirements**

1. **HIPAA Compliance** - All data stays local (no cloud uploads)
2. **Patient Consent** - Verify consent before search
3. **Audit Trail** - Log every access with justification
4. **De-identification** - Remove PHI from patterns before sharing

### **Implementation Highlights**

```typescript
/**
 * HIPAA-Compliant Medical Records Search
 *
 * DESIGN DECISION: Local-only processing, strict audit trail
 * WHY: HIPAA requires: (1) No PHI in cloud, (2) Audit all access, (3) Patient consent
 *
 * REASONING CHAIN:
 * 1. All processing local (embeddings, vector store, transcription)
 * 2. Verify patient consent before search
 * 3. Log every access with: who, what, when, why (justification)
 * 4. De-identify patterns before sharing with team
 * 5. Encrypt data at rest (OS-level encryption)
 *
 * PATTERN: Pattern-MEDICAL-001 (HIPAA-Compliant Search)
 */
const aetherlight = new AetherlightCore({
  domain: 'medical-records',
  patternLibrary: './patterns/medical-queries.json',

  // HIPAA compliance: ALL local
  embeddingsProvider: 'local',  // No cloud API
  vectorStore: 'chromadb',      // Local SQLite
  complianceMode: 'HIPAA',      // Enforces audit logging

  // Encryption
  encryption: {
    atRest: true,  // Encrypt ChromaDB database
    keyProvider: 'os-keychain'  // Use OS keychain for keys
  }
});

// Search with HIPAA compliance checks
app.post('/api/medical/search', async (req, res) => {
  const { query, justification, providerId } = req.body;

  // 1. Verify provider permissions
  const provider = await verifyProvider(providerId);
  if (!provider.canAccessRecords) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // 2. Find matching records
  const matches = await aetherlight.findMatches(query, {
    providerId,
    facilityId: provider.facilityId
  });

  // 3. Verify patient consent for each result
  const authorizedRecords = await Promise.all(
    matches.map(async match => {
      const patient = await getPatient(match.pattern.metadata.patientId);
      const hasConsent = await verifyConsent(patient.id, 'search');

      return hasConsent ? match : null;
    })
  ).then(results => results.filter(r => r !== null));

  // 4. Audit log (HIPAA requirement)
  await auditLog({
    action: 'SEARCH_RECORDS',
    providerId,
    query,
    justification,
    recordsAccessed: authorizedRecords.map(r => r.pattern.metadata.patientId),
    timestamp: new Date()
  });

  // 5. Return de-identified results
  res.json({
    results: authorizedRecords.map(deidentifyRecord)
  });
});
```

---

## Integration 4: Customer Support Platform

### **Use Case**

Support agent types or speaks customer issue → ÆtherLight matches past ticket resolutions → Suggest solutions with confidence.

**Implementation:** Similar to legal integration, but with ticket history instead of legal precedents.

---

## Integration 5: Generic Application

### **Template for ANY Domain**

```typescript
/**
 * Generic ÆtherLight Integration Template
 *
 * DESIGN DECISION: Universal pattern - customize for your domain
 * WHY: All domains follow same structure: patterns + matching + feedback
 *
 * REASONING CHAIN:
 * 1. Define your domain (e.g., "customer-support", "financial-analysis")
 * 2. Create pattern library with Chain of Thought documentation
 * 3. Define custom confidence dimensions (what matters for your domain)
 * 4. Initialize ÆtherLight with domain config
 * 5. Create API endpoints (text search, voice search, feedback)
 * 6. Add Phase 3 features (semantic search, analytics) as needed
 *
 * PATTERN: Pattern-INTEGRATION-002 (Universal Integration Template)
 */
import { AetherlightCore } from '@aetherlight/node';

// Step 1: Initialize
const aetherlight = new AetherlightCore({
  domain: 'YOUR_DOMAIN',  // e.g., 'customer-support', 'financial-analysis'
  patternLibrary: './patterns/YOUR_PATTERNS.json',
  embeddingsProvider: 'local',  // or 'openai' if privacy not critical
  vectorStore: 'chromadb',

  // Custom confidence dimensions (define what matters for your domain)
  customDimensions: [
    { name: 'YOUR_DIMENSION_1', weight: 0.30 },
    { name: 'YOUR_DIMENSION_2', weight: 0.20 },
    { name: 'YOUR_DIMENSION_3', weight: 0.15 },
    // ...
  ]
});

// Step 2: Text search endpoint
app.post('/api/YOUR_DOMAIN/search', async (req, res) => {
  const { query, context } = req.body;

  const matches = await aetherlight.findMatches(query, context);

  res.json({ results: formatResults(matches) });
});

// Step 3: Voice search endpoint (Phase 2)
import { VoiceCapture } from '@aetherlight/voice';

app.post('/api/YOUR_DOMAIN/voice-search', async (req, res) => {
  const text = await VoiceCapture.transcribe(req.body.audio);
  const matches = await aetherlight.findMatches(text, req.body.context);

  res.json({ transcription: text, results: formatResults(matches) });
});

// Step 4: Feedback endpoint (learning loop)
app.post('/api/YOUR_DOMAIN/feedback', async (req, res) => {
  await aetherlight.recordOutcome(req.body.matchId, {
    accepted: req.body.helpful,
    feedback: req.body.notes,
    userId: req.user.id
  });

  res.json({ success: true });
});

// Step 5: Analytics (Phase 3)
app.get('/api/YOUR_DOMAIN/analytics', async (req, res) => {
  const report = await aetherlight.getImpactReport(req.query.period);
  res.json(report);
});
```

**Customization points:**
1. `YOUR_DOMAIN` - Your domain name
2. `YOUR_PATTERNS.json` - Your domain-specific patterns
3. `customDimensions` - What matters for confidence in your domain
4. `formatResults()` - How to present results to your users

---

## Upgrade Path

### **Phase 1 → Phase 2 (Add Voice)**

```bash
# Install voice package
npm install @aetherlight/voice

# Update code (additive, no breaking changes)
import { VoiceCapture } from '@aetherlight/voice';

// Add voice endpoint (text endpoint unchanged)
app.post('/api/voice-search', async (req, res) => {
  const text = await VoiceCapture.transcribe(req.body.audio);
  // Use existing text search logic
  const matches = await aetherlight.findMatches(text, context);
  res.json({ transcription: text, results: matches });
});
```

**Zero changes to Phase 1 code** ✅

---

### **Phase 2 → Phase 3 (Add Intelligence)**

```bash
# Install intelligence package
npm install @aetherlight/intelligence

# Add semantic search (additive)
import { DocumentIndexer } from '@aetherlight/intelligence';

app.post('/api/index', async (req, res) => {
  await aetherlight.indexDocuments(req.body.documents, 'YOUR_DOMAIN');
  res.json({ success: true });
});

app.post('/api/search-documents', async (req, res) => {
  const results = await aetherlight.searchDocuments(req.body.query, {
    domain: 'YOUR_DOMAIN'
  });
  res.json({ results });
});
```

**Zero changes to Phase 1 or Phase 2 code** ✅

---

## Performance Tuning

### **Embeddings: Local vs Cloud**

```typescript
// Local (free, offline, slower)
embeddingsProvider: 'local'  // ~10ms per query, 384 dimensions

// OpenAI (paid, cloud, faster, better accuracy)
embeddingsProvider: 'openai'  // ~200ms per query (network), 1536 dimensions

// Cohere (paid, cloud, fast, multilingual)
embeddingsProvider: 'cohere'  // ~100ms per query, 1024 dimensions
```

**Recommendation:**
- **Legal/Medical:** Use `local` (privacy compliance)
- **Internal tools:** Use `openai` or `cohere` (better accuracy)

---

### **Vector Store: ChromaDB vs Pinecone**

```typescript
// ChromaDB (local, free, embedded)
vectorStore: 'chromadb'  // <10ms queries, SQLite-backed, local-first

// Pinecone (cloud, paid, scalable)
vectorStore: 'pinecone'  // ~50ms queries (network), millions of vectors, cloud-hosted
```

**Recommendation:**
- **<100k patterns:** Use `chromadb` (local, fast, free)
- **>100k patterns:** Use `pinecone` (scalable, cloud-hosted)

---

## Storage Management & Pricing

### **Device-Aware Storage Allocation**

```typescript
/**
 * Storage Manager Integration
 *
 * DESIGN DECISION: Device-aware storage allocation with viral growth mechanics
 * WHY: Desktop has 100GB+ free, mobile has <5GB. Auto-detect and recommend allocation.
 *
 * REASONING CHAIN:
 * 1. Detect device type (Desktop/Laptop/Tablet/Phone)
 * 2. Check free space available
 * 3. Recommend allocation based on device + subscription tier
 * 4. User can override with custom allocation
 * 5. Viral bonus: +10MB/+20MB/+50MB per accepted invitation (by tier)
 *
 * PATTERN: Pattern-STORAGE-001 (Multi-Layer Distributed Storage)
 * RELATED: BUSINESS_MODEL_V2.md, Pattern-VIRAL-001
 */
import { StorageManager } from '@aetherlight/lumina';

const storage = new StorageManager({
  deviceType: 'auto-detect',  // or 'desktop', 'laptop', 'tablet', 'phone'
  subscriptionTier: 'network'  // 'free', 'network', 'pro', 'enterprise'
});

// Get recommended allocation
const allocation = await storage.getRecommendedAllocation();
console.log(allocation);
// {
//   deviceType: 'desktop',
//   minAllocation: '1GB',
//   recommended: '10GB',
//   maxAllocation: '100GB',  // 10% of free space
//   currentFreeSpace: '1.2TB',
//   rationale: 'Desktop users typically have ample storage and power'
// }

// Set custom allocation
await storage.setAllocation('25GB');

// Check current usage
const usage = await storage.getUsage();
console.log(usage);
// {
//   allocated: '25GB',
//   used: '3.2GB',
//   available: '21.8GB',
//   usagePercentage: 12.8,
//   viralBonus: '+60MB from 3 invitations'
// }
```

### **Device-Specific Allocation Defaults**

| Device Type | Min | Recommended | Max | Rationale |
|-------------|-----|-------------|-----|-----------|
| **Desktop** | 1GB | 10GB | 100GB (10% free) | Desktops have TBs, always plugged in |
| **Laptop** | 500MB | 5GB | 50GB (5% free) | Laptops moderate storage, mobile use |
| **Tablet** | 200MB | 2GB | 20GB (3% free) | Tablets limited storage, casual use |
| **Phone** | 50MB | 500MB | 10GB (1% free) | Phones constrained, battery-sensitive |

**Auto-Detection:**
- Desktop: AC power + >500GB free space
- Laptop: Portable form factor + 100GB-500GB free space
- Tablet: Touch-first interface + <100GB free space
- Phone: Mobile OS (iOS/Android) + <100GB free space

---

### **Pricing Tiers & Storage**

```typescript
/**
 * Pricing Tier Configuration
 *
 * DESIGN DECISION: Simple 4-tier model with viral storage scaling
 * WHY: Easy to understand, viral growth built-in, zero-marginal-cost scaling
 *
 * PRICING MODEL:
 * - Free: $0 (local-only, 100MB, no invites)
 * - Network: $4.99/month (team sync, 500MB base + 10MB per invite, cap 250MB)
 * - Pro: $14.99/month (advanced features, 2GB base + 20MB per invite, cap 1GB)
 * - Enterprise: $49/month (self-hosted, 10GB base + 50MB per invite, cap 10GB)
 *
 * PATTERN: Pattern-BUSINESS-001 (Zero-Marginal-Cost Network Effects)
 * RELATED: BUSINESS_MODEL_V2.md, VIRAL_GROWTH_STRATEGY.md
 */
const pricing = {
  free: {
    price: 0,
    storage: {
      base: '100MB',
      bonusPerInvite: '0MB',
      cap: '100MB'
    },
    features: ['Local-only', 'Pattern matching', 'Voice capture', 'Offline mode'],
    sync: 'None',
    viralInvites: false
  },

  network: {
    price: 4.99,  // per month
    storage: {
      base: '500MB',
      bonusPerInvite: '+10MB',
      cap: '750MB (25 invites)'
    },
    features: ['All Free features', 'Team sync (5 users)', 'Cloud backup', 'Viral invites'],
    sync: 'Team (5 users)',
    viralInvites: true
  },

  pro: {
    price: 14.99,  // per month
    storage: {
      base: '2GB',
      bonusPerInvite: '+20MB',
      cap: '3GB (50 invites)'
    },
    features: ['All Network features', 'Unlimited team sync', 'Advanced analytics', 'Priority support'],
    sync: 'Unlimited team',
    viralInvites: true
  },

  enterprise: {
    price: 49,  // per month
    storage: {
      base: '10GB',
      bonusPerInvite: '+50MB',
      cap: '20GB (200 invites)'
    },
    features: ['All Pro features', 'Self-hosted option', 'SSO/SAML', 'SLA', 'Dedicated support'],
    sync: 'Self-hosted or cloud',
    viralInvites: true
  }
};

// Get pricing for user's tier
const tierInfo = pricing[user.subscriptionTier];
console.log(`Base storage: ${tierInfo.storage.base}`);
console.log(`Viral bonus: ${tierInfo.storage.bonusPerInvite} per accepted invite`);
console.log(`Cap: ${tierInfo.storage.cap}`);
```

---

### **Viral Invitation System**

```typescript
/**
 * Invitation Flow Integration
 *
 * DESIGN DECISION: Incentivize invitations with storage bonuses
 * WHY: Creates K-factor >1.5 viral loop (selfish viral growth)
 *
 * VIRAL MATH:
 * - Network user sends 8 invites
 * - 40% accept and sign up (3.2 signups)
 * - 75% convert to paid (2.4 paid users)
 * - K-factor = 8 × 0.40 × 0.75 = 2.4 ✅
 *
 * PATTERN: Pattern-VIRAL-001 (Storage-Based Viral Growth)
 * RELATED: BUSINESS_MODEL_V2.md
 */
import { InvitationManager } from '@aetherlight/lumina';

const invitations = new InvitationManager({
  userId: user.id,
  tier: user.subscriptionTier
});

// Send invitations
const inviteLink = await invitations.generateInviteLink({
  senderName: user.name,
  customMessage: 'Join me on Lumina!'
});

// Track invitation status
const status = await invitations.getStatus();
console.log(status);
// {
//   sent: 8,
//   pending: 5,
//   accepted: 3,
//   bonusEarned: '+30MB',  // 3 × 10MB (Network tier)
//   bonusRemaining: '+220MB', // 22 more invites to cap
//   kFactor: 2.4
// }

// Display to user
app.get('/api/invitations/ui', (req, res) => {
  res.json({
    currentBonus: status.bonusEarned,
    potentialBonus: `+${invitations.bonusPerInvite}MB per invite`,
    remaining: status.bonusRemaining,
    progress: `${status.accepted} / ${invitations.cap} invites`,
    upgradePrompt: user.tier === 'free'
      ? 'Upgrade to Network tier to unlock viral invites (+10MB each)'
      : null
  });
});
```

---

### **Storage Quota Management**

```typescript
/**
 * Quota Enforcement
 *
 * DESIGN DECISION: Soft limits with upgrade prompts
 * WHY: Never lose data, always prompt for upgrade when approaching limit
 *
 * REASONING CHAIN:
 * 1. Monitor storage usage in real-time
 * 2. At 80%: Warning notification
 * 3. At 95%: Urgent notification + upgrade prompt
 * 4. At 100%: Pause new syncs, show upgrade options
 * 5. Never delete data (user controls deletion)
 *
 * PATTERN: Pattern-STORAGE-002 (Quota Management)
 */
import { QuotaManager } from '@aetherlight/lumina';

const quota = new QuotaManager({
  userId: user.id,
  tier: user.subscriptionTier,
  allocation: user.storageAllocation
});

// Check quota status
const status = await quota.getStatus();
if (status.usagePercentage > 0.95) {
  // Show upgrade prompt
  showNotification({
    type: 'urgent',
    title: 'Storage Almost Full',
    message: `You're using ${status.used} of ${status.allocated}`,
    actions: [
      { label: 'Invite teammates (+10MB each)', action: 'invite' },
      { label: 'Upgrade to Pro (2GB)', action: 'upgrade' },
      { label: 'Manage storage', action: 'settings' }
    ]
  });
} else if (status.usagePercentage > 0.80) {
  // Show warning
  showNotification({
    type: 'warning',
    title: 'Storage Running Low',
    message: `${Math.round((1 - status.usagePercentage) * 100)}% remaining`,
    actions: [
      { label: 'Invite teammates', action: 'invite' }
    ]
  });
}

// Pause sync at 100% (never delete data)
if (status.usagePercentage >= 1.0) {
  await quota.pauseSync();
  console.log('Sync paused. Upgrade or invite teammates to resume.');
}
```

---

### **Per-Domain Storage Examples**

#### **Legal Research Platform**

```typescript
// Legal domain: 500MB-2GB typical (cases, briefs, memos)
const storage = new StorageManager({
  domain: 'legal-research',
  tier: 'pro',              // $14.99/month
  allocation: '2GB'          // Base allocation
});

// Storage breakdown
const breakdown = await storage.getBreakdown();
console.log(breakdown);
// {
//   patterns: '125MB',        // Legal precedent patterns
//   documents: '850MB',       // Indexed case files
//   vectorStore: '320MB',     // ChromaDB embeddings
//   audioCache: '180MB',      // Voice recordings (optional)
//   viralBonus: '+400MB',     // 20 invites × 20MB (Pro tier)
//   total: '1.875GB / 2.4GB'
// }
```

#### **Data Analytics Platform**

```typescript
// Analytics domain: 1GB-10GB typical (query history, data catalogs)
const storage = new StorageManager({
  domain: 'data-analytics',
  tier: 'enterprise',       // $49/month
  allocation: '10GB'         // Base allocation
});

// Storage breakdown
const breakdown = await storage.getBreakdown();
console.log(breakdown);
// {
//   patterns: '450MB',        // SQL query patterns
//   queryHistory: '2.3GB',    // Past queries indexed
//   dataCatalog: '1.8GB',     // Schema embeddings
//   resultCache: '3.5GB',     // Cached query results
//   viralBonus: '+5GB',       // 100 invites × 50MB (Enterprise tier)
//   total: '13.05GB / 15GB'
// }
```

#### **Medical Records System**

```typescript
// Medical domain: 2GB-50GB typical (patient records, HIPAA-compliant)
const storage = new StorageManager({
  domain: 'medical-records',
  tier: 'enterprise',       // $49/month (HIPAA requires enterprise)
  allocation: '50GB',        // Custom allocation (high-capacity hospital)
  encryption: true,          // HIPAA compliance
  auditLog: true            // Track all access
});

// Storage breakdown (HIPAA-compliant)
const breakdown = await storage.getBreakdown();
console.log(breakdown);
// {
//   patterns: '280MB',        // De-identified medical patterns
//   patientRecords: '42GB',   // Encrypted PHI
//   vectorStore: '1.2GB',     // Embeddings (encrypted)
//   auditLog: '650MB',        // HIPAA audit trail
//   viralBonus: '+0MB',       // No viral invites (PHI sensitive)
//   total: '44.13GB / 50GB'
// }
```

---

### **Battery-Aware Sync Scheduling**

```typescript
/**
 * Adaptive Sync Strategy
 *
 * DESIGN DECISION: Sync frequency adapts to device type, power state, network
 * WHY: Mobile devices must conserve battery, desktops can sync 24/7
 *
 * REASONING CHAIN:
 * 1. Desktop (AC power): Sync 24/7, full DHT participation
 * 2. Laptop (AC power): Sync 24/7, DHT participation
 * 3. Laptop (Battery): Sync on Wi-Fi only, pause DHT
 * 4. Mobile (Charging): Sync on Wi-Fi, limited DHT
 * 5. Mobile (Battery): Manual sync or schedule (Wi-Fi-only)
 *
 * PATTERN: Pattern-SYNC-001 (Battery-Aware Sync)
 */
import { SyncManager } from '@aetherlight/lumina';

const sync = new SyncManager({
  deviceType: 'laptop',
  syncStrategy: 'adaptive'  // 'aggressive', 'balanced', 'conservative', 'manual'
});

// Adaptive sync (recommended)
sync.on('powerStateChange', async (state) => {
  if (state.onAC && state.onWiFi) {
    await sync.setSyncFrequency('every-5-minutes');
    await sync.enableDHTParticipation();
  } else if (state.onBattery && state.onWiFi) {
    await sync.setSyncFrequency('every-30-minutes');
    await sync.disableDHTParticipation();
  } else if (state.onBattery && state.onCellular) {
    await sync.pauseSync();  // Manual sync only
  }
});

// Custom sync schedule
await sync.setSchedule({
  desktop: {
    acPower: 'sync-continuously',
    dht: 'enabled'
  },
  laptop: {
    acPower: 'sync-every-5-min',
    battery: 'sync-every-30-min-wifi-only',
    dht: 'enabled-on-ac-only'
  },
  mobile: {
    charging: 'sync-every-15-min-wifi-only',
    battery: 'manual-sync-only',
    dht: 'disabled'  // Too battery-intensive for mobile
  }
});
```

---

### **Pricing Calculator for Customers**

```typescript
/**
 * ROI Calculator
 *
 * DESIGN DECISION: Show customers ROI before they buy
 * WHY: Transparent pricing = higher conversion
 *
 * FORMULA:
 * - Time saved per week (from usage data)
 * - Developer hourly rate ($75 blended average)
 * - Annual savings = time saved × rate
 * - Subscription cost = tier × 12 months
 * - ROI = (savings - cost) / cost
 *
 * PATTERN: Pattern-PRICING-001 (ROI-Based Pricing Calculator)
 */
function calculateROI(usage, tier, hourlyRate = 75) {
  const timeSavedPerWeek = usage.hoursPerWeek;  // From analytics
  const annualTimeSaved = timeSavedPerWeek * 52;
  const annualSavings = annualTimeSaved * hourlyRate;

  const pricing = {
    free: 0,
    network: 4.99,
    pro: 14.99,
    enterprise: 49
  };

  const subscriptionCost = pricing[tier] * 12;
  const netBenefit = annualSavings - subscriptionCost;
  const roiMultiplier = netBenefit / subscriptionCost;

  return {
    timeSavedPerWeek,
    annualTimeSaved,
    annualSavings,
    subscriptionCost,
    netBenefit,
    roiMultiplier: roiMultiplier.toFixed(1),
    paybackPeriod: `${Math.ceil(subscriptionCost / (annualSavings / 52))} weeks`
  };
}

// Example: Pro tier user saves 2.5 hours/week
const roi = calculateROI({ hoursPerWeek: 2.5 }, 'pro', 75);
console.log(roi);
// {
//   timeSavedPerWeek: 2.5,
//   annualTimeSaved: 130,
//   annualSavings: $9,750,
//   subscriptionCost: $179.88,
//   netBenefit: $9,570.12,
//   roiMultiplier: '53.2x',
//   paybackPeriod: '1 week'
// }
```

---

## Troubleshooting

### **Issue: Confidence scores too low**

**Solution:** Customize confidence dimensions for your domain.

```typescript
// Default dimensions (generic)
customDimensions: [
  { name: 'semantic_similarity', weight: 0.30 },
  { name: 'context_match', weight: 0.15 },
  // ...
]

// Add domain-specific dimensions
customDimensions: [
  { name: 'semantic_similarity', weight: 0.30 },
  { name: 'YOUR_CRITICAL_FACTOR', weight: 0.25 },  // ← Add this
  { name: 'context_match', weight: 0.10 },
  // ...
]
```

---

### **Issue: Voice transcription inaccurate**

**Solution:** Use larger Whisper model.

```typescript
VoiceCapture.transcribe(audio, {
  model: 'small'  // or 'medium' for better accuracy (slower, larger)
})
```

---

### **Issue: Pattern library growing too large**

**Solution:** Archive old patterns, focus on high-success patterns.

```bash
# Archive patterns with <70% confidence or <5 uses
npm run aetherlight archive-patterns --threshold 0.70 --min-uses 5
```

---

**CREATED:** 2025-10-04
**LAST UPDATED:** 2025-10-05
**VERSION:** 1.1 (Storage Allocation + Pricing Added)
**STATUS:** Active

**PATTERN:** Pattern-INTEGRATION-001 (Domain-Specific Integration Templates)
**RELATED:** PHASE_1_IMPLEMENTATION.md, PHASE_2_IMPLEMENTATION.md, PHASE_3_IMPLEMENTATION.md
**FUTURE:** CLI tool to generate integration scaffolding per domain

---

## Summary: Integration Timeline

**Phase 1 (Weeks 1-2):** Core available
- **Integration time:** ~30 minutes (text-based pattern matching)
- **Your apps:** Legal research (text), Data analytics (text)

**Phase 2 (Weeks 3-4):** Voice available
- **Integration time:** +15 minutes (add voice to existing integration)
- **Your apps:** Legal research (voice + text), Data analytics (voice + text)

**Phase 3 (Weeks 5-6):** Intelligence available
- **Integration time:** +30 minutes (add semantic search + analytics)
- **Your apps:** Full conversational AI with ROI dashboard

**Total integration time:** ~1.25 hours from Phase 1 release to full voice-to-intelligence platform.
