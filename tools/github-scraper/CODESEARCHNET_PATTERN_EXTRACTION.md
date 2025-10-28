# CodeSearchNet Pattern Extraction Strategy

**CREATED:** 2025-10-16
**VERSION:** 1.0.0
**PURPOSE:** Enhanced repository search patterns based on Ad Hub analysis
**PATTERN:** Pattern-SCRAPER-002 (Domain-Specific Pattern Library Curation)

---

## Executive Summary

**DESIGN DECISION:** Expand CodeSearchNet search patterns to include Marketing Analytics and Legal/Case Management domains with NLP, taxonomy, and data pipeline focus

**WHY:** Ad Hub analysis revealed 12 high-quality patterns (hierarchical taxonomy, NLP keyword extraction, AI-generated descriptions, semantic search, CSV pipelines) that are highly applicable to ÆtherLight's Marketing and Legal domains

**REASONING CHAIN:**
1. Ad Hub demonstrates production-tested patterns for audience segmentation (10,000+ segments, 191MB datasets)
2. These patterns map directly to ÆtherLight use cases:
   - Marketing: Customer segmentation, analytics, identity graphing
   - Legal: Case taxonomy, document classification, semantic search
3. CodeSearchNet search must target repositories with similar technical stacks and problem domains
4. Enhanced search patterns increase pattern extraction quality from <70% to >85%
5. Result: Pre-trained neural network with validated, domain-specific patterns

---

## Updated Domain Queries

### Marketing Domain (Enhanced)

**Original Query (PRE_LAUNCH_TRAINING.md):**
```
topic:marketing OR topic:CRM OR topic:analytics OR topic:identity-graph stars:>100
```

**Enhanced Query (Based on Ad Hub Analysis):**
```python
MARKETING_DOMAIN_QUERIES = {
    # Core marketing analytics
    'analytics': {
        'query': '(topic:marketing OR topic:analytics OR topic:data-analytics) AND (audience OR segmentation OR customer) stars:>100 pushed:>2024-01-01',
        'languages': ['Python', 'JavaScript', 'TypeScript'],
        'target_repos': 100,
        'keywords': ['audience', 'segmentation', 'analytics', 'customer', 'intent', 'behavior', 'taxonomy']
    },

    # Audience segmentation & taxonomy
    'segmentation': {
        'query': '(topic:segmentation OR topic:audience OR topic:customer-segmentation) stars:>100 pushed:>2024-01-01',
        'languages': ['Python', 'JavaScript', 'TypeScript'],
        'target_repos': 80,
        'keywords': ['segment', 'cohort', 'persona', 'profile', 'targeting', 'classification', 'hierarchical']
    },

    # NLP & keyword extraction
    'nlp_keywords': {
        'query': '(topic:NLP OR topic:keyword-extraction OR topic:text-analysis) AND (spacy OR nltk OR keywords) stars:>100 pushed:>2024-01-01',
        'languages': ['Python'],
        'target_repos': 60,
        'keywords': ['keyword', 'extraction', 'NLP', 'spacy', 'nltk', 'stopwords', 'tokenization', 'NER']
    },

    # Identity graphing & data linking
    'identity_graph': {
        'query': '(topic:identity-resolution OR topic:entity-resolution OR topic:data-linking) stars:>50 pushed:>2024-01-01',
        'languages': ['Python', 'JavaScript'],
        'target_repos': 40,
        'keywords': ['identity', 'resolution', 'matching', 'deduplication', 'entity', 'linkage', 'merge']
    },

    # CRM & customer data platforms
    'crm': {
        'query': '(topic:CRM OR topic:CDP OR topic:customer-data) stars:>100 pushed:>2024-01-01',
        'languages': ['JavaScript', 'TypeScript', 'Python'],
        'target_repos': 60,
        'keywords': ['customer', 'contact', 'lead', 'pipeline', 'lifecycle', 'engagement', 'attribution']
    },

    # Data pipelines & ETL
    'data_pipeline': {
        'query': '(topic:ETL OR topic:data-pipeline OR topic:data-processing) AND (csv OR pandas OR batch) stars:>100 pushed:>2024-01-01',
        'languages': ['Python'],
        'target_repos': 60,
        'keywords': ['pipeline', 'ETL', 'transform', 'batch', 'chunked', 'streaming', 'csv', 'pandas']
    },

    # Embeddings & semantic search
    'semantic_search': {
        'query': '(topic:embeddings OR topic:semantic-search OR topic:vector-search) AND (sentence-transformers OR openai OR chromadb) stars:>100 pushed:>2024-01-01',
        'languages': ['Python'],
        'target_repos': 80,
        'keywords': ['embedding', 'vector', 'semantic', 'similarity', 'cosine', 'chromadb', 'faiss', 'pinecone']
    },

    # AI-generated content & prompt engineering
    'ai_content': {
        'query': '(topic:GPT OR topic:prompt-engineering OR topic:text-generation) AND (openai OR anthropic) stars:>100 pushed:>2024-01-01',
        'languages': ['Python', 'TypeScript'],
        'target_repos': 60,
        'keywords': ['prompt', 'GPT', 'generation', 'completion', 'template', 'chain-of-thought', 'reasoning']
    }
}

# Total target: 540 repos (prioritize quality over quantity)
```

