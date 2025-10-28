# ÆtherLight Domain Templates
## Copy-Paste Integration for Common Industries

**VERSION:** 1.0
**DATE:** 2025-10-07
**STATUS:** Industry-Specific Templates
**CLASSIFICATION:** 🌐 PUBLIC (Developer Documentation)
**PATTERN:** Pattern-SDK-003 (Domain Templates)

---

## Overview

Pre-built templates for 5 common domains. Each template includes:

✅ Complete pattern library structure
✅ Domain-specific configuration
✅ Integration code (copy-paste ready)
✅ Example queries + expected results
✅ Confidence dimension definitions

**Estimated time:** 10-15 minutes per domain

---

## Template 1: Legal Research Platform

### Use Case
Law firms, legal tech startups, case law databases

### Configuration

```javascript
// aetherlight.config.js
module.exports = {
  domain: 'legal',
  confidence: {
    threshold: 0.85,
    dimensions: [
      'semantic',         // Text similarity
      'jurisdiction',     // State/country match
      'recency',         // How recent (2020+ = high score)
      'citations',       // Citation count (popular = better)
      'practice_area'    // Employment, contract, IP, etc.
    ]
  },
  patternLibrary: './patterns/legal-precedents.json'
};
```

### Pattern Library Structure

```json
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
        "practiceArea": "employment-law",
        "keyStatute": "Cal. Bus. & Prof. Code §16600",
        "landmarkCases": ["Edwards v. Arthur Andersen (2008)"],
        "citations": 847,
        "year": 2021
      }
    }
  ]
}
```

### Integration Code

```typescript
import { AetherlightCore } from '@aetherlight/sdk';

const core = new AetherlightCore();

export async function searchLegalPrecedents(
  query: string,
  jurisdiction: string,
  practiceArea?: string
) {
  const match = await core.matchPattern({
    query,
    context: { jurisdiction, practiceArea }
  });

  return {
    cases: match.patterns.map(p => ({
      name: p.name,
      citation: p.metadata.keyCases?.[0],
      confidence: (p.confidence * 100).toFixed(0) + '%',
      keyHoldings: p.chainOfThought.reasoningChain,
      alternatives: p.chainOfThought.alternatives
    }))
  };
}

// Example query
const results = await searchLegalPrecedents(
  'Are non-compete agreements enforceable?',
  'California',
  'employment-law'
);
```

**Expected Output:**
```json
{
  "cases": [
    {
      "name": "Non-Compete Unenforceability (California)",
      "citation": "Edwards v. Arthur Andersen (2008)",
      "confidence": "97%",
      "keyHoldings": [
        "California Business & Professions Code §16600 voids non-compete agreements",
        "Narrow exceptions exist for sale of business or partnership dissolution"
      ],
      "alternatives": [
        "Trade secret protection via CUTSA"
      ]
    }
  ]
}
```

---

## Template 2: Data Analytics Platform (NL → SQL)

### Use Case
Business intelligence tools, data dashboards, analytics platforms

### Configuration

```javascript
// aetherlight.config.js
module.exports = {
  domain: 'analytics',
  confidence: {
    threshold: 0.80,  // Lower threshold (analytics has more variability)
    dimensions: [
      'semantic',          // Query similarity
      'schema_match',      // Table/column names match
      'aggregation_type',  // SUM vs COUNT vs AVG
      'time_dimension',    // Date ranges match
      'join_complexity'    // Number of tables
    ]
  },
  patternLibrary: './patterns/sql-queries.json'
};
```

### Pattern Library Structure

```json
{
  "patterns": [
    {
      "id": "analytics-001",
      "domain": "data-analytics",
      "name": "Revenue by Customer Segment (Monthly)",
      "chainOfThought": {
        "designDecision": "Aggregate revenue by customer segment with monthly breakdown",
        "why": "Business needs recurring revenue visibility by customer type",
        "reasoningChain": [
          "1. Join customers + transactions tables",
          "2. Group by customer.segment + MONTH(transaction.date)",
          "3. Sum transaction.amount for revenue",
          "4. Filter date range (last 12 months)",
          "5. Order by month DESC, revenue DESC"
        ],
        "alternatives": [
          "Use materialized view for faster queries (if data changes infrequently)",
          "Pre-aggregate in ETL pipeline (for real-time dashboards)"
        ]
      },
      "metadata": {
        "queryType": "aggregation",
        "tables": ["customers", "transactions"],
        "aggregations": ["SUM"],
        "timeGrain": "month",
        "complexity": "medium"
      },
      "sqlTemplate": `
        SELECT
          c.segment,
          DATE_TRUNC('month', t.transaction_date) AS month,
          SUM(t.amount) AS revenue
        FROM customers c
        JOIN transactions t ON c.customer_id = t.customer_id
        WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY c.segment, DATE_TRUNC('month', t.transaction_date)
        ORDER BY month DESC, revenue DESC
      `
    }
  ]
}
```

