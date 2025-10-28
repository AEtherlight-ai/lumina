/**
 * System Context Types
 *
 * DESIGN DECISION: Comprehensive system state representation
 * WHY: IDEs need complete context for accurate pattern matching
 *
 * PATTERN: Pattern-CONTEXT-003 (System State Snapshot)
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/**
 * SystemContext - Complete snapshot of monitored system state
 *
 * DESIGN DECISION: Three context sources (git, filesystem, documentation)
 * WHY: Each source provides different dimensions of system state
 *
 * REASONING CHAIN:
 * 1. GitContext: Repository state (branch, commits, staged changes)
 * 2. FileSystemContext: File changes (modified, added, deleted)
 * 3. DocumentationContext: Docs state (README changes, doc coverage)
 * 4. Combined: Complete system awareness
 * 5. Result: Better pattern matching (knows what user is working on)
 */
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SystemContext {
    pub git: GitContext,
    pub filesystem: FileSystemContext,
    pub documentation: DocumentationContext,
    pub workspace_path: PathBuf,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

impl SystemContext {
    pub fn apply_git_update(&mut self, update: GitUpdate) {
        self.git = update.into();
        self.last_updated = chrono::Utc::now();
    }

    pub fn apply_file_update(&mut self, update: FileUpdate) {
        match update {
            FileUpdate::Created(path) => {
                self.filesystem.recently_created.push(path);
            }
            FileUpdate::Modified(path) => {
                self.filesystem.recently_modified.push(path);
            }
            FileUpdate::Deleted(path) => {
                self.filesystem.recently_deleted.push(path);
            }
        }
        self.last_updated = chrono::Utc::now();
    }

    pub fn apply_doc_update(&mut self, update: DocUpdate) {
        self.documentation = update.into();
        self.last_updated = chrono::Utc::now();
    }
}

/**
 * GitContext - Repository state
 *
 * DESIGN DECISION: Track current branch, recent commits, staged changes
 * WHY: Know what feature user is working on → relevant patterns
 *
 * EXAMPLE:
 * - Branch: "feature/oauth2-login"
 * - Recent commits: ["Add OAuth2 routes", "Update user schema"]
 * - Staged files: ["src/auth/oauth.ts"]
 * → Pattern matcher knows user is working on OAuth2 → suggests OAuth patterns
 */
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GitContext {
    pub current_branch: String,
    pub recent_commits: Vec<CommitInfo>,
    pub staged_files: Vec<PathBuf>,
    pub unstaged_files: Vec<PathBuf>,
    pub is_dirty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/**
 * FileSystemContext - File change tracking
 *
 * DESIGN DECISION: Track recent file operations (last 100)
 * WHY: Know what files user is actively modifying
 *
 * REASONING CHAIN:
 * 1. User creates new file → recently_created updated
 * 2. Pattern matcher sees new file → suggests scaffolding patterns
 * 3. User modifies existing file → recently_modified updated
 * 4. Pattern matcher sees modified file → suggests refactoring patterns
 * 5. Result: Context-aware suggestions
 */
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FileSystemContext {
    pub recently_created: Vec<PathBuf>,
    pub recently_modified: Vec<PathBuf>,
    pub recently_deleted: Vec<PathBuf>,
    pub file_count: HashMap<String, usize>, // Extension → count
}

/**
 * DocumentationContext - Documentation state
 *
 * DESIGN DECISION: Track README changes, doc coverage
 * WHY: Know if documentation is current → prompt for updates
 *
 * EXAMPLE:
 * - User adds 500 lines of code
 * - README not updated in 3 days
 * → Prompt: "Update README with new feature?"
 */
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DocumentationContext {
    pub readme_last_modified: Option<chrono::DateTime<chrono::Utc>>,
    pub doc_files: Vec<PathBuf>,
    pub doc_coverage: f32, // 0.0-1.0 (ratio of documented functions)
}

/**
 * ContextUpdate - Incremental update event
 *
 * DESIGN DECISION: Enum for different update types
 * WHY: Subscribers can filter by update type
 *
 * EXAMPLE:
 * - IPC server subscribes to all updates
 * - UI subscribes only to GitChanged (shows branch in status bar)
 * - Logger subscribes to all (records full history)
 */
/**
 * DESIGN DECISION: Add VoiceRecording variant for bidirectional IPC
 * WHY: VS Code webview needs real-time recording state updates
 *
 * REASONING CHAIN:
 * 1. User presses hotkey → desktop app starts recording
 * 2. Desktop app broadcasts VoiceRecording(RecordingState) via IPC
 * 3. VS Code webview receives message → updates UI ("Recording...")
 * 4. User presses hotkey again → desktop app stops recording
 * 5. Desktop app broadcasts VoiceRecording with transcript
 * 6. VS Code webview displays transcript
 *
 * PATTERN: Pattern-IPC-003 (Bidirectional Voice State)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContextUpdate {
    GitChanged(GitContext),
    FileChanged(FileUpdate),
    DocChanged(DocUpdate),
    VoiceRecording(RecordingState),
    /// Command to focus Voice panel in IDE (sent when user presses backtick)
    FocusVoicePanel,
}

/**
 * GitUpdate - Git repository event
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitUpdate {
    pub current_branch: String,
    pub recent_commits: Vec<CommitInfo>,
    pub staged_files: Vec<PathBuf>,
    pub unstaged_files: Vec<PathBuf>,
    pub is_dirty: bool,
}

impl From<GitUpdate> for GitContext {
    fn from(update: GitUpdate) -> Self {
        Self {
            current_branch: update.current_branch,
            recent_commits: update.recent_commits,
            staged_files: update.staged_files,
            unstaged_files: update.unstaged_files,
            is_dirty: update.is_dirty,
        }
    }
}

/**
 * FileUpdate - File system event
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileUpdate {
    Created(PathBuf),
    Modified(PathBuf),
    Deleted(PathBuf),
}

/**
 * DocUpdate - Documentation event
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocUpdate {
    pub readme_last_modified: Option<chrono::DateTime<chrono::Utc>>,
    pub doc_files: Vec<PathBuf>,
    pub doc_coverage: f32,
}

impl From<DocUpdate> for DocumentationContext {
    fn from(update: DocUpdate) -> Self {
        Self {
            readme_last_modified: update.readme_last_modified,
            doc_files: update.doc_files,
            doc_coverage: update.doc_coverage,
        }
    }
}

/**
 * RecordingState - Voice recording status
 *
 * DESIGN DECISION: Simple state machine (Idle | Recording | Transcribing | Complete)
 * WHY: VS Code webview needs to show current state + transcript when done
 *
 * REASONING CHAIN:
 * 1. State: Idle → user presses hotkey
 * 2. State: Recording(start_time) → capturing audio
 * 3. User presses hotkey again → stop recording
 * 4. State: Transcribing → processing audio with Whisper
 * 5. State: Complete(transcript, duration) → ready to paste
 * 6. VS Code webview shows transcript, user can paste
 *
 * PATTERN: Pattern-STATE-001 (Recording State Machine)
 *
 * SERDE: Tagged enum with camelCase field names for TypeScript interop
 * JSON format:
 * - Idle: {"state": "Idle"}
 * - Recording: {"state": "Recording", "startedAt": "2025-01-01T00:00:00Z"}
 * - Transcribing: {"state": "Transcribing"}
 * - Complete: {"state": "Complete", "transcript": "...", "durationMs": 123}
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum RecordingState {
    /// Not recording
    Idle,
    /// Recording in progress (started at timestamp)
    Recording {
        #[serde(rename = "startedAt")]
        started_at: chrono::DateTime<chrono::Utc>
    },
    /// Processing audio (transcribing)
    Transcribing,
    /// Transcription complete
    Complete {
        transcript: String,
        #[serde(rename = "durationMs")]
        duration_ms: u64
    },
}