**Key Enhancements:**
1. **Taxonomy & Segmentation** - Target hierarchical classification systems (Parent → Category → Topic)
2. **NLP Focus** - Prioritize spaCy, NLTK, keyword extraction libraries
3. **Data Pipeline Patterns** - CSV-based processing, chunked loading, batch operations
4. **Semantic Search** - Embedding generation, vector databases, similarity search
5. **AI Content Generation** - Prompt engineering for description generation

---

### Legal Domain (Enhanced)

**Original Query (PRE_LAUNCH_TRAINING.md):**
```
topic:legal OR topic:case-management OR topic:document-management stars:>50
```

**Enhanced Query (Based on Ad Hub Analysis):**
```python
LEGAL_DOMAIN_QUERIES = {
    # Case management & taxonomy
    'case_management': {
        'query': '(topic:legal OR topic:case-management OR topic:litigation) AND (case OR matter OR docket) stars:>50 pushed:>2024-01-01',
        'languages': ['JavaScript', 'TypeScript', 'Python', 'Java'],
        'target_repos': 80,
        'keywords': ['case', 'matter', 'client', 'docket', 'timeline', 'deadline', 'status', 'workflow']
    },

    # Document management & classification
    'document_management': {
        'query': '(topic:document-management OR topic:legal-tech OR topic:ediscovery) stars:>50 pushed:>2024-01-01',
        'languages': ['Python', 'JavaScript', 'TypeScript'],
        'target_repos': 60,
        'keywords': ['document', 'filing', 'discovery', 'exhibit', 'metadata', 'classification', 'tagging']
    },

    # NLP for legal text (contracts, statutes, cases)
    'legal_nlp': {
        'query': '(topic:legal-NLP OR topic:contract-analysis OR topic:legal-text) AND (spacy OR nltk OR NER) stars:>50 pushed:>2024-01-01',
        'languages': ['Python'],
        'target_repos': 60,
        'keywords': ['contract', 'statute', 'clause', 'entity', 'extraction', 'NER', 'legal-text', 'parsing']
    },

    # Semantic search & precedent matching
    'legal_search': {
        'query': '(topic:legal-search OR topic:case-law OR topic:precedent) stars:>30 pushed:>2024-01-01',
        'languages': ['Python', 'JavaScript'],
        'target_repos': 40,
        'keywords': ['precedent', 'case-law', 'citation', 'similarity', 'search', 'retrieval', 'semantic']
    },

    # Timeline extraction & event detection
    'timeline': {
        'query': '(topic:timeline OR topic:event-extraction) AND (legal OR case OR chronology) stars:>30 pushed:>2024-01-01',
        'languages': ['Python', 'JavaScript'],
        'target_repos': 40,
        'keywords': ['timeline', 'event', 'chronology', 'sequence', 'temporal', 'date', 'order']
    },

    # Workflow & automation
    'legal_workflow': {
        'query': '(topic:legal-workflow OR topic:legal-automation) stars:>30 pushed:>2024-01-01',
        'languages': ['JavaScript', 'TypeScript', 'Python'],
        'target_repos': 60,
        'keywords': ['workflow', 'automation', 'intake', 'routing', 'assignment', 'deadline', 'reminder']
    },

    # Data extraction from legal documents (OCR, PDF)
    'data_extraction': {
        'query': '(topic:PDF-extraction OR topic:OCR OR topic:document-parsing) AND legal stars:>50 pushed:>2024-01-01',
        'languages': ['Python'],
        'target_repos': 60,
        'keywords': ['PDF', 'OCR', 'extraction', 'parsing', 'text', 'table', 'form', 'structured']
    },

    # Legal taxonomy & ontology
    'legal_taxonomy': {
        'query': '(topic:legal-taxonomy OR topic:legal-ontology OR topic:classification) stars:>30 pushed:>2024-01-01',
        'languages': ['Python', 'JavaScript'],
        'target_repos': 40,
        'keywords': ['taxonomy', 'ontology', 'classification', 'category', 'hierarchy', 'legal-domain']
    }
}

# Total target: 440 repos (legal domain has fewer public repos, lower star thresholds)
```

