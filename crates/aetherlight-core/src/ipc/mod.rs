/**
 * File-Based IPC System - Agent Coordination
 *
 * DESIGN DECISION: Filesystem-based inter-process communication
 * WHY: Works in all environments (VS Code, Cursor, terminals), no network required
 *
 * REASONING CHAIN:
 * 1. Multiple agents run in separate terminals (isolated processes)
 * 2. Need reliable communication mechanism for coordination
 * 3. Filesystem provides: Atomicity, visibility, cross-platform compatibility
 * 4. Watch directory for completion signals (filesystem events)
 * 5. Agents write JSON signals when tasks complete
 * 6. Project Manager reads signals and updates dependency graph
 * 7. Result: Reliable multi-agent coordination without network complexity
 *
 * PATTERN: Pattern-IPC-001 (File-Based Agent Coordination)
 * RELATED: AS-003 (Task Scheduler), AS-004 (Terminal Spawner)
 * PERFORMANCE: <50ms detection (filesystem watcher)
 */

pub mod types;
pub mod writer;
pub mod reader;

pub use types::{CompletionSignal, TaskStatus};
pub use writer::SignalWriter;
pub use reader::SignalReader;
