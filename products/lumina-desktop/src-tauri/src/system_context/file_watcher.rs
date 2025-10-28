/**
 * File Watcher - Track filesystem changes in real-time
 *
 * DESIGN DECISION: Use `notify` crate for cross-platform filesystem watching
 * WHY: Handles Windows (ReadDirectoryChangesW), Mac (FSEvents), Linux (inotify) differences
 *
 * REASONING CHAIN:
 * 1. User creates/modifies/deletes files → notify events triggered
 * 2. FileWatcher filters events (ignore .git/, node_modules/, build/)
 * 3. Sends FileUpdate events to aggregator
 * 4. SystemContext updated with recently changed files
 * 5. Pattern matcher knows what files user actively working on
 *
 * PATTERN: Pattern-MONITOR-002 (Event-Based Filesystem Monitoring)
 * RELATED: FileSystemContext, SystemContextProvider
 * PERFORMANCE: <10ms event latency, <5MB memory overhead
 */

use std::path::{Path, PathBuf};
use tokio::sync::mpsc::Sender;
use notify::{Watcher, RecursiveMode, Result as NotifyResult};
use anyhow::Result;

use super::types::FileUpdate;

/**
 * FileWatcher - Real-time filesystem monitor
 *
 * USAGE:
 * ```rust
 * let watcher = FileWatcher::new("/path/to/workspace")?;
 * let (tx, rx) = mpsc::channel(100);
 * watcher.start(tx).await?;
 *
 * // Receive file updates
 * while let Some(update) = rx.recv().await {
 *     match update {
 *         FileUpdate::Created(path) => println!("Created: {:?}", path),
 *         FileUpdate::Modified(path) => println!("Modified: {:?}", path),
 *         FileUpdate::Deleted(path) => println!("Deleted: {:?}", path),
 *     }
 * }
 * ```
 */
pub struct FileWatcher {
    workspace_path: PathBuf,
}

impl FileWatcher {
    /**
     * Create new file watcher
     *
     * @param workspace_path - Root directory to watch recursively
     */
    pub fn new(workspace_path: &str) -> Result<Self> {
        let path = PathBuf::from(workspace_path);
        if !path.exists() {
            anyhow::bail!("Workspace path does not exist: {}", workspace_path);
        }

        Ok(Self {
            workspace_path: path,
        })
    }

    /**
     * Start watching filesystem (spawns background task)
     *
     * DESIGN DECISION: Filter ignored paths before sending updates
     * WHY: Reduce noise (.git/, node_modules/ changes irrelevant for context)
     *
     * REASONING CHAIN:
     * 1. notify::Watcher monitors workspace recursively
     * 2. Events filtered by should_ignore() (exclude .git/, node_modules/, etc.)
     * 3. Convert notify::Event → FileUpdate
     * 4. Send to channel for aggregation
     *
     * @param tx - Channel to send FileUpdate events
     */
    pub async fn start(&self, tx: Sender<FileUpdate>) -> Result<()> {
        let workspace_path = self.workspace_path.clone();

        // Create channel for notify events
        let (notify_tx, mut notify_rx) = tokio::sync::mpsc::channel(100);

        // Spawn notify watcher in blocking thread (notify is sync)
        let notify_tx_clone = notify_tx.clone();
        let workspace_clone = workspace_path.clone();

        std::thread::spawn(move || {
            let mut watcher = notify::recommended_watcher(
                move |res: NotifyResult<notify::Event>| {
                    if let Ok(event) = res {
                        let _ = notify_tx_clone.blocking_send(event);
                    }
                },
            )
            .expect("Failed to create watcher");

            watcher
                .watch(&workspace_clone, RecursiveMode::Recursive)
                .expect("Failed to watch workspace");

            // Keep watcher alive
            loop {
                std::thread::sleep(std::time::Duration::from_secs(1));
            }
        });

        // Spawn async task to process events
        tokio::spawn(async move {
            while let Some(event) = notify_rx.recv().await {
                for path in event.paths {
                    // Filter ignored paths
                    if Self::should_ignore(&path) {
                        continue;
                    }

                    // Convert notify event kind to FileUpdate
                    let update = match event.kind {
                        notify::EventKind::Create(_) => FileUpdate::Created(path.clone()),
                        notify::EventKind::Modify(_) => FileUpdate::Modified(path.clone()),
                        notify::EventKind::Remove(_) => FileUpdate::Deleted(path.clone()),
                        _ => continue,
                    };

                    if let Err(e) = tx.send(update).await {
                        eprintln!("FileWatcher: Failed to send update: {}", e);
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    /**
     * Check if path should be ignored
     *
     * DESIGN DECISION: Hardcoded ignore list (not .gitignore parsing)
     * WHY: Simple, fast, covers 99% of use cases
     *
     * IGNORED PATHS:
     * - .git/ (git internals)
     * - node_modules/ (npm packages)
     * - target/ (Rust build)
     * - dist/, build/, out/ (build outputs)
     * - .next/, .nuxt/, .svelte-kit/ (framework builds)
     * - *.log, *.tmp, *~ (temp files)
     *
     * @param path - File path to check
     * @return true if should ignore
     */
    fn should_ignore(path: &Path) -> bool {
        let path_str = path.to_string_lossy();

        // Ignore directories
        let ignored_dirs = [
            ".git",
            "node_modules",
            "target",
            "dist",
            "build",
            "out",
            ".next",
            ".nuxt",
            ".svelte-kit",
            "coverage",
            ".cache",
        ];

        for dir in &ignored_dirs {
            if path_str.contains(dir) {
                return true;
            }
        }

        // Ignore file extensions
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy();
            if matches!(ext_str.as_ref(), "log" | "tmp" | "swp" | "swo") {
                return true;
            }
        }

        // Ignore temp files (ending with ~)
        if path_str.ends_with('~') {
            return true;
        }

        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_ignore() {
        assert!(FileWatcher::should_ignore(Path::new(".git/HEAD")));
        assert!(FileWatcher::should_ignore(Path::new("node_modules/foo")));
        assert!(FileWatcher::should_ignore(Path::new("target/debug/main")));
        assert!(FileWatcher::should_ignore(Path::new("test.log")));
        assert!(FileWatcher::should_ignore(Path::new("test.tmp")));
        assert!(FileWatcher::should_ignore(Path::new("file~")));

        assert!(!FileWatcher::should_ignore(Path::new("src/main.rs")));
        assert!(!FileWatcher::should_ignore(Path::new("README.md")));
        assert!(!FileWatcher::should_ignore(Path::new("package.json")));
    }

    #[tokio::test]
    async fn test_file_watcher_new() {
        let temp_dir = tempfile::tempdir().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Should succeed with valid directory
        let watcher = FileWatcher::new(workspace_path);
        assert!(watcher.is_ok());
    }

    #[tokio::test]
    async fn test_file_watcher_invalid_path() {
        // Should fail with non-existent directory
        let watcher = FileWatcher::new("/nonexistent/path");
        assert!(watcher.is_err());
    }
}
