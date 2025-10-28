/**
 * TypeScript type definitions for Rust IPC module
 *
 * DESIGN DECISION: Manual type definitions for file-based IPC coordination
 * WHY: Enable TypeScript code to use Rust IPC types without full NAPI-RS build
 *
 * REASONING CHAIN:
 * 1. Phase 4 uses file-based IPC for multi-agent coordination
 * 2. Rust IPC module in crates/aetherlight-core/src/ipc/
 * 3. TypeScript code needs type definitions for approval gates and workflow
 * 4. Manual definitions match Rust types in crates/aetherlight-core/src/ipc/types.rs
 * 5. Result: TypeScript compiles and IDE provides autocomplete
 *
 * PATTERN: Pattern-IPC-001 (File-Based Coordination)
 * RELATED: crates/aetherlight-core/src/ipc/types.rs, AS-014
 * FUTURE: Auto-generate from Rust via NAPI-RS
 */

export type MessageType =
  | 'TaskStarted'
  | 'TaskCompleted'
  | 'TaskFailed'
  | 'ApprovalRequest'
  | 'ApprovalResponse'
  | 'ProgressUpdate'
  | 'ConflictDetected';

export interface IPCMessage {
  message_type: MessageType;
  sender_id: string;
  receiver_id?: string;
  payload: any;
  timestamp: string;
}

export interface TaskStartedPayload {
  task_id: string;
  agent_type: string;
  estimated_duration: string;
}

export interface TaskCompletedPayload {
  task_id: string;
  duration: string;
  files_modified: string[];
}

export interface CompletionSignal {
  task_id: string;
  files_changed: string[];
  design_decisions: string[];
  duration: string;
  success: boolean;
}

export interface TaskFailedPayload {
  task_id: string;
  error: string;
  recovery_options: RecoveryOption[];
}

export type RecoveryOption = 'Retry' | 'Skip' | 'Manual' | 'Abort';

export interface ApprovalRequestPayload {
  request_id: string;
  reason: string;
  context: any;
  options: string[];
}

export interface ApprovalResponsePayload {
  request_id: string;
  approved: boolean;
  selected_option?: string;
  comment?: string;
}

export interface ProgressUpdatePayload {
  progress_percent: number;
  current_step: string;
  estimated_remaining: string;
}

export interface ConflictDetectedPayload {
  file_path: string;
  agents: string[];
  resolution_strategy: ConflictResolutionStrategy;
}

export type ConflictResolutionStrategy =
  | 'Sequential'
  | 'Merge'
  | 'Manual'
  | 'Cancel';

/**
 * Write IPC message to file system
 */
export function write_message(message: IPCMessage): Promise<void>;

/**
 * Read IPC messages from file system
 */
export function read_messages(receiverId?: string): Promise<IPCMessage[]>;

/**
 * Clear processed messages
 */
export function clear_messages(messageIds: string[]): Promise<void>;

/**
 * Watch for new IPC messages (filesystem watcher)
 */
export function watch_messages(
  receiverId: string,
  callback: (message: IPCMessage) => void
): () => void; // Returns unsubscribe function
