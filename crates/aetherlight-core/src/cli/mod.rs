/**
 * CLI Module
 *
 * DESIGN DECISION: Command-line interface for ÆtherLight operations
 * WHY: Enable automation, CI/CD, scripting without GUI
 *
 * REASONING CHAIN:
 * 1. VS Code extension = great for interactive use
 * 2. CLI commands = great for automation, CI/CD, scripting
 * 3. Need config management commands (get, set, list, reset)
 * 4. Result: Complete CLI for ÆtherLight operations
 *
 * PATTERN: Pattern-CLI-001 (Command-Line Interface)
 * RELATED: config module
 * PERFORMANCE: <100ms per command
 */

pub mod config;

pub use config::ConfigCli;
