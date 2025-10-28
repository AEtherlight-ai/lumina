/**
 * Git Monitor - Track repository state changes
 *
 * DESIGN DECISION: Poll git status every 5 seconds (not filesystem watching)
 * WHY: Git operations atomic (checkout, commit, merge), polling simpler than inotify on .git/
 *
 * REASONING CHAIN:
 * 1. Filesystem watching .git/ directory unreliable (many temp files, locks)
 * 2. Git commands provide clean API (git status, git log)
 * 3. Polling every 5s acceptable latency (<100ms target for context updates)
 * 4. Detects: branch changes, new commits, staged/unstaged files
 * 5. Result: Reliable git state tracking without complex inotify logic
 *
 * PATTERN: Pattern-MONITOR-001 (Polling-Based State Monitor)
 * RELATED: GitContext, SystemContextProvider
 * PERFORMANCE: <50ms per poll, 5s interval, <10MB memory
 */

use std::path::Path;
use std::process::Command;
use tokio::sync::mpsc::Sender;
use tokio::time::{Duration, interval};
use anyhow::Result;

use super::types::{GitUpdate, CommitInfo};

/**
 * GitMonitor - Polls git repository state
 *
 * USAGE:
 * ```rust
 * let monitor = GitMonitor::new("/path/to/repo")?;
 * let (tx, rx) = mpsc::channel(100);
 * monitor.start(tx).await?;
 *
 * // Receive git updates
 * while let Some(update) = rx.recv().await {
 *     println!("Branch: {}", update.current_branch);
 * }
 * ```
 */
pub struct GitMonitor {
    repo_path: String,
}

impl GitMonitor {
    /**
     * Create new git monitor
     *
     * @param repo_path - Path to git repository (.git/ must exist)
     */
    pub fn new(repo_path: &str) -> Result<Self> {
        let git_dir = Path::new(repo_path).join(".git");
        if !git_dir.exists() {
            anyhow::bail!("Not a git repository: {}", repo_path);
        }

        Ok(Self {
            repo_path: repo_path.to_string(),
        })
    }

    /**
     * Start monitoring (spawns background task)
     *
     * DESIGN DECISION: Spawn tokio task (non-blocking)
     * WHY: Monitor runs independently, sends updates via channel
     *
     * @param tx - Channel to send GitUpdate events
     */
    pub async fn start(&self, tx: Sender<GitUpdate>) -> Result<()> {
        let repo_path = self.repo_path.clone();

        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(5));

            loop {
                ticker.tick().await;

                match Self::poll_git_status(&repo_path) {
                    Ok(update) => {
                        if let Err(e) = tx.send(update).await {
                            eprintln!("GitMonitor: Failed to send update: {}", e);
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("GitMonitor: Poll failed: {}", e);
                    }
                }
            }
        });

        Ok(())
    }

    /**
     * Poll git status (blocking)
     *
     * DESIGN DECISION: Run git commands synchronously
     * WHY: Git operations fast (<50ms), no benefit from async
     *
     * REASONING CHAIN:
     * 1. Get current branch: git rev-parse --abbrev-ref HEAD
     * 2. Get recent commits: git log --oneline -n 10
     * 3. Get staged files: git diff --cached --name-only
     * 4. Get unstaged files: git diff --name-only
     * 5. Combine into GitUpdate
     *
     * @return GitUpdate with current repository state
     */
    fn poll_git_status(repo_path: &str) -> Result<GitUpdate> {
        // Get current branch
        let current_branch = Command::new("git")
            .args(&["rev-parse", "--abbrev-ref", "HEAD"])
            .current_dir(repo_path)
            .output()?;
        let current_branch = String::from_utf8(current_branch.stdout)?
            .trim()
            .to_string();

        // Get recent commits (last 10)
        let commits_output = Command::new("git")
            .args(&[
                "log",
                "--pretty=format:%H|%an|%at|%s",
                "-n",
                "10",
            ])
            .current_dir(repo_path)
            .output()?;
        let commits_str = String::from_utf8(commits_output.stdout)?;

        let recent_commits: Vec<CommitInfo> = commits_str
            .lines()
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() == 4 {
                    Some(CommitInfo {
                        hash: parts[0][..8].to_string(), // Short hash
                        author: parts[1].to_string(),
                        timestamp: chrono::DateTime::from_timestamp(
                            parts[2].parse().ok()?,
                            0,
                        )?,
                        message: parts[3].to_string(),
                    })
                } else {
                    None
                }
            })
            .collect();

        // Get staged files
        let staged_output = Command::new("git")
            .args(&["diff", "--cached", "--name-only"])
            .current_dir(repo_path)
            .output()?;
        let staged_files: Vec<_> = String::from_utf8(staged_output.stdout)?
            .lines()
            .map(|line| Path::new(repo_path).join(line).to_path_buf())
            .collect();

        // Get unstaged files
        let unstaged_output = Command::new("git")
            .args(&["diff", "--name-only"])
            .current_dir(repo_path)
            .output()?;
        let unstaged_files: Vec<_> = String::from_utf8(unstaged_output.stdout)?
            .lines()
            .map(|line| Path::new(repo_path).join(line).to_path_buf())
            .collect();

        let is_dirty = !staged_files.is_empty() || !unstaged_files.is_empty();

        Ok(GitUpdate {
            current_branch,
            recent_commits,
            staged_files,
            unstaged_files,
            is_dirty,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_git_monitor_new() {
        let temp_dir = tempfile::tempdir().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize git repo
        Command::new("git")
            .args(&["init"])
            .current_dir(repo_path)
            .output()
            .unwrap();

        // Should succeed with valid git repo
        let monitor = GitMonitor::new(repo_path);
        assert!(monitor.is_ok());
    }

    #[tokio::test]
    async fn test_git_monitor_invalid_repo() {
        let temp_dir = tempfile::tempdir().unwrap();
        let not_repo = temp_dir.path().to_str().unwrap();

        // Should fail without .git/ directory
        let monitor = GitMonitor::new(not_repo);
        assert!(monitor.is_err());
    }

    #[tokio::test]
    async fn test_git_monitor_poll_status() {
        let temp_dir = tempfile::tempdir().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize git repo with config
        Command::new("git")
            .args(&["init"])
            .current_dir(repo_path)
            .output()
            .unwrap();

        Command::new("git")
            .args(&["config", "user.name", "Test"])
            .current_dir(repo_path)
            .output()
            .unwrap();

        Command::new("git")
            .args(&["config", "user.email", "test@test.com"])
            .current_dir(repo_path)
            .output()
            .unwrap();

        // Create and commit a file
        std::fs::write(Path::new(repo_path).join("test.txt"), "test content").unwrap();

        Command::new("git")
            .args(&["add", "test.txt"])
            .current_dir(repo_path)
            .output()
            .unwrap();

        Command::new("git")
            .args(&["commit", "-m", "Initial commit"])
            .current_dir(repo_path)
            .output()
            .unwrap();

        // Poll status
        let update = GitMonitor::poll_git_status(repo_path).unwrap();

        assert_eq!(update.current_branch, "master");
        assert!(update.recent_commits.len() > 0);
        assert!(!update.is_dirty);
    }
}
