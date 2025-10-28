/**
 * Tauri Build Script
 *
 * DESIGN DECISION: Use tauri-build for compile-time resource embedding
 * WHY: Embeds frontend assets into binary, eliminates runtime file I/O
 *
 * REASONING CHAIN:
 * 1. tauri-build runs at compile time
 * 2. Reads tauri.conf.json configuration
 * 3. Embeds frontend build artifacts (HTML/CSS/JS) into binary
 * 4. Result: Single executable with no external dependencies
 * 5. Enables <3MB binary target (no separate asset files)
 *
 * PATTERN: Pattern-TAURI-001 (Lightweight Desktop App)
 * RELATED: Cargo.toml (build-dependencies), main.rs
 * PERFORMANCE: Compile-time embedding = zero runtime overhead
 */

fn main() {
    tauri_build::build()
}
