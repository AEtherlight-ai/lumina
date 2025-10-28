/**
 * NAPI-RS Build Script
 *
 * DESIGN DECISION: Auto-generate TypeScript definitions at build time
 * WHY: Ensures type safety between Rust FFI and TypeScript consumers
 *
 * REASONING CHAIN:
 * 1. NAPI-RS proc macros generate Rust → TypeScript type mappings
 * 2. Build script runs before compilation (validates types at build time)
 * 3. TypeScript definitions generated in index.d.ts file
 * 4. Prevents type mismatches between Rust and JavaScript
 * 5. Single source of truth for FFI types (Rust code)
 *
 * PATTERN: Pattern-007 (Language Bindings via NAPI)
 * RELATED: lib.rs (FFI exports), package.json (build scripts)
 * FUTURE: Add version checking for core library compatibility (P1-010)
 */
extern crate napi_build;

fn main() {
    napi_build::setup();
}
