# aetherlight-node

**Node.js bindings for ÆtherLight Core pattern matching engine**

[![npm version](https://img.shields.io/npm/v/aetherlight-node.svg)](https://www.npmjs.com/package/aetherlight-node)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)

## Overview

`aetherlight-node` provides high-performance Node.js bindings to the ÆtherLight Core pattern matching engine. Built with Rust and NAPI-RS, it enables multi-dimensional pattern matching with <50ms latency for 10,000 patterns.

### Key Features

- **Multi-Dimensional Matching**: 10+ scoring dimensions (semantic similarity, context match, keyword overlap, etc.)
- **Transparent Confidence**: Explainable confidence breakdowns for debugging and trust
- **High Performance**: <50ms matching on 10k patterns, <5ms FFI overhead
- **Type-Safe**: Full TypeScript definitions auto-generated from Rust types
- **Cross-Platform**: Pre-built binaries for Windows, macOS (Intel/ARM), Linux (x64/ARM)
- **Zero Dependencies**: Native addon with no runtime dependencies

## Installation

### Option 1: Install with main ÆtherLight package (Recommended)
```bash
npm install -g aetherlight
```
This installs the native bindings along with the VS Code extension and analyzer CLI.

### Option 2: Install bindings only
```bash
npm install aetherlight-node
```
Use this for low-level integration with the pattern matching engine.

### Requirements

- **Node.js**: 16.0.0 or higher
- **Pre-built binaries** included for:
  - Windows (x64, x86, ARM64)
  - macOS (Intel x64, Apple Silicon ARM64)
  - Linux (x64, ARM64, ARMv7)

### Building from Source (Optional)

If pre-built binaries are unavailable for your platform:

1. Install [Rust toolchain](https://rustup.rs/)
2. Build native addon:

```bash
npm run build
```

## Quick Start

```typescript
import { PatternMatcher, Pattern } from 'aetherlight-node';

// Create a pattern matcher
const matcher = new PatternMatcher();

// Add patterns to library
const rustPattern = new Pattern(
  "Rust error handling",
  "Use Result<T, E> for fallible operations. Never panic in library code.",
  ["rust", "error-handling", "result"]
);
matcher.addPattern(rustPattern);

const pythonPattern = new Pattern(
  "Python exception handling",
  "Use try/except blocks for error handling. Be specific with exception types.",
  ["python", "exceptions", "error-handling"]
);
matcher.addPattern(pythonPattern);

// Find matching patterns
const results = matcher.findMatches("How do I handle errors in Rust?", 5);

// Display results with confidence
for (const result of results) {
  console.log(`${result.pattern.title}: ${result.confidence.totalScore * 100}%`);
  console.log(`  Breakdown: keyword=${result.confidence.breakdown.keywordOverlap.toFixed(2)}, context=${result.confidence.breakdown.contextMatch.toFixed(2)}`);
}
```

**Output:**
```
Rust error handling: 87.2%
  Breakdown: keyword=0.95, context=1.00
Python exception handling: 62.3%
  Breakdown: keyword=0.75, context=0.50
```

## API Reference

### `PatternMatcher`

Pattern matching engine with in-memory pattern library.

#### Constructor

```typescript
new PatternMatcher(): PatternMatcher
```

Creates a new empty pattern matcher.

#### Methods

##### `addPattern(pattern: Pattern): void`

Adds a pattern to the library. Throws error if pattern with same ID already exists.

```typescript
const pattern = new Pattern("Title", "Content", ["tag"]);
matcher.addPattern(pattern);
```

##### `removePattern(id: string): void`

Removes a pattern from the library by UUID. Throws error if pattern not found.

```typescript
matcher.removePattern(pattern.id);
```

##### `getPattern(id: string): Pattern`

Retrieves a pattern by UUID. Throws error if pattern not found.

```typescript
const pattern = matcher.getPattern(id);
console.log(pattern.title);
```

##### `findMatches(query: string, maxResults: number): MatchResult[]`

Finds matching patterns for a user query. Returns results sorted by confidence (descending).

**Performance**: <50ms for 10,000 patterns (p50 latency)

```typescript
const results = matcher.findMatches("error handling in Rust", 5);
```

**Throws**:
- `Error` if query is empty
- `Error` if library is empty

##### `count(): number`

Returns total number of patterns in library.

```typescript
console.log(`Library has ${matcher.count()} patterns`);
```

##### `isEmpty(): boolean`

Checks if library is empty.

```typescript
if (matcher.isEmpty()) {
  console.log("No patterns in library");
}
```

---

### `Pattern`

Represents a single pattern in the library.

#### Constructor

```typescript
new Pattern(title: string, content: string, tags: string[]): Pattern
```

Creates a new pattern with required fields.

```typescript
const pattern = new Pattern(
  "Rust error handling",
  "Use Result<T, E> for fallible operations",
  ["rust", "error-handling"]
);
```

#### Properties

- `id: string` - Unique identifier (UUID v4)
- `title: string` - Short description
- `content: string` - Full explanation with Chain of Thought reasoning
- `tags: string[]` - Tags for keyword matching
- `metadata: PatternMetadata` - Context metadata (language, framework, domain)
- `createdAt: string` - Creation timestamp (ISO 8601)
- `modifiedAt: string` - Last modification timestamp (ISO 8601)

#### Methods

##### `toJSON(): string`

Serializes pattern to JSON string.

```typescript
const json = pattern.toJSON();
localStorage.setItem('pattern', json);
```

##### `Pattern.fromJSON(json: string): Pattern` (static)

Deserializes pattern from JSON string.

```typescript
const json = localStorage.getItem('pattern');
const pattern = Pattern.fromJSON(json);
```

---

### `ConfidenceScore`

Confidence score with transparent breakdown.

#### Properties

- `totalScore: number` - Total confidence [0.0, 1.0]
- `breakdown: ConfidenceBreakdown` - Individual dimension scores

#### Methods

##### `meetsThreshold(threshold: number): boolean`

Checks if confidence meets minimum threshold.

```typescript
if (score.meetsThreshold(0.85)) {
  console.log("High confidence match!");
}
```

---

### `ConfidenceBreakdown`

Individual dimension scores for multi-dimensional matching.

```typescript
interface ConfidenceBreakdown {
  semanticSimilarity: number;      // 30% weight
  contextMatch: number;             // 15% weight
  keywordOverlap: number;           // 10% weight
  historicalSuccessRate: number;    // 15% weight
  patternRecency: number;           // 5% weight
  userPreference: number;           // 10% weight
  teamUsage: number;                // 5% weight
  globalUsage: number;              // 5% weight
  securityScore: number;            // 3% weight
  codeQualityScore: number;         // 2% weight
}
```

All scores in range [0.0, 1.0]:
- **0.0**: No match/confidence
- **0.5**: Neutral (insufficient data)
- **1.0**: Perfect match/high confidence

---

### `MatchResult`

Single match result with pattern and confidence.

```typescript
interface MatchResult {
  pattern: Pattern;
  confidence: ConfidenceScore;
}
```

---

### `version(): string`

Returns library version as semantic version string.

```typescript
import { version } from 'aetherlight-node';
console.log(`ÆtherLight Core v${version()}`);
```

## Advanced Usage

### Pattern Metadata

Enhance matching accuracy with context metadata:

```typescript
const pattern = new Pattern(
  "React useState hook",
  "Use useState for component state. Returns [state, setState] tuple.",
  ["react", "hooks", "state"]
);

// Metadata inferred from tags, but can be set manually
// (requires using builder pattern in future API)
```

### Confidence Thresholding

Filter results by confidence threshold:

```typescript
const results = matcher.findMatches("query", 10);

const highConfidence = results.filter(r => r.confidence.meetsThreshold(0.85));
console.log(`${highConfidence.length} high-confidence matches (>85%)`);
```

### Pattern Serialization

Store patterns for persistence:

```typescript
// Save to file
const fs = require('fs');
const pattern = new Pattern("Title", "Content", ["tag"]);
fs.writeFileSync('pattern.json', pattern.toJSON());

// Load from file
const json = fs.readFileSync('pattern.json', 'utf-8');
const loaded = Pattern.fromJSON(json);
```

### Error Handling

All methods throw JavaScript `Error` on failure:

```typescript
try {
  const pattern = matcher.getPattern('invalid-uuid');
} catch (err) {
  console.error(`Pattern not found: ${err.message}`);
}
```

## Performance

### Benchmarks

Performance on Intel i7-12700K (12 cores, 3.6 GHz):

| Operation | Library Size | Latency (p50) | Latency (p99) |
|-----------|--------------|---------------|---------------|
| `addPattern` | 1,000 patterns | 0.2 ms | 0.5 ms |
| `addPattern` | 10,000 patterns | 0.3 ms | 0.8 ms |
| `findMatches` | 1,000 patterns | 8 ms | 12 ms |
| `findMatches` | 10,000 patterns | 42 ms | 58 ms |
| `findMatches` | 100,000 patterns | 380 ms | 520 ms |

**FFI Overhead**: <5ms per call (NAPI-RS zero-copy optimization)

### Memory Usage

- **Per pattern**: ~1KB (typical)
- **10k patterns**: ~10MB
- **100k patterns**: ~100MB

## Architecture

### FFI Layer

```text
JavaScript/TypeScript
    ↓ (NAPI-RS bindings)
aetherlight-node (this package)
    ↓ (thin FFI wrapper)
aetherlight-core (Rust library)
    ↓ (pattern matching algorithm)
Results
    ↓ (auto-serialized)
JavaScript Promise<MatchResult[]>
```

### Multi-Dimensional Matching

Pattern matching combines 10 dimensions:

1. **Semantic Similarity** (30%): Embedding cosine distance
2. **Context Match** (15%): Language/framework/domain fit
3. **Keyword Overlap** (10%): Tag matching
4. **Historical Success Rate** (15%): Pattern usage outcomes
5. **Pattern Recency** (5%): Newer patterns weighted higher
6. **User Preference** (10%): User-specific pattern affinity
7. **Team Usage** (5%): Team pattern popularity
8. **Global Usage** (5%): Community pattern popularity
9. **Security Score** (3%): Zero vulnerabilities required
10. **Code Quality Score** (2%): Static analysis metrics

**Total Score** = Weighted sum of dimensions (normalized to [0.0, 1.0])

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build native addon (requires Rust)
npm run build

# Run tests
npm test

# Build for release (optimized)
npm run build:release
```

### Cross-Compilation

Build for all platforms:

```bash
# Install Rust targets
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin
rustup target add x86_64-unknown-linux-gnu
rustup target add aarch64-unknown-linux-gnu

# Build for all targets
npm run build -- --target x86_64-pc-windows-msvc
npm run build -- --target x86_64-apple-darwin
npm run build -- --target aarch64-apple-darwin
npm run build -- --target x86_64-unknown-linux-gnu
npm run build -- --target aarch64-unknown-linux-gnu
```

### Testing

```bash
# Run integration tests
npm test

# Run with coverage (requires c8)
npx c8 npm test
```

## Troubleshooting

### "Native addon not found"

**Cause**: Pre-built binary unavailable for your platform.

**Solution**:
1. Install Rust: https://rustup.rs/
2. Run: `npm run build`
3. Verify build: `node -e "console.log(require('.').version())"`

### "Unsupported platform"

**Cause**: Your platform/architecture not supported.

**Supported platforms**:
- Windows (x64, x86, ARM64)
- macOS (x64, ARM64)
- Linux (x64, ARM64, ARMv7)

**Solution**: Build from source with Rust toolchain.

### "Pattern not found" errors

**Cause**: UUID mismatch or pattern removed.

**Solution**: Store pattern IDs after adding to library:

```typescript
const pattern = new Pattern("Title", "Content", ["tag"]);
matcher.addPattern(pattern);
const id = pattern.id; // Store this ID for later retrieval
```

## License

Dual-licensed under MIT OR Apache-2.0.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## Related Projects

- **ÆtherLight Core** - Rust core library
- **VS Code Extension** - IDE integration (uses this package)
- **Lumina Desktop** - Tauri desktop app
- **Lumina Mobile** - Flutter mobile app

## Links

- [Documentation](https://github.com/AEtherlight-ai/lumina/tree/main/docs)
- [Issue Tracker](https://github.com/AEtherlight-ai/lumina/issues)
- [Changelog](CHANGELOG.md)
- [npm Package](https://www.npmjs.com/package/aetherlight-node)

---

**Built with ❤️ using Rust + NAPI-RS**