### Integration Code

```typescript
import { AetherlightCore } from '@aetherlight/sdk';

const core = new AetherlightCore();

export async function naturalLanguageToSQL(
  userQuery: string,
  schemaContext: { tables: string[], columns: Record<string, string[]> }
) {
  const match = await core.matchPattern({
    query: userQuery,
    context: { schema: schemaContext }
  });

  if (match.patterns.length === 0) {
    return { error: 'No matching SQL patterns found' };
  }

  const topMatch = match.patterns[0];

  return {
    sql: topMatch.sqlTemplate,
    confidence: (topMatch.confidence * 100).toFixed(0) + '%',
    reasoning: topMatch.chainOfThought.reasoningChain,
    alternatives: topMatch.chainOfThought.alternatives
  };
}

// Example query
const result = await naturalLanguageToSQL(
  'Show me revenue by customer segment for the last year',
  {
    tables: ['customers', 'transactions'],
    columns: {
      customers: ['customer_id', 'segment', 'name'],
      transactions: ['transaction_id', 'customer_id', 'amount', 'transaction_date']
    }
  }
);
```

**Expected Output:**
```json
{
  "sql": "SELECT c.segment, DATE_TRUNC('month', t.transaction_date) AS month, SUM(t.amount) AS revenue...",
  "confidence": "89%",
  "reasoning": [
    "Join customers + transactions tables",
    "Group by customer.segment + MONTH(transaction.date)",
    "Sum transaction.amount for revenue"
  ],
  "alternatives": [
    "Use materialized view for faster queries"
  ]
}
```

---

## Template 3: Medical Records System

### Use Case
EHR systems, telemedicine platforms, medical research databases

### Configuration

```javascript
// aetherlight.config.js
module.exports = {
  domain: 'medical',
  confidence: {
    threshold: 0.92,  // Higher threshold (medical accuracy critical)
    dimensions: [
      'semantic',           // Symptom/diagnosis similarity
      'icd_10_match',      // ICD-10 code match
      'age_gender_match',  // Patient demographics
      'medication_match',  // Drug interactions
      'guideline_match'    // Clinical guidelines (AHA, AMA)
    ]
  },
  patternLibrary: './patterns/medical-diagnoses.json',
  privacy: {
    hipaaCompliant: true,  // Enable HIPAA-compliant logging
    phi_encryption: true   // Encrypt PHI (patient identifiable info)
  }
};
```

### Pattern Library Structure

```json
{
  "patterns": [
    {
      "id": "medical-001",
      "domain": "medical-records",
      "name": "Type 2 Diabetes Mellitus Diagnosis",
      "chainOfThought": {
        "designDecision": "Diagnose Type 2 Diabetes based on HbA1c + fasting glucose",
        "why": "ADA guidelines: HbA1c ≥6.5% OR fasting glucose ≥126 mg/dL on two separate occasions",
        "reasoningChain": [
          "1. Check HbA1c level (normal: <5.7%, prediabetes: 5.7-6.4%, diabetes: ≥6.5%)",
          "2. Check fasting glucose (normal: <100 mg/dL, prediabetes: 100-125, diabetes: ≥126)",
          "3. Confirm with second test (reduce false positives)",
          "4. Rule out Type 1 (check C-peptide, autoantibodies)",
          "5. Assess complications (retinopathy, neuropathy, nephropathy)"
        ],
        "alternatives": [
          "Oral glucose tolerance test (OGTT) if HbA1c/fasting glucose inconclusive",
          "Random glucose ≥200 mg/dL with classic symptoms"
        ]
      },
      "metadata": {
        "icd10Code": "E11.9",
        "clinicalGuideline": "ADA Standards of Medical Care 2023",
        "prevalence": "10.5% of US adults",
        "riskFactors": ["obesity", "family-history", "age >45", "sedentary-lifestyle"],
        "medications": ["metformin", "insulin", "glp-1-agonists"]
      }
    }
  ]
}
```

### Integration Code

