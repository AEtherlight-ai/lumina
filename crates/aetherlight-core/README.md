# ÆtherLight Core

**Rust-based pattern matching and confidence scoring engine for AI-assisted development**

[![Rust](https://img.shields.io/badge/rust-1.70+-orange.svg)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-<50ms%20(10k%20patterns)-brightgreen.svg)](BENCHMARKS.md)

---

## Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/AEtherlight-ai/lumina
cd lumina/crates/aetherlight-core

# Build library
cargo build --release

# Run tests
cargo test

# Run benchmarks
cargo bench
```

### Basic Usage (Rust)

```rust
use aetherlight_core::{Pattern, PatternMatcher};

// Create pattern matcher
let mut matcher = PatternMatcher::new();

// Add patterns
let pattern = Pattern::builder()
    .title("Error Handling in Rust")
    .content("Best practices for handling errors with Result<T, E>")
    .tags(vec!["rust", "error-handling"])
    .language("rust")
    .build()?;

matcher.add_pattern(pattern)?;

// Search patterns
let matches = matcher.find_matches("How do I handle errors in Rust?", 5)?;

for m in matches {
    println!("{}: {} (score: {:.2})", m.pattern.id, m.pattern.title, m.score);
}
```

### FFI Usage (Node.js / TypeScript)

```typescript
import { PatternMatcher, Pattern } from '@aetherlight/core';

// Create matcher
const matcher = new PatternMatcher();

// Add pattern
matcher.addPattern({
  title: "Error Handling in TypeScript",
  content: "Best practices for TypeScript error handling",
  tags: ["typescript", "error-handling"],
  language: "typescript"
});

// Search
const matches = matcher.findMatches("How do I handle errors?", 5);
console.log(matches);
```

---

## Features

### ✨ Core Capabilities

- **🎯 Multi-Dimensional Pattern Matching** - 10+ dimensions for accurate results
- **📊 Confidence Scoring** - Transparent score breakdown with reasoning
- **⚡ High Performance** - <50ms for 10k patterns (see [BENCHMARKS.md](BENCHMARKS.md))
- **🔗 FFI Support** - Node.js, TypeScript, Dart, and more
- **🧪 Well Tested** - >80% code coverage, comprehensive test suite
- **📝 Chain of Thought** - All code documented with design decisions

### 🎯 Pattern Matching (Pattern-005)

**10+ Dimension Scoring:**
1. **Semantic similarity** (30%) - Embedding cosine distance
2. **Context match** (15%) - Language, framework, domain
3. **Keyword overlap** (10%) - Query terms in pattern
4. **Historical success** (15%) - Past usage success rate
5. **Pattern recency** (5%) - Recently updated patterns
6. **User preference** (10%) - User-specific history
7. **Team usage** (5%) - Team adoption rate
8. **Global usage** (5%) - Community popularity
9. **Security score** (3%) - Vulnerability scanning
10. **Code quality** (2%) - Linting, complexity scores

**Performance:**
- 100 patterns: ~3ms
- 1,000 patterns: ~15ms
- 10,000 patterns: ~45ms (p50), ~90ms (p95)

### 📊 Confidence Scoring

**Transparent Breakdown:**
```rust
ConfidenceScore {
    overall: 0.87,  // 87%
    dimensions: [
        DimensionScore { name: "semantic_similarity", score: 0.92, weight: 0.30 },
        DimensionScore { name: "context_match", score: 0.85, weight: 0.15 },
        // ... 8 more dimensions
    ],
    reasoning: "High semantic similarity (92%) with strong context match...",
    warnings: []
}
```

**Why This Matters:**
- Users see **why** confidence is high/low
- Enables informed decisions (insert vs reject)
- Prevents AI hallucinations (low confidence = don't auto-execute)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ÆtherLight Core (Rust)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Pattern    │  │   Matching   │  │  Confidence  │          │
│  │   Storage    │→│    Engine    │→│   Scoring    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↑                  ↑                  ↑                 │
│         │                  │                  │                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │            Error Handling & Validation            │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │    FFI Bindings     │
                    ├─────────────────────┤
                    │  • Node.js (NAPI)   │
                    │  • Dart (Flutter)   │
                    │  • Python (PyO3)    │
                    └─────────────────────┘
                              ↓
        ┌───────────────────────────────────────────┐
        │           Language Consumers              │
        ├───────────────────────────────────────────┤
        │  • VS Code Extension (TypeScript)        │
        │  • Desktop App (Tauri)                   │
        │  • Mobile App (Flutter)                  │
        │  • CLI Tools (Node.js)                   │
        └───────────────────────────────────────────┘
```

**Design Principles:**
- **Rust Core** - Memory-safe, fast, cross-platform
- **FFI Boundaries** - Language-agnostic via C ABI
- **Zero-Copy** - Minimize allocations across boundaries
- **Type Safety** - Strong typing at all layers

---

## API Reference

### Pattern

```rust
pub struct Pattern {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub language: Option<String>,
    pub framework: Option<String>,
    pub domain: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Pattern {
    pub fn builder() -> PatternBuilder { ... }
}
```

### PatternMatcher

```rust
pub struct PatternMatcher {
    patterns: HashMap<String, Pattern>,
}

impl PatternMatcher {
    pub fn new() -> Self { ... }

    pub fn add_pattern(&mut self, pattern: Pattern) -> Result<()> { ... }

    pub fn find_matches(
        &self,
        query: &str,
        max_results: usize
    ) -> Result<Vec<Match>> { ... }

    pub fn remove_pattern(&mut self, id: &str) -> Result<()> { ... }
}
```

### Match

```rust
pub struct Match {
    pub pattern: Pattern,
    pub score: f32,           // 0.0 - 1.0
    pub confidence: ConfidenceScore,
}
```

### ConfidenceScore

```rust
pub struct ConfidenceScore {
    pub overall: f32,         // Weighted average
    pub dimensions: Vec<DimensionScore>,
    pub reasoning: String,    // Human-readable explanation
    pub warnings: Vec<String>,
}

pub struct DimensionScore {
    pub name: String,
    pub score: f32,
    pub weight: f32,
    pub reasoning: String,
}
```

**Full API docs:** `cargo doc --no-deps --open`

---

## Performance

### Benchmarks

**Pattern Matching:**
| Library Size | p50 Latency | p95 Latency | Memory |
|--------------|-------------|-------------|--------|
| 100 patterns | ~3ms | ~5ms | ~5MB |
| 1,000 patterns | ~15ms | ~25ms | ~14MB |
| 10,000 patterns | ~45ms | ~90ms | ~50MB |

**Scaling:** Linear O(n) complexity ✓

**See:** [BENCHMARKS.md](BENCHMARKS.md) for complete performance data

### Performance Targets (SOP-004)

✅ <50ms for 10k patterns (p50)
✅ <100ms for 10k patterns (p95)
✅ <100MB memory for 10k patterns
✅ O(n) linear scaling

---

## FFI Bindings

### Node.js (NAPI-RS)

**Installation:**
```bash
npm install @aetherlight/core
```

**Usage:**
```typescript
import { PatternMatcher } from '@aetherlight/core';

const matcher = new PatternMatcher();
matcher.addPattern({ title: "...", content: "..." });
const matches = matcher.findMatches("query", 5);
```

**See:** [FFI_GUIDE.md](FFI_GUIDE.md) for complete FFI documentation

### Flutter (Dart)

**Installation:**
```yaml
dependencies:
  aetherlight_core:
    git:
      url: https://github.com/AEtherlight-ai/lumina
      path: bindings/dart
```

**Usage:**
```dart
import 'package:aetherlight_core/aetherlight_core.dart';

final matcher = PatternMatcher();
await matcher.addPattern(Pattern(...));
final matches = await matcher.findMatches("query", 5);
```

---

## Testing

### Run Tests

```bash
# All tests
cargo test

# Specific test
cargo test test_pattern_matching

# With output
cargo test -- --nocapture

# Integration tests only
cargo test --test '*'
```

### Coverage

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html

# Open report
open tarpaulin-report.html
```

**Current Coverage:** >80% (Phase 1 target met)

---

## Development

### Project Structure

```
aetherlight-core/
├── src/
│   ├── lib.rs           # Public API exports
│   ├── pattern.rs       # Pattern data structures
│   ├── matching.rs      # Pattern matching engine
│   ├── confidence.rs    # Confidence scoring
│   └── error.rs         # Error types
├── benches/
│   └── pattern_matching.rs  # Performance benchmarks
├── tests/
│   └── integration.rs   # Integration tests
├── Cargo.toml
├── README.md            # This file
├── ARCHITECTURE.md      # Detailed design
├── FFI_GUIDE.md         # FFI usage guide
└── BENCHMARKS.md        # Performance data
```

### Build Modes

```bash
# Development (fast compile, debug symbols)
cargo build

# Release (optimized, no debug symbols)
cargo build --release

# Release with debug symbols (profiling)
cargo build --profile release-with-debug
```

### Benchmarking

```bash
# Run all benchmarks
cargo bench

# Generate HTML report
cargo bench --bench pattern_matching

# Open report
open target/criterion/report/index.html
```

---

## Documentation

### Generate API Docs

```bash
# Generate docs
cargo doc --no-deps

# Generate and open
cargo doc --no-deps --open
```

### Additional Docs

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and decisions
- **[FFI_GUIDE.md](FFI_GUIDE.md)** - Using from other languages
- **[BENCHMARKS.md](BENCHMARKS.md)** - Performance validation

---

## Chain of Thought Documentation

**All code follows Chain of Thought standard:**

```rust
/**
 * DESIGN DECISION: Use HashMap for O(1) pattern lookup
 * WHY: Need fast retrieval by ID for pattern updates
 *
 * REASONING CHAIN:
 * 1. Patterns identified by unique UUID
 * 2. Users update patterns frequently (edit content, add tags)
 * 3. HashMap provides O(1) lookup vs O(n) Vec scan
 * 4. Memory overhead acceptable (~24 bytes per entry)
 * 5. Better than BTreeMap for this use case (no ordering needed)
 *
 * PATTERN: Pattern-001 (Rust Core + Language Bindings)
 * RELATED: Pattern struct, add_pattern(), remove_pattern()
 * FUTURE: Add LRU cache for recently accessed patterns
 */
```

**Why This Matters:**
- AI assistants understand **why** decisions were made
- Prevents repeated mistakes (hallucinations)
- Enables confident code modifications
- Self-documenting architecture

---

## License

MIT License - see [LICENSE](../../LICENSE)

---

## Contributing

**Phase 1 Status:** ✅ Core library complete

**Next Phases:**
- Phase 2: Desktop app (Tauri) + voice capture
- Phase 3: Intelligence features + pattern validation
- Phase 4: Mobile app (Flutter)

**See:** [IMPLEMENTATION_ROADMAP.md](../../docs/build/IMPLEMENTATION_ROADMAP.md)

---

## References

**Patterns:**
- Pattern-001: Rust Core + Language Bindings
- Pattern-005: Multi-Dimensional Matching
- Pattern-007: Language Bindings via NAPI

**SOPs:**
- SOP-003: Test-Driven Development
- SOP-004: Performance Targets
- SOP-007: Git Workflow Standards

**Documentation:**
- [Chain of Thought Standard](../../docs/vision/CHAIN_OF_THOUGHT_STANDARD.md)
- [Technical Architecture](../../docs/build/AETHERLIGHT_TECHNICAL_ARCHITECTURE_2025.md)

---

**Created:** 2025-10-05
**Version:** 1.0.0 (Phase 1)
**Status:** ✅ Production-ready for Phase 2 integration