**Key Enhancements:**
1. **Legal Taxonomy** - Case Type → Legal Domain → Specific Area (e.g., Tort → Personal Injury → Auto Accident)
2. **NLP for Legal Text** - Contract analysis, statute parsing, entity recognition (parties, dates, amounts)
3. **Timeline Extraction** - Chronological event sequencing from case files
4. **Document Classification** - Hierarchical tagging (Motion, Brief, Order, etc.)
5. **Semantic Search** - Find similar cases without exact keyword matching

---

## Quality Filters (Enhanced)

**From Ad Hub Analysis:**

```python
ENHANCED_QUALITY_FILTERS = {
    # Original filters (PRE_LAUNCH_TRAINING.md)
    'min_stars': 100,  # Marketing: 100, Legal: 50
    'min_forks': 20,   # Marketing: 20, Legal: 10
    'has_readme': True,
    'recent_activity': '6 months',
    'has_tests': True,

    # NEW: Ad Hub-inspired filters
    'min_docstring_density': 0.4,  # ≥40% of functions have docstrings (from Ad Hub)
    'max_size_kb': 100000,  # Avoid monorepos (<100MB)
    'min_size_kb': 100,     # Avoid toy projects (>100KB)
    'allowed_languages': ['Python', 'JavaScript', 'TypeScript', 'Java'],
    'max_days_since_commit': 180,  # Active maintenance (6 months)

    # NEW: CodeSearchNet-specific filters
    'has_docstrings_with_reasoning': True,  # Check for "why", "because", "reason" in docstrings
    'has_chain_of_thought': False,  # Lower priority (rare in public repos)
    'has_type_hints': True,  # Python type hints, TypeScript types
    'has_examples_in_docs': True,  # README with usage examples
    'has_architecture_docs': False,  # Nice to have but not required

    # NEW: Domain-specific filters
    'marketing_keywords': [
        'audience', 'segment', 'customer', 'analytics', 'identity',
        'targeting', 'campaign', 'cohort', 'persona', 'attribution'
    ],
    'legal_keywords': [
        'case', 'legal', 'court', 'statute', 'contract', 'litigation',
        'discovery', 'precedent', 'timeline', 'docket'
    ],
    'min_keyword_matches': 2,  # Must match ≥2 domain keywords in README/description
}
```

---

## Pattern Extraction Focus (Based on Ad Hub)

### High-Priority Patterns to Extract

**From Ad Hub Analysis (12 Patterns, Quality Score ≥0.85):**

1. **Pattern-TAXONOMY-001: Hierarchical Data Classification** (Score: 0.95)
   - Marketing: Audience taxonomy (Parent → Category → Sub Category → Topic)
   - Legal: Case taxonomy (Case Type → Legal Domain → Specific Area → Case Name)
   - **Search for:** Multi-level classification systems, hierarchical indexing, faceted navigation

2. **Pattern-KEYWORD-001: NLP Keyword Extraction Pipeline** (Score: 0.90)
   - Marketing: Extract keywords from descriptions for semantic tagging
   - Legal: Extract legal entities (parties, statutes, dates) from case text
   - **Search for:** spaCy NER, NLTK stopword removal, POS tagging, linguistic filtering

