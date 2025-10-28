# Benchmarking Guide - ÆtherLight Core

**Quick reference for running and analyzing performance benchmarks**

---

## Quick Start

```bash
# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench -- small_library
cargo bench -- large_library
cargo bench -- scaling

# View HTML report (after running benchmarks)
# Windows:
start target/criterion/report/index.html

# macOS:
open target/criterion/report/index.html

# Linux:
xdg-open target/criterion/report/index.html
```

---

## Available Benchmarks

### 1. Library Size Benchmarks
```bash
cargo bench -- small_library    # 100 patterns
cargo bench -- medium_library   # 1,000 patterns
cargo bench -- large_library    # 10,000 patterns
```

**Purpose:** Test pattern matching performance at different library sizes

### 2. Scaling Characteristics
```bash
cargo bench -- scaling
```

**Purpose:** Validate O(n) linear scaling across 100, 1k, 10k patterns

### 3. Batch Query Processing
```bash
cargo bench -- batch_queries
```

**Purpose:** Test server-side workload (100 queries on 1k patterns)

### 4. Library Construction
```bash
cargo bench -- library_construction
```

**Purpose:** Measure time to build pattern library from scratch

### 5. Query Complexity
```bash
cargo bench -- query_complexity
```

**Purpose:** Test performance across short, medium, and long queries

### 6. Result Count Impact
```bash
cargo bench -- result_counts
```

**Purpose:** Measure impact of max_results parameter on performance

---

## Performance Targets (SOP-004)

| Metric | Target | Current Status |
|--------|--------|----------------|
| 10k patterns (p50) | <50ms | 144ms ⚠️ |
| 10k patterns (p95) | <100ms | 160ms ⚠️ |
| Scaling | O(n) | ✅ Linear |
| Library construction | <1s | 16ms ✅ |
| Batch consistency | Stable | ✅ 11.2ms/query |
| Memory (10k patterns) | <50MB | ✅ ~10MB |

**Status:** 5/6 targets met. Optimization deferred to P1-011.

---

## Interpreting Results

### Criterion Output Format
```
benchmark_name
    time:   [lower_bound mean upper_bound]
```

**Example:**
```
large_library_10000_patterns
    time:   [130.62 ms 144.15 ms 159.72 ms]
```

- **Lower bound (130.62ms):** 5th percentile
- **Mean (144.15ms):** Average time (p50)
- **Upper bound (159.72ms):** 95th percentile

### Outliers
```
Found 14 outliers among 100 measurements (14.00%)
  14 (14.00%) high severe
```

- **Low outliers:** Faster than expected (cache hits)
- **High outliers:** Slower than expected (GC, context switches)
- **Severity:** Mild (<10% deviation), Severe (>10% deviation)

### Performance Regression
Criterion tracks performance over time:
- Green: Performance improved
- Red: Performance regressed
- Gray: First run (no baseline)

---

## Benchmark Architecture

### File Structure
```
crates/aetherlight-core/
├── benches/
│   └── pattern_matching.rs    # All benchmark functions
├── target/
│   └── criterion/             # Generated reports
│       ├── report/            # HTML reports
│       │   └── index.html     # Main report
│       ├── small_library_100_patterns/
│       ├── medium_library_1000_patterns/
│       ├── large_library_10000_patterns/
│       └── ...
├── Cargo.toml                 # Benchmark configuration
├── BENCHMARK_RESULTS.md       # Latest results analysis
└── BENCHMARKING.md           # This file
```

### Benchmark Functions

Each benchmark follows this pattern:

```rust
fn bench_example(c: &mut Criterion) {
    // Setup: Create test data
    let patterns = generate_test_patterns(1000);
    let mut matcher = PatternMatcher::new();
    for pattern in patterns {
        matcher.add_pattern(pattern).unwrap();
    }

    // Benchmark: Measure operation
    c.bench_function("example_benchmark", |b| {
        b.iter(|| {
            matcher.find_matches("query", 5).unwrap()
        });
    });
}
```

**DESIGN DECISION:** Setup code runs once, only measured code is benchmarked
**WHY:** Isolate performance of specific operation (pattern matching)

---

## Advanced Usage

### Benchmark Groups
```bash
# Run all scaling benchmarks
cargo bench -- scaling_characteristics

# Run all query complexity benchmarks
cargo bench -- query_complexity
```

### Statistical Options

```bash
# Increase sample count (default: 100)
CRITERION_SAMPLE_SIZE=200 cargo bench

# Increase measurement time (default: 5s)
CRITERION_MEASUREMENT_TIME=10 cargo bench

# Enable debug output
RUST_LOG=criterion=debug cargo bench
```

### Profiling Integration

