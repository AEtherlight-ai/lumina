/**
 * System Context Provider Module
 *
 * DESIGN DECISION: Desktop app provides unified system context to ALL IDEs (not just VS Code)
 * WHY: VS Code PTY API alone insufficient - need system-level monitoring (git, filesystem, docs)
 *
 * REASONING CHAIN:
 * 1. User's clarification (v4.0): "Desktop app helps with CLI, documentation, repo, what's changed"
 * 2. System context ≠ IDE context (git commits, file changes happen outside IDE)
 * 3. Desktop app runs as always-on service → monitors system state
 * 4. IPC server broadcasts context changes to VS Code + other IDEs
 * 5. Result: Complete system awareness for better pattern matching
 *
 * PATTERN: Pattern-DESKTOP-001 (System-Level Context Provider)
 * RELATED: DATA_SCHEMA_AND_FLOW.md v5.0, TECHNOLOGY_GAP_AUDIT.md
 * PERFORMANCE: <100ms context update latency, <10MB memory overhead
 */

pub mod git_monitor;
pub mod file_watcher;
pub mod doc_tracker;
pub mod types;

use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;

use types::{SystemContext, ContextUpdate};

/**
 * SystemContextProvider - Unified context aggregator
 *
 * DESIGN DECISION: Single provider aggregates context from multiple monitors
 * WHY: Consumers receive complete context snapshot (not fragmented updates)
 *
 * REASONING CHAIN:
 * 1. GitMonitor tracks repo state (branch, commits, staged files)
 * 2. FileWatcher tracks filesystem changes (files added/modified/deleted)
 * 3. DocTracker tracks documentation changes (README, docs/ folder)
 * 4. SystemContextProvider aggregates all → single SystemContext struct
 * 5. IPC server broadcasts context to IDE extensions
 *
 * USAGE:
 * ```rust
 * let provider = SystemContextProvider::new("/path/to/repo").await?;
 * provider.start().await?;
 *
 * // Subscribe to context updates
 * let mut rx = provider.subscribe();
 * while let Some(update) = rx.recv().await {
 *     println!("Context updated: {:?}", update);
 * }
 * ```
 */
pub struct SystemContextProvider {
    /// Current system context (shared state)
    context: Arc<RwLock<SystemContext>>,

    /// Git repository monitor
    git_monitor: git_monitor::GitMonitor,

    /// Filesystem watcher
    file_watcher: file_watcher::FileWatcher,

    /// Documentation tracker
    doc_tracker: doc_tracker::DocTracker,

    /// Update broadcast channel
    tx: tokio::sync::broadcast::Sender<ContextUpdate>,
}

impl SystemContextProvider {
    /**
     * Create new system context provider
     *
     * DESIGN DECISION: Auto-detect git repo, validate paths
     * WHY: Fail fast if repo invalid (don't start monitoring)
     *
     * @param workspace_path - Root directory to monitor (must contain .git/)
     */
    pub async fn new(workspace_path: &str) -> Result<Self> {
        // Validate workspace path contains .git/
        let git_dir = std::path::Path::new(workspace_path).join(".git");
        if !git_dir.exists() {
            anyhow::bail!("Not a git repository: {}", workspace_path);
        }

        // Initialize empty context
        let context = Arc::new(RwLock::new(SystemContext::default()));

        // Create broadcast channel (capacity: 100 updates buffered)
        let (tx, _) = tokio::sync::broadcast::channel(100);

        // Initialize monitors
        let git_monitor = git_monitor::GitMonitor::new(workspace_path)?;
        let file_watcher = file_watcher::FileWatcher::new(workspace_path)?;
        let doc_tracker = doc_tracker::DocTracker::new(workspace_path)?;

        Ok(Self {
            context,
            git_monitor,
            file_watcher,
            doc_tracker,
            tx,
        })
    }

    /**
     * Start all monitors (non-blocking)
     *
     * DESIGN DECISION: Spawn separate tasks for each monitor
     * WHY: Independent monitoring (git failure doesn't block filesystem watching)
     *
     * REASONING CHAIN:
     * 1. Each monitor runs in separate tokio task
     * 2. Monitors send updates via mpsc channels
     * 3. Aggregator task receives all updates → merges into SystemContext
     * 4. Broadcasts merged context via broadcast channel
     * 5. IPC server subscribes to broadcast channel
     */
    pub async fn start(&self) -> Result<()> {
        let context = self.context.clone();
        let tx = self.tx.clone();

        // Start git monitor
        let (git_tx, mut git_rx) = tokio::sync::mpsc::channel(100);
        self.git_monitor.start(git_tx).await?;

        // Start file watcher
        let (file_tx, mut file_rx) = tokio::sync::mpsc::channel(100);
        self.file_watcher.start(file_tx).await?;

        // Start doc tracker
        let (doc_tx, mut doc_rx) = tokio::sync::mpsc::channel(100);
        self.doc_tracker.start(doc_tx).await?;

        // Spawn aggregator task
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    Some(git_update) = git_rx.recv() => {
                        let mut ctx = context.write().await;
                        ctx.apply_git_update(git_update);
                        let _ = tx.send(ContextUpdate::GitChanged(ctx.git.clone()));
                    }
                    Some(file_update) = file_rx.recv() => {
                        let mut ctx = context.write().await;
                        ctx.apply_file_update(file_update.clone());
                        let _ = tx.send(ContextUpdate::FileChanged(file_update));
                    }
                    Some(doc_update) = doc_rx.recv() => {
                        let mut ctx = context.write().await;
                        ctx.apply_doc_update(doc_update.clone());
                        let _ = tx.send(ContextUpdate::DocChanged(doc_update));
                    }
                }
            }
        });

        Ok(())
    }

    /**
     * Subscribe to context updates
     *
     * DESIGN DECISION: Broadcast channel for multiple subscribers
     * WHY: IPC server + UI + logging all receive same updates
     *
     * @return Receiver for ContextUpdate stream
     */
    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<ContextUpdate> {
        self.tx.subscribe()
    }

    /**
     * Get current context snapshot
     *
     * DESIGN DECISION: Clone context (not reference)
     * WHY: Avoid holding read lock across async boundaries
     *
     * @return Current SystemContext snapshot
     */
    pub async fn get_context(&self) -> SystemContext {
        self.context.read().await.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_system_context_provider_new() {
        // Create temporary git repo
        let temp_dir = tempfile::tempdir().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize git repo
        std::process::Command::new("git")
            .args(&["init"])
            .current_dir(repo_path)
            .output()
            .unwrap();

        // Should succeed with valid git repo
        let provider = SystemContextProvider::new(repo_path).await;
        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_system_context_provider_invalid_repo() {
        let temp_dir = tempfile::tempdir().unwrap();
        let not_repo = temp_dir.path().to_str().unwrap();

        // Should fail without .git/ directory
        let provider = SystemContextProvider::new(not_repo).await;
        assert!(provider.is_err());
    }
}