3. **Pattern-AI-CONTENT-001: AI-Generated Descriptions** (Score: 0.93)
   - Marketing: Generate audience persona descriptions with GPT
   - Legal: Generate case summaries, client profiles
   - **Search for:** Prompt engineering, GPT integration, template-based generation

4. **Pattern-SEMANTIC-001: Embedding Generation for Search** (Score: 0.89)
   - Marketing: Semantic audience similarity search
   - Legal: Find similar cases without exact keywords
   - **Search for:** sentence-transformers, OpenAI embeddings, vector databases (ChromaDB, Faiss)

5. **Pattern-PIPELINE-001: CSV-Based Large-Scale Processing** (Score: 0.92)
   - Marketing: Process 191MB+ audience datasets with chunking
   - Legal: Handle large case exports, document metadata
   - **Search for:** Pandas chunked reading, streaming writes, batch operations

6. **Pattern-NER-001: Named Entity Recognition** (Score: 0.88)
   - Marketing: Extract companies, locations, products from descriptions
   - Legal: Extract parties, dates, amounts, courts from case text
   - **Search for:** spaCy NER pipelines, custom entity types, entity linking

7. **Pattern-VERSIONING-001: Data Pipeline Versioning** (Score: 0.91)
   - Marketing: Track data transformations (Base → Enhanced → Filtered → Embeddings)
   - Legal: Version case data, document metadata
   - **Search for:** Immutable pipeline stages, backup strategies, rollback mechanisms

8. **Pattern-OCCURRENCE-001: Keyword Frequency Weighting** (Score: 0.86)
   - Marketing: Rank keywords by occurrence for importance
   - Legal: Identify most-cited statutes, common case themes
   - **Search for:** TF-IDF alternatives, simple frequency counting, occurrence-based ranking

9. **Pattern-MULTI-DOMAIN-001: Cross-Domain Taxonomy** (Score: 0.94)
   - Marketing: Support 10+ industry verticals with consistent schema
   - Legal: Support multiple practice areas (Civil, Criminal, Corporate)
   - **Search for:** Extensible schema design, enum-based classification, composite IDs

10. **Pattern-STOPWORD-001: Linguistic Stopword Filtering** (Score: 0.87)
    - Marketing: Remove common words, keep domain-specific terms
    - Legal: Remove legal boilerplate, keep substantive terms
    - **Search for:** NLTK stopwords, custom stopword lists, hybrid filtering

11. **Pattern-SCRAPING-001: Ethical Web Scraping** (Score: 0.87)
    - Marketing: Scrape API documentation, competitor sites
    - Legal: Scrape court records, statute databases
    - **Search for:** Scrapy framework, robots.txt compliance, rate limiting

12. **Pattern-TEAM-ROLES-001: CSV-Based Role Management** (Score: 0.85)
    - Marketing: Manage team access to audience data
    - Legal: Manage case access, attorney assignments
    - **Search for:** Simple RBAC, CSV configuration, version-controlled permissions

---

## CodeSearchNet Search Strategy

### Phase 1: Broad Search (Week 17, Days 1-2)

**Goal:** Cast wide net to identify candidate repositories

```python
# Execute all enhanced queries (8 marketing + 8 legal = 16 queries)
# Target: 980 repos total (540 marketing + 440 legal)

for domain, queries in [MARKETING_DOMAIN_QUERIES, LEGAL_DOMAIN_QUERIES]:
    for query_name, config in queries.items():
        repos = search_github_api(
            query=config['query'],
            languages=config['languages'],
            min_stars=ENHANCED_QUALITY_FILTERS['min_stars'],
            max_results=config['target_repos'] * 2  # Oversample for filtering
        )

        # Apply enhanced quality filters
        accepted_repos = apply_quality_filters(repos, config['keywords'])

        # Save metadata
        save_repo_metadata(accepted_repos, domain, query_name)
```

### Phase 2: Pattern-Focused Filtering (Week 17, Days 2-3)

**Goal:** Narrow to repositories with high pattern extraction potential

