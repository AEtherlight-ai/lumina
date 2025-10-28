/**
 * Real-Time Sync Types (TypeScript)
 *
 * DESIGN DECISION: Mirror Rust types for WebSocket communication
 * WHY: Type safety across language boundary, prevent serialization errors
 *
 * REASONING CHAIN:
 * 1. Rust server defines types with serde serialization
 * 2. TypeScript client needs matching types for JSON parsing
 * 3. Exact match prevents runtime errors
 * 4. Type safety catches mismatches at compile time
 * 5. Result: Zero serialization bugs
 *
 * PATTERN: Pattern-WEBSOCKET-001 (Real-Time Sync Server)
 * RELATED: crates/aetherlight-core/src/realtime_sync/types.rs
 * PERFORMANCE: <1ms JSON serialization
 */

/**
 * Event type classification for real-time sync
 *
 * MUST match Rust: SyncEventType enum
 */
export enum SyncEventType {
    DesignDecision = 'design_decision',
    Blocker = 'blocker',
    Discovery = 'discovery',
}

/**
 * Real-time sync event
 *
 * MUST match Rust: SyncEvent struct
 */
export interface SyncEvent {
    /** Unique event ID (UUID) */
    id: string;
    /** Event type */
    event_type: SyncEventType;
    /** User who created event */
    user: string;
    /** Terminal ID (for multi-terminal tracking) */
    terminal_id: string;
    /** Project context (optional - for project-scoped events) */
    project?: string;
    /** Event title */
    title: string;
    /** Event description */
    description: string;
    /** Related files (optional) */
    files: string[];
    /** Tags (optional) */
    tags: string[];
    /** Timestamp (ISO 8601) */
    timestamp: string;
}

/**
 * WebSocket message types
 *
 * MUST match Rust: WsMessage enum
 *
 * DESIGN DECISION: Tagged union with discriminated type field
 * WHY: TypeScript discriminated unions enable type narrowing
 */
export type WsMessage =
    | {
          type: 'subscribe';
          event_types: SyncEventType[];
          project?: string;
      }
    | {
          type: 'unsubscribe';
          event_types: SyncEventType[];
      }
    | {
          type: 'publish';
          event: SyncEvent;
      }
    | {
          type: 'event';
          event: SyncEvent;
      }
    | {
          type: 'ack';
          message_id: string;
          success: boolean;
          error?: string;
      }
    | {
          type: 'ping';
      }
    | {
          type: 'pong';
      };

/**
 * Connection state
 */
export enum ConnectionState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    Reconnecting = 'reconnecting',
}

/**
 * Client configuration
 */
export interface RealtimeSyncConfig {
    /** WebSocket server URL */
    serverUrl: string;
    /** JWT token for authentication */
    token: string;
    /** User identifier */
    user: string;
    /** Terminal ID */
    terminalId: string;
    /** Project context (optional) */
    project?: string;
    /** Auto-reconnect on disconnect */
    autoReconnect?: boolean;
    /** Reconnect delay in milliseconds */
    reconnectDelay?: number;
    /** Max reconnect attempts (0 = infinite) */
    maxReconnectAttempts?: number;
}

/**
 * Event handler types
 */
export type EventHandler = (event: SyncEvent) => void;
export type StateChangeHandler = (state: ConnectionState) => void;
export type ErrorHandler = (error: Error) => void;
