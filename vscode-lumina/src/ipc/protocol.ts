/**
 * IPC Protocol Types - Message definitions for Extension ↔ Desktop communication
 *
 * DESIGN DECISION: Strongly typed protocol with message ID correlation
 * WHY: Type safety prevents protocol errors, message IDs enable request/response matching
 *
 * REASONING CHAIN:
 * 1. Extension and desktop communicate via WebSocket (bidirectional)
 * 2. Multiple requests can be in-flight simultaneously
 * 3. Message IDs correlate requests with responses (avoid race conditions)
 * 4. Status updates flow independently (no request/response pair)
 * 5. Error codes enable structured error handling
 *
 * PATTERN: Pattern-IPC-001 (WebSocket-based IPC protocol)
 * RELATED: IPC client (client.ts), captureVoice command (captureVoice.ts)
 * FUTURE: Add streaming support, compression for large payloads
 *
 * @module ipc/protocol
 */

/**
 * Base message with message ID for request/response correlation
 *
 * DESIGN DECISION: All messages have ID and type
 * WHY: Enables correlation, message routing, debugging
 */
export interface BaseMessage {
	/** Unique message ID (UUID v4) for request/response correlation */
	id: string;
	/** Message type discriminator for TypeScript type narrowing */
	type: string;
}

/**
 * Code context extracted from VS Code editor
 *
 * DESIGN DECISION: 50 lines before/after cursor (was 20 in P1-009)
 * WHY: Spec requires more context for better pattern matching
 */
export interface CodeContext {
	/** Programming language (e.g., "typescript", "rust", "python") */
	language: string;
	/** Absolute file path (e.g., "/Users/brett/project/src/file.ts") */
	currentFile: string;
	/** Cursor position for precise context */
	cursorPosition: {
		line: number;
		character: number;
	};
	/** Surrounding code (50 lines before/after cursor) */
	surroundingCode: string;
}

/**
 * Request: Extension → Desktop - Capture voice with code context
 *
 * DESIGN DECISION: Include full code context in request
 * WHY: Desktop app needs context for pattern matching
 *
 * REASONING CHAIN:
 * 1. User presses ` (backtick) or ~ (tilde) in VS Code
 * 2. Extension extracts code context (language, file, cursor, code)
 * 3. Extension sends CaptureVoiceRequest to desktop
 * 4. Desktop starts voice capture with context awareness
 * 5. Desktop returns CaptureVoiceResponse with transcription + pattern match
 */
export interface CaptureVoiceRequest extends BaseMessage {
	type: 'captureVoice';
	context: CodeContext;
}

/**
 * Pattern match result from desktop pattern matching engine
 */
export interface PatternMatch {
	/** Pattern ID from pattern library */
	id: string;
	/** Human-readable pattern name */
	name: string;
	/** Chain of Thought reasoning for why pattern matched */
	reasoning: string;
	/** Confidence score (0.0 - 1.0) */
	confidence: number;
}

/**
 * Response: Desktop → Extension - Voice capture result
 *
 * DESIGN DECISION: Include transcription, confidence, and pattern match
 * WHY: Extension shows all context to user for informed decision
 *
 * REASONING CHAIN:
 * 1. Desktop captures voice via microphone
 * 2. Desktop transcribes via Whisper.cpp (local)
 * 3. Desktop matches transcription against pattern library
 * 4. Desktop returns: text + confidence + matched pattern
 * 5. Extension shows result to user (insert or send to AI)
 */
export interface CaptureVoiceResponse extends BaseMessage {
	type: 'captureVoiceResponse';
	/** Whether voice capture succeeded */
	success: boolean;
	/** Transcribed text from voice */
	text: string;
	/** Overall confidence score (0.0 - 1.0) */
	confidence: number;
	/** Matched pattern (if confidence >85%) */
	pattern?: PatternMatch;
	/** Error message (if success = false) */
	error?: string;
	/** Error code for structured error handling */
	errorCode?: ErrorCode;
}

/**
 * Status update: Desktop → Extension - Real-time voice capture status
 *
 * DESIGN DECISION: Separate status messages from request/response
 * WHY: Status updates flow independently, multiple updates per request
 *
 * REASONING CHAIN:
 * 1. Desktop sends "listening" status (microphone active)
 * 2. Desktop sends "transcribing" status (audio → text)
 * 3. Desktop sends "matching" status (text → patterns)
 * 4. Desktop sends final response (CaptureVoiceResponse)
 * 5. Extension shows real-time progress to user
 */
export interface VoiceStatus extends BaseMessage {
	type: 'voiceStatus';
	/** Current voice capture status */
	status: 'listening' | 'transcribing' | 'matching' | 'complete' | 'error';
	/** Optional status message for user display */
	message?: string;
	/** Request ID this status update belongs to */
	requestId: string;
}