```python
def score_repo_for_pattern_extraction(repo, domain):
    """
    Score repository for likelihood of yielding high-quality patterns

    REASONING CHAIN:
    1. Check README for domain keywords (audience, case, segment, etc.)
    2. Check for docstring density in sample files (≥40%)
    3. Check for reasoning keywords ("why", "because", "design decision")
    4. Check for architecture docs (bonus points)
    5. Calculate weighted score (0-100)
    """
    score = 0

    # Domain keyword matching (0-30 points)
    keywords = ENHANCED_QUALITY_FILTERS[f'{domain}_keywords']
    readme_text = fetch_readme(repo)
    keyword_matches = sum(1 for kw in keywords if kw in readme_text.lower())
    score += min(keyword_matches * 5, 30)  # Cap at 30

    # Docstring density (0-30 points)
    docstring_density = estimate_docstring_density(repo)
    score += docstring_density * 30  # 0.0-1.0 → 0-30 points

    # Reasoning in docstrings (0-20 points)
    has_reasoning = check_for_reasoning_keywords(repo)
    score += 20 if has_reasoning else 0

    # Architecture docs (0-10 points)
    has_arch_docs = check_for_architecture_docs(repo)
    score += 10 if has_arch_docs else 0

    # Recent activity (0-10 points)
    days_since_commit = get_days_since_last_commit(repo)
    score += max(10 - (days_since_commit / 18), 0)  # Linear decay over 180 days

    return score

# Filter repos by pattern extraction score
high_potential_repos = [
    repo for repo in candidate_repos
    if score_repo_for_pattern_extraction(repo, domain) >= 70
]
```

### Phase 3: Clone & Validate (Week 17, Days 3-4)

**Goal:** Clone high-scoring repos, validate file structure

```python
def clone_and_validate(repo, domain):
    """
    Clone repository and validate for pattern extraction

    VALIDATION CHECKS:
    1. Clone succeeds (network, auth, size limits)
    2. Contains target file types (*.py, *.js, *.ts)
    3. Has actual docstrings (not just signatures)
    4. No malicious code (basic security scan)
    5. File structure parseable by AST
    """
    clone_path = f"data/repos/{domain}/{repo.name}"

    try:
        # Shallow clone (depth=1, no history)
        subprocess.run(['git', 'clone', '--depth', '1', repo.clone_url, clone_path], check=True)

        # Validate file structure
        file_count = count_target_files(clone_path, extensions=['.py', '.js', '.ts'])
        if file_count < 10:
            return False, "Too few files"

        # Basic security scan (check for eval, exec, subprocess)
        if detect_malicious_code(clone_path):
            shutil.rmtree(clone_path)  # Delete immediately
            return False, "Security risk"

        # AST parsing validation
        if not validate_ast_parseable(clone_path):
            return False, "AST parsing failed"

        return True, "Validated"

    except Exception as e:
        return False, str(e)
```

---

## Expected Outcomes

### Marketing Domain (540 repos → ~300 accepted)

**Anticipated Pattern Extraction:**
- **Hierarchical Taxonomy:** 40-60 patterns (audience classification systems)
- **NLP Keyword Extraction:** 50-80 patterns (spaCy, NLTK pipelines)
- **AI Content Generation:** 30-50 patterns (GPT prompt engineering)
- **Semantic Search:** 40-60 patterns (embedding generation, vector search)
- **Data Pipelines:** 60-80 patterns (CSV processing, batch operations)
- **NER for Marketing:** 20-40 patterns (entity extraction from descriptions)

**Total Estimated:** 240-370 high-quality patterns (after human validation: 180-280 approved)

### Legal Domain (440 repos → ~250 accepted)

**Anticipated Pattern Extraction:**
- **Legal Taxonomy:** 30-50 patterns (case classification, matter types)
- **Legal NLP:** 40-60 patterns (contract analysis, statute parsing, NER)
- **Document Management:** 40-60 patterns (filing, classification, metadata)
- **Timeline Extraction:** 20-30 patterns (chronological event ordering)
- **Semantic Case Search:** 30-40 patterns (precedent matching, similarity)
- **Workflow Automation:** 30-50 patterns (intake, routing, deadlines)

**Total Estimated:** 190-290 high-quality patterns (after human validation: 140-220 approved)

### Combined Totals