```bash
# Generate flamegraph (requires flamegraph crate)
cargo flamegraph --bench pattern_matching -- --bench

# Profile with perf (Linux only)
perf record --call-graph dwarf cargo bench -- --profile-time=10

# Valgrind memory profiling
valgrind --tool=massif cargo bench -- --profile-time=5
```

---

## Continuous Integration

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
cargo bench -- --quick
if [ $? -ne 0 ]; then
    echo "Benchmarks failed!"
    exit 1
fi
```

### CI/CD Integration
```yaml
# .github/workflows/benchmarks.yml
name: Benchmarks

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cargo bench --bench pattern_matching
      - uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'criterion'
          output-file-path: target/criterion/report/index.html
```

---

## Troubleshooting

### Benchmark Hangs
```bash
# Check for running cargo processes
tasklist | findstr cargo  # Windows
ps aux | grep cargo       # Linux/macOS

# Kill hanging processes
taskkill /F /IM cargo.exe  # Windows
killall cargo              # Linux/macOS
```

### Compilation Errors
```bash
# Clean build artifacts
cargo clean

# Rebuild benchmarks
cargo bench --no-run
```

### Performance Variance
- **High outliers:** Close background applications
- **Inconsistent results:** Run benchmarks 3-5 times
- **Thermal throttling:** Ensure adequate cooling

### Missing HTML Reports
```bash
# Ensure gnuplot is installed (for plots)
# Windows: choco install gnuplot
# macOS: brew install gnuplot
# Linux: apt-get install gnuplot

# Or use plotters backend (built-in)
# Criterion automatically falls back to plotters if gnuplot not found
```

---

## Performance Analysis Tools

### Built-in Tools
- **Criterion HTML reports:** Visual performance tracking
- **Flamegraphs:** CPU profiling (requires cargo-flamegraph)
- **cargo-bench:** Standard benchmarking

### External Tools
- **perf (Linux):** Low-level CPU profiling
- **Valgrind:** Memory profiling and leak detection
- **heaptrack:** Heap allocation tracking
- **cachegrind:** Cache miss analysis

### Installation
```bash
# Install cargo-flamegraph
cargo install flamegraph

# Install cargo-criterion (enhanced reports)
cargo install cargo-criterion
```

---

## Optimization Workflow

### 1. Baseline Measurement
```bash
# Run benchmarks and save baseline
cargo bench -- --save-baseline before
```

### 2. Make Changes
```rust
// Implement optimization in src/matching.rs
// Example: Add inverted index
```

### 3. Compare Performance
```bash
# Run benchmarks and compare to baseline
cargo bench -- --baseline before

# Criterion shows:
# - Green: Performance improved
# - Red: Performance regressed
# - Change magnitude (%)
```

### 4. Validate
```bash
# Ensure tests still pass
cargo test

# Check for regressions
cargo bench -- --baseline before | tee results.txt
```

---

## Best Practices

### DO:
- ✅ Run benchmarks on stable hardware (no background tasks)
- ✅ Use release mode (cargo bench automatically uses --release)
- ✅ Warm up CPU (criterion does this automatically)
- ✅ Use statistical analysis (criterion provides this)
- ✅ Track performance over time (commit HTML reports)
- ✅ Set realistic performance targets (SOP-004)

### DON'T:
- ❌ Run benchmarks on battery power (throttling)
- ❌ Run with high CPU load (context switching)
- ❌ Optimize prematurely (profile first)
- ❌ Trust single measurements (use statistical analysis)
- ❌ Ignore outliers (investigate root causes)

---

## Performance Targets Reference

### Phase 1 (Current)
- 10k patterns: 144ms (p50)
- Linear O(n) scaling: ✅
- Memory: ~10MB for 10k patterns

### P1-011 (Optimization)
- Target: <50ms for 10k patterns
- Method: Inverted index + SIMD
- Expected: 10x improvement

### Phase 2+ (Scale)
- Target: <50ms for 100k patterns
- Method: Distributed index + caching
- Expected: 100x total improvement

---

## Related Documentation

- **BENCHMARK_RESULTS.md:** Latest benchmark analysis
- **SOP-004:** Performance Targets standard
- **Pattern-005:** Multi-Dimensional Matching
- **matching.rs:** Pattern matching implementation
- **PHASE_1_IMPLEMENTATION.md:** Phase 1 roadmap

---

## Support

**Questions?** See the following resources:
- Criterion docs: https://bheisler.github.io/criterion.rs/book/
- Rust Performance Book: https://nnethercote.github.io/perf-book/
- ÆtherLight project memory: CLAUDE.md

**Found a performance issue?** Open a task:
```bash
# Example task ID: P1-011 (Performance Optimization)
# Track in Phase 1 implementation plan
```

---

**PATTERN:** SOP-004 (Performance Targets)
**RELATED:** Pattern-005 (Multi-Dimensional Matching)
**STATUS:** Benchmark suite complete ✅