/**
 * Error codes for structured error handling
 *
 * DESIGN DECISION: Enum for error codes, not magic strings
 * WHY: Type safety, easier error handling, internationalization-ready
 */
export enum ErrorCode {
	/** Microphone access denied */
	MICROPHONE_DENIED = 'MICROPHONE_DENIED',
	/** Microphone not found */
	MICROPHONE_NOT_FOUND = 'MICROPHONE_NOT_FOUND',
	/** Transcription failed */
	TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
	/** Pattern matching failed */
	PATTERN_MATCHING_FAILED = 'PATTERN_MATCHING_FAILED',
	/** Request timeout */
	TIMEOUT = 'TIMEOUT',
	/** Desktop app not running */
	DESKTOP_NOT_RUNNING = 'DESKTOP_NOT_RUNNING',
	/** WebSocket connection error */
	CONNECTION_ERROR = 'CONNECTION_ERROR',
	/** Invalid message format */
	INVALID_MESSAGE = 'INVALID_MESSAGE',
	/** Unknown error */
	UNKNOWN = 'UNKNOWN'
}

/**
 * Context Update: Desktop → Extension - System context changes (git, file, docs, voice)
 *
 * DESIGN DECISION: Unified context update message for all system changes
 * WHY: Desktop app broadcasts context changes, extension updates UI in real-time
 *
 * REASONING CHAIN:
 * 1. Desktop app monitors system state (git, file system, voice recording)
 * 2. State changes trigger ContextUpdate broadcast via IPC
 * 3. Extension receives update → updates UI accordingly
 * 4. Voice recording state → updates Voice panel UI
 * 5. Git changes → updates status bar (future)
 *
 * PATTERN: Pattern-IPC-003 (Bidirectional Voice State)
 */
export interface ContextUpdate extends BaseMessage {
	type: 'contextUpdate';
	/** Type of context update */
	updateType: 'VoiceRecording' | 'GitChanged' | 'FileChanged' | 'DocChanged';
	/** Recording state (only present if updateType = 'VoiceRecording') */
	recordingState?: {
		/** Current recording state */
		state: 'Idle' | 'Recording' | 'Transcribing' | 'Complete';
		/** Timestamp when recording started (ISO 8601 UTC, only for Recording state) */
		startedAt?: string;
		/** Transcribed text (only for Complete state) */
		transcript?: string;
		/** Recording duration in milliseconds (only for Complete state) */
		durationMs?: number;
	};
}

/**
 * Focus Voice Panel: Desktop → Extension - Command to show/focus Voice panel
 *
 * DESIGN DECISION: Separate message type for UI commands
 * WHY: Backtick (`) hotkey should focus Voice panel, tilde (~) shouldn't
 *
 * REASONING CHAIN:
 * 1. User presses backtick (`) → desktop sends FocusVoicePanel message
 * 2. Extension receives message → shows Voice panel webview
 * 3. Extension focuses the "Command Transcript Input" field
 * 4. User can immediately type or speak
 * 5. Tilde (~) doesn't send this message → no focus change
 *
 * PATTERN: Pattern-IPC-004 (Hotkey-Triggered IPC Messages)
 */
export interface FocusVoicePanel extends BaseMessage {
	type: 'focusVoicePanel';
}

/**
 * Union type of all possible messages
 *
 * DESIGN DECISION: Discriminated union for type narrowing
 * WHY: TypeScript can narrow types based on 'type' field
 */
export type IPCMessage = CaptureVoiceRequest | CaptureVoiceResponse | VoiceStatus | ContextUpdate | FocusVoicePanel;

/**
 * Type guard: Check if message is CaptureVoiceRequest
 */
export function isCaptureVoiceRequest(msg: IPCMessage): msg is CaptureVoiceRequest {
	return msg.type === 'captureVoice';
}

/**
 * Type guard: Check if message is CaptureVoiceResponse
 */
export function isCaptureVoiceResponse(msg: IPCMessage): msg is CaptureVoiceResponse {
	return msg.type === 'captureVoiceResponse';
}

/**
 * Type guard: Check if message is VoiceStatus
 */
export function isVoiceStatus(msg: IPCMessage): msg is VoiceStatus {
	return msg.type === 'voiceStatus';
}

/**
 * Type guard: Check if message is ContextUpdate
 */
export function isContextUpdate(msg: IPCMessage): msg is ContextUpdate {
	return msg.type === 'contextUpdate';
}

/**
 * Type guard: Check if message is FocusVoicePanel
 */
export function isFocusVoicePanel(msg: IPCMessage): msg is FocusVoicePanel {
	return msg.type === 'focusVoicePanel';
}

/**
 * Generate unique message ID (UUID v4)
 *
 * DESIGN DECISION: UUID v4 for message IDs
 * WHY: Globally unique, no collision risk, standard format
 *
 * FUTURE: Use crypto.randomUUID() when available in all environments
 */
export function generateMessageId(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