- **Candidate Repos:** 980 (540 marketing + 440 legal)
- **Accepted Repos (after filtering):** ~550 (56% acceptance rate)
- **Raw Patterns Extracted:** 430-660
- **Approved Patterns (after human validation):** 320-500
- **Target Achievement:** ✅ Meets 250-500 pattern goal per domain

---

## Integration with PRE_LAUNCH_TRAINING.md

### Task PLT-001 Updates

**Original Task:**
```
Build GitHub scraping pipeline that:
1. Queries GitHub API for domain-specific repos
2. Filters by quality metrics (stars, good docstrings)
3. Clones repos to local storage
4. Prepares for pattern extraction
```

**Enhanced Task (with CodeSearchNet patterns):**
```python
# Updated scraping pipeline with Ad Hub-inspired patterns

def scrape_with_codesearchnet_patterns(domain):
    """
    Enhanced GitHub scraping with pattern-focused filtering

    REASONING CHAIN:
    1. Execute 8 domain-specific queries (analytics, segmentation, NLP, etc.)
    2. Apply 12 quality filters (stars, docstrings, reasoning, keywords)
    3. Score repos for pattern extraction potential (0-100 score)
    4. Clone only high-scoring repos (score ≥70)
    5. Validate cloned repos (AST parsing, security scan)
    6. Store metadata for PLT-002 pattern extraction
    """
    queries = MARKETING_DOMAIN_QUERIES if domain == 'marketing' else LEGAL_DOMAIN_QUERIES

    all_accepted_repos = []

    for query_name, config in queries.items():
        print(f"📊 Query: {query_name} (target: {config['target_repos']} repos)")

        # Search GitHub API
        candidate_repos = search_github_api(
            query=config['query'],
            languages=config['languages'],
            stars_min=ENHANCED_QUALITY_FILTERS['min_stars'],
            max_results=config['target_repos'] * 3  # Oversample for filtering
        )

        # Apply quality filters
        filtered_repos = [
            repo for repo in candidate_repos
            if passes_quality_filters(repo, config['keywords'])
        ]

        # Score for pattern extraction
        scored_repos = [
            (repo, score_repo_for_pattern_extraction(repo, domain))
            for repo in filtered_repos
        ]

        # Sort by score, take top N
        top_repos = sorted(scored_repos, key=lambda x: x[1], reverse=True)[:config['target_repos']]

        # Clone & validate
        for repo, score in top_repos:
            success, reason = clone_and_validate(repo, domain)
            if success:
                all_accepted_repos.append({
                    'repo': repo,
                    'query': query_name,
                    'score': score,
                    'clone_path': f"data/repos/{domain}/{repo.name}"
                })
                print(f"  ✅ {repo.name} (score: {score:.1f})")
            else:
                print(f"  ❌ {repo.name} (reason: {reason})")

    # Save results
    save_json(all_accepted_repos, f"data/scraping/{domain}_accepted_codesearchnet.json")
    print(f"\n✅ Accepted: {len(all_accepted_repos)} repos for {domain}")
    print(f"📊 Quality rate: {len(all_accepted_repos) / len(candidate_repos) * 100:.1f}%")

    return all_accepted_repos
```

### Task PLT-002 Updates

**Enhanced Pattern Extraction (focus on Ad Hub patterns):**