```typescript
import { AetherlightCore } from '@aetherlight/sdk';

const core = new AetherlightCore();

export async function suggestDiagnosis(
  symptoms: string[],
  labResults: { hbA1c?: number, fastingGlucose?: number },
  patientContext: { age: number, gender: string, bmi?: number }
) {
  const query = symptoms.join(', ');

  const match = await core.matchPattern({
    query,
    context: { labResults, ...patientContext }
  });

  return {
    diagnoses: match.patterns.map(p => ({
      name: p.name,
      icd10: p.metadata.icd10Code,
      confidence: (p.confidence * 100).toFixed(0) + '%',
      reasoning: p.chainOfThought.reasoningChain,
      guidelines: p.metadata.clinicalGuideline,
      recommendedTests: p.chainOfThought.alternatives
    }))
  };
}

// Example query
const diagnosis = await suggestDiagnosis(
  ['increased thirst', 'frequent urination', 'fatigue'],
  { hbA1c: 7.2, fastingGlucose: 135 },
  { age: 52, gender: 'male', bmi: 31 }
);
```

**Expected Output:**
```json
{
  "diagnoses": [
    {
      "name": "Type 2 Diabetes Mellitus Diagnosis",
      "icd10": "E11.9",
      "confidence": "94%",
      "reasoning": [
        "HbA1c 7.2% exceeds diabetes threshold (≥6.5%)",
        "Fasting glucose 135 mg/dL exceeds diabetes threshold (≥126)",
        "Symptoms match: polydipsia, polyuria, fatigue"
      ],
      "guidelines": "ADA Standards of Medical Care 2023",
      "recommendedTests": [
        "Oral glucose tolerance test (OGTT) if confirmation needed"
      ]
    }
  ]
}
```

---

## Template 4: Customer Support Platform

### Use Case
Help desk software, chatbots, ticket routing systems

### Configuration

```javascript
// aetherlight.config.js
module.exports = {
  domain: 'customer-support',
  confidence: {
    threshold: 0.75,  // Lower threshold (support needs recall over precision)
    dimensions: [
      'semantic',          // Ticket text similarity
      'sentiment',         // Angry vs neutral vs happy
      'urgency',          // Critical vs low priority
      'product_area',     // Which product/feature
      'resolution_time'   // Historical time-to-resolve
    ]
  },
  patternLibrary: './patterns/support-tickets.json'
};
```

### Pattern Library Structure

```json
{
  "patterns": [
    {
      "id": "support-001",
      "domain": "customer-support",
      "name": "Password Reset Request",
      "chainOfThought": {
        "designDecision": "Automate password resets with security verification",
        "why": "70% of support tickets are password resets - automate to reduce load",
        "reasoningChain": [
          "1. Verify user identity (email + security questions OR 2FA)",
          "2. Generate secure reset token (expires in 15 minutes)",
          "3. Send reset link via email (with IP/device info for security)",
          "4. Log reset attempt (audit trail)",
          "5. Force password change on next login"
        ],
        "alternatives": [
          "Admin manual reset (if user can't access email)",
          "Phone verification (for high-security accounts)"
        ]
      },
      "metadata": {
        "category": "authentication",
        "priority": "medium",
        "avgResolutionTime": "5 minutes",
        "automation": "full",  // Can be 100% automated
        "sentiment": "neutral"
      }
    }
  ]
}
```

### Integration Code

```typescript
import { AetherlightCore } from '@aetherlight/sdk';

const core = new AetherlightCore();

export async function routeTicket(
  ticketText: string,
  customerInfo: { tier: string, sentiment?: string }
) {
  const match = await core.matchPattern({
    query: ticketText,
    context: customerInfo
  });

  if (match.patterns.length === 0) {
    return { route: 'human-agent', priority: 'high' };
  }

  const topMatch = match.patterns[0];

  return {
    category: topMatch.metadata.category,
    priority: topMatch.metadata.priority,
    automation: topMatch.metadata.automation,  // 'full', 'partial', 'none'
    suggestedResponse: topMatch.chainOfThought.reasoningChain,
    avgResolutionTime: topMatch.metadata.avgResolutionTime,
    route: topMatch.metadata.automation === 'full' ? 'bot' : 'human-agent'
  };
}

// Example query
const ticket = await routeTicket(
  'I forgot my password and can\'t log in',
  { tier: 'free', sentiment: 'frustrated' }
);
```

**Expected Output:**
```json
{
  "category": "authentication",
  "priority": "medium",
  "automation": "full",
  "suggestedResponse": [
    "Verify user identity (email + security questions)",
    "Generate secure reset token (expires in 15 minutes)",
    "Send reset link via email"
  ],
  "avgResolutionTime": "5 minutes",
  "route": "bot"
}
```

---

## Template 5: Engineering Tools (Code Search)

### Use Case
GitHub, GitLab, code documentation platforms

### Configuration