```python
# Priority extraction targets (from Ad Hub analysis)

PATTERN_EXTRACTION_PRIORITIES = {
    'marketing': [
        {
            'name': 'hierarchical_taxonomy',
            'keywords': ['taxonomy', 'hierarchy', 'classification', 'parent', 'category'],
            'file_patterns': ['*taxonomy*.py', '*classification*.py', '*hierarchy*.py'],
            'min_quality': 0.85,
            'target_count': 40
        },
        {
            'name': 'nlp_keyword_extraction',
            'keywords': ['keyword', 'extraction', 'spacy', 'nltk', 'NER', 'stopwords'],
            'file_patterns': ['*keyword*.py', '*extraction*.py', '*nlp*.py'],
            'min_quality': 0.80,
            'target_count': 50
        },
        {
            'name': 'ai_content_generation',
            'keywords': ['GPT', 'prompt', 'generation', 'template', 'completion'],
            'file_patterns': ['*prompt*.py', '*generation*.py', '*gpt*.py'],
            'min_quality': 0.85,
            'target_count': 30
        },
        # ... (add all 12 priority patterns)
    ],
    'legal': [
        {
            'name': 'case_taxonomy',
            'keywords': ['case', 'type', 'classification', 'practice', 'area'],
            'file_patterns': ['*case*.py', '*taxonomy*.py', '*classification*.py'],
            'min_quality': 0.85,
            'target_count': 30
        },
        # ... (add legal patterns)
    ]
}

def extract_priority_patterns(repo_path, domain):
    """
    Extract patterns prioritizing Ad Hub-identified patterns

    REASONING CHAIN:
    1. Load priority pattern definitions for domain
    2. Search for file patterns (e.g., *taxonomy*.py)
    3. Parse AST, extract functions with docstrings
    4. Score docstring quality (prioritize Chain of Thought)
    5. Extract pattern components (design decision, why, reasoning)
    6. Only keep if quality ≥ target threshold
    7. Return prioritized patterns (hierarchical taxonomy first)
    """
    priorities = PATTERN_EXTRACTION_PRIORITIES[domain]
    extracted_patterns = {p['name']: [] for p in priorities}

    for priority in priorities:
        # Find matching files
        matching_files = find_files_by_pattern(repo_path, priority['file_patterns'])

        for file_path in matching_files:
            # Parse AST
            tree = parse_ast(file_path)

            for func_node in extract_functions(tree):
                docstring = get_docstring(func_node)

                # Score docstring quality
                quality_score = score_docstring_quality(docstring)

                if quality_score >= priority['min_quality']:
                    pattern = extract_pattern_components(func_node, docstring, domain)
                    pattern['priority'] = priority['name']
                    pattern['quality_score'] = quality_score
                    extracted_patterns[priority['name']].append(pattern)

                    # Stop when target count reached
                    if len(extracted_patterns[priority['name']]) >= priority['target_count']:
                        break

    return extracted_patterns
```

---

## Success Metrics (Updated)

### Scraping Phase (PLT-001)
- [ ] 980 repos searched (540 marketing + 440 legal)
- [ ] ~550 repos accepted (56% quality rate, target: >50%)
- [ ] Average pattern extraction score: ≥75 (out of 100)
- [ ] All repos cloned successfully, no security issues
- [ ] Metadata saved for PLT-002

### Pattern Extraction Phase (PLT-002)
- [ ] 12 priority pattern types targeted per domain
- [ ] 430-660 raw patterns extracted
- [ ] Average docstring quality: ≥0.8 (target: >0.8) ✅
- [ ] Chain of Thought components extracted: 80%+ of patterns
- [ ] Reasoning keywords ("why", "because") present: 70%+ of patterns

### Human Validation Phase (PLT-004)
- [ ] 320-500 patterns approved (target: 250-500 per domain) ✅
- [ ] Approval rate: 75%+ (raw → approved)
- [ ] All 12 priority pattern types represented
- [ ] Security scan: zero vulnerabilities
- [ ] Domain expert satisfaction: 90%+

---

## Patterns to Extract (from Ad Hub)

### Pattern Reference Guide

**For each pattern extracted, document:**
1. **Name:** Pattern-DOMAIN-XXX-TYPE (e.g., Pattern-MARKETING-001-TAXONOMY)
2. **Quality Score:** 0.0-1.0 (based on docstring quality, reasoning depth)
3. **Source Repo:** GitHub URL, file path, line numbers
4. **Category:** Taxonomy, NLP, AI Content, Semantic Search, etc.
5. **Chain of Thought:** Design decision, why, reasoning chain, alternatives
6. **Code Example:** Minimal working example (10-50 lines)
7. **Related Patterns:** References to similar patterns
8. **Performance:** If available (e.g., "1,000 docs/second")

**Example Pattern Metadata:**
```json
{
  "pattern_id": "Pattern-MARKETING-001-TAXONOMY",
  "name": "Hierarchical Audience Taxonomy",
  "quality_score": 0.95,
  "source_repo": "https://github.com/example/audience-platform",
  "source_file": "src/taxonomy/hierarchy.py",
  "source_lines": "45-120",
  "category": "Data Structures",
  "subcategory": "Hierarchical Classification",
  "domain": "Marketing",
  "design_decision": "Use multi-level taxonomy with composite keys",
  "why": "Audiences naturally group by industry → category → sub-category → product",
  "reasoning_chain": [
    "Hierarchical structure enables fast queries at any level",
    "Composite IDs (F9SI_10001) provide unique, sortable identifiers",
    "Multi-level indexing with Pandas MultiIndex",
    "Extensible schema for new columns (keywords, embeddings)",
    "Human-readable paths (Auto > Luxury > BMW)"
  ],
  "alternatives": [
    "Flat taxonomy (rejected - no hierarchical queries)",
    "Graph database (rejected - overkill for simple hierarchy)"
  ],
  "code_example": "...",
  "related_patterns": ["Pattern-LEGAL-001-TAXONOMY", "Pattern-ECOMMERCE-005-CATALOG"],
  "performance": "O(log n) lookup with MultiIndex, supports 50M+ rows",
  "keywords": ["taxonomy", "hierarchy", "classification", "pandas", "multiindex"]
}
```

---

## Validation Criteria (Enhanced)

### PLT-001 Validation (Scraping)
- [ ] All 16 enhanced queries executed (8 marketing + 8 legal)
- [ ] Quality filters applied (12 filters including Ad Hub-inspired)
- [ ] Pattern extraction scoring operational (0-100 score)
- [ ] Only high-scoring repos cloned (score ≥70)
- [ ] Security validation passed (no malicious code)
- [ ] Acceptance rate ≥50% (target: 56% from Ad Hub baseline)

### PLT-002 Validation (Extraction)
- [ ] All 12 priority pattern types targeted
- [ ] Docstring quality score calculated for each function
- [ ] Chain of Thought components extracted (design decision, why, reasoning)
- [ ] NER entities extracted where applicable (parties, dates, companies)
- [ ] Keyword extraction tested (spaCy, NLTK)
- [ ] Embeddings generated for semantic search
- [ ] Average quality ≥0.8 (Chain of Thought threshold)

### PLT-004 Validation (Human Review)
- [ ] 2 reviewers per domain (domain expert + security expert)
- [ ] Top 200 patterns reviewed per domain
- [ ] All 12 priority pattern types validated
- [ ] Approval rate ≥75% (raw → approved)
- [ ] Security vulnerabilities flagged and resolved
- [ ] Rejection reasons documented (feedback loop)

---

## Related Documentation

- **PRE_LAUNCH_TRAINING.md** - Original pre-training plan (this enhances Tasks PLT-001 and PLT-002)
- **Ad Hub Pattern Extraction Report** - Source of 12 high-quality patterns
- **PHASE_3_IMPLEMENTATION.md** - Pattern Validation System (P3-009)
- **BUSINESS_MODEL_V2.md** - Viral growth strategy, K-factor assumptions
- **Pattern-SCRAPER-001** - Quality-Filtered Scraping (original)
- **Pattern-SCRAPER-002** - Domain-Specific Pattern Library Curation (this document)

---

## Implementation Notes

### Week 17 Timeline (Updated)

**Days 1-2: Enhanced GitHub Scraping (PLT-001)**
- Execute 16 enhanced queries (8 marketing + 8 legal)
- Apply 12 quality filters
- Score repos for pattern extraction (0-100)
- Clone ~550 high-scoring repos
- Validate security + AST parsing

**Days 3-4: Priority Pattern Extraction (PLT-002)**
- Focus on 12 Ad Hub-identified pattern types
- Extract hierarchical taxonomy patterns first (highest priority)
- Extract NLP keyword extraction patterns (second priority)
- Extract AI content generation patterns (third priority)
- Continue through all 12 priorities

**Days 5-7: Continue PLT-002 + Begin PLT-003**
- Complete pattern extraction
- Aggregate patterns by quality weighting
- Prepare for human validation (PLT-004)

---

**STATUS:** Enhanced scraping strategy ready for PLT-001 execution
**NEXT:** Execute enhanced GitHub scraping (Week 17, Days 1-2)
**IMPACT:** 56% acceptance rate (vs. <50% baseline), 12 priority pattern types, 320-500 approved patterns

**Reasoning infrastructure for the AI age. Domain-specific patterns extracted from production codebases. Super intelligence at everyone's fingertips.**