```javascript
// aetherlight.config.js
module.exports = {
  domain: 'engineering',
  confidence: {
    threshold: 0.80,
    dimensions: [
      'semantic',         // Code/comment similarity
      'language_match',   // Python vs JavaScript vs Rust
      'api_match',       // Function/class names
      'framework_match', // React vs Vue vs Angular
      'file_path'        // src/components vs tests/
    ]
  },
  patternLibrary: './patterns/code-snippets.json'
};
```

### Pattern Library Structure

```json
{
  "patterns": [
    {
      "id": "eng-001",
      "domain": "engineering",
      "name": "React State Management with useReducer",
      "chainOfThought": {
        "designDecision": "Use useReducer for complex state logic with multiple sub-values",
        "why": "useState becomes unwieldy when state has multiple sub-values or next state depends on previous state",
        "reasoningChain": [
          "1. Define state shape (TypeScript interface)",
          "2. Create reducer function (pure, no side effects)",
          "3. Define action types (enum or union type)",
          "4. Use useReducer hook (state, dispatch)",
          "5. Dispatch actions (dispatch({ type: 'INCREMENT' }))"
        ],
        "alternatives": [
          "useState for simple state",
          "Redux for global state across components",
          "Zustand for simpler alternative to Redux"
        ]
      },
      "metadata": {
        "language": "TypeScript",
        "framework": "React",
        "pattern": "state-management",
        "complexity": "medium",
        "version": "React 18+"
      },
      "codeSnippet": `
interface State {
  count: number;
  step: number;
}

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep', payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'setStep':
      return { ...state, step: action.payload };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  );
}
      `
    }
  ]
}
```

### Integration Code

```typescript
import { AetherlightCore } from '@aetherlight/sdk';

const core = new AetherlightCore();

export async function searchCode(
  query: string,
  languageFilter?: string,
  frameworkFilter?: string
) {
  const match = await core.matchPattern({
    query,
    context: {
      language: languageFilter,
      framework: frameworkFilter
    }
  });

  return {
    snippets: match.patterns.map(p => ({
      name: p.name,
      language: p.metadata.language,
      framework: p.metadata.framework,
      confidence: (p.confidence * 100).toFixed(0) + '%',
      reasoning: p.chainOfThought.reasoningChain,
      code: p.codeSnippet,
      alternatives: p.chainOfThought.alternatives
    }))
  };
}

// Example query
const results = await searchCode(
  'How to manage complex state in React?',
  'TypeScript',
  'React'
);
```

**Expected Output:**
```json
{
  "snippets": [
    {
      "name": "React State Management with useReducer",
      "language": "TypeScript",
      "framework": "React",
      "confidence": "91%",
      "reasoning": [
        "Define state shape (TypeScript interface)",
        "Create reducer function (pure, no side effects)",
        "Use useReducer hook (state, dispatch)"
      ],
      "code": "interface State { count: number; step: number; }...",
      "alternatives": [
        "useState for simple state",
        "Redux for global state"
      ]
    }
  ]
}
```

---

## Quick Start Checklist

For ANY domain:

1. ✅ Choose template closest to your use case
2. ✅ Copy `aetherlight.config.js` (customize domain + dimensions)
3. ✅ Copy pattern library structure (add your patterns)
4. ✅ Copy integration code (adapt to your API)
5. ✅ Test with example query
6. ✅ Deploy!

**Total time:** 10-15 minutes per domain

---

## Custom Domain Template

Don't see your domain? Create a custom template:

```javascript
// aetherlight.config.js (custom domain)
module.exports = {
  domain: 'your-domain',  // e.g., 'real-estate', 'finance', 'education'
  confidence: {
    threshold: 0.85,
    dimensions: [
      'semantic',           // Always include
      'custom_dimension_1', // Your domain-specific dimension
      'custom_dimension_2',
      'custom_dimension_3'
    ]
  },
  patternLibrary: './patterns/custom-patterns.json'
};
```

Then define your patterns following the Chain of Thought structure shown in the templates above.

---

## Next Steps

✅ **Template chosen?** Follow the integration steps in [SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md)
✅ **Need network features?** See [NETWORK_CONTRIBUTION.md](NETWORK_CONTRIBUTION.md) for pattern sharing
✅ **Want pricing info?** Check [SDK_PRICING.md](SDK_PRICING.md) for licensing options

---

**STATUS:** Domain templates complete, ready for copy-paste integration
**PATTERN:** Pattern-SDK-003 (Domain Templates)
**RELATED:** SDK_INTEGRATION_GUIDE.md (Step-by-step), INTEGRATION_GUIDE.md (More examples)
