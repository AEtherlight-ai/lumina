/**
 * IPC Client - WebSocket communication with Lumina desktop app
 *
 * DESIGN DECISION: Message ID correlation with pending request tracking
 * WHY: Multiple requests in-flight, async responses, real-time status updates
 *
 * REASONING CHAIN:
 * 1. VS Code extension cannot directly access OS APIs (sandboxed)
 * 2. Lumina desktop app (Tauri) has full OS access
 * 3. WebSocket enables bidirectional real-time communication
 * 4. Message IDs correlate requests with responses (no race conditions)
 * 5. Status updates flow independently via callbacks
 *
 * PATTERN: Pattern-IPC-001 (WebSocket-based IPC protocol)
 * RELATED: extension.ts (creates client), captureVoice.ts (uses client), protocol.ts (types)
 * FUTURE: Add reconnection logic, heartbeat keepalive, message queuing
 *
 * @module ipc/client
 */

import WebSocket from 'ws';
import {
	IPCMessage,
	CaptureVoiceRequest,
	CaptureVoiceResponse,
	VoiceStatus,
	ContextUpdate,
	FocusVoicePanel,
	isCaptureVoiceResponse,
	isVoiceStatus,
	isContextUpdate,
	isFocusVoicePanel,
	generateMessageId,
	ErrorCode,
	CodeContext
} from './protocol';

/**
 * Callback for voice status updates
 */
export type StatusCallback = (status: VoiceStatus) => void;

/**
 * Callback for context updates (voice recording state, git changes, etc.)
 */
export type ContextUpdateCallback = (update: ContextUpdate) => void;

/**
 * Callback for focus panel command (triggered by backtick hotkey)
 *
 * DESIGN DECISION: Separate callback for UI commands vs data updates
 * WHY: FocusVoicePanel is a command (action), not a state update (data)
 *
 * PATTERN: Pattern-IPC-004 (Hotkey-Triggered IPC Messages)
 */
export type FocusPanelCallback = () => void;

/**
 * Pending request tracking for request/response correlation
 *
 * DESIGN DECISION: Map of message ID → resolve/reject callbacks
 * WHY: Multiple requests can be in-flight, need to route responses correctly
 */
interface PendingRequest {
	resolve: (response: CaptureVoiceResponse) => void;
	reject: (error: Error) => void;
	timeout: NodeJS.Timeout;
	statusCallback?: StatusCallback;
}

/**
 * IPCClient - Manages WebSocket connection to Lumina desktop
 *
 * DESIGN DECISION: Lazy connection with message ID correlation + broadcast callbacks
 * WHY: Extension activates even if desktop not running, async responses handled correctly
 */
export class IPCClient {
	private ws: WebSocket | null = null;
	private url: string;
	private connected: boolean = false;
	private pendingRequests: Map<string, PendingRequest> = new Map();
	private contextUpdateCallback: ContextUpdateCallback | null = null;
	private focusPanelCallback: FocusPanelCallback | null = null;

	/**
	 * DESIGN DECISION: Store URL without immediate connection
	 * WHY: Lazy connection pattern (connect on first use)
	 *
	 * @param url - WebSocket URL (e.g., ws://localhost:43215)
	 */
	constructor(url: string) {
		this.url = url;
		console.log(`IPCClient created for ${url} (not connected yet)`);
	}

	/**
	 * Connect to Lumina desktop WebSocket server
	 *
	 * DESIGN DECISION: Manual connect method, not constructor
	 * WHY: Allows async connection, error handling, reconnection
	 *
	 * REASONING CHAIN:
	 * 1. Create WebSocket instance
	 * 2. Register event handlers (open, error, close, message)
	 * 3. Return promise that resolves on successful connection
	 * 4. Route incoming messages by type (response, status)
	 * 5. Future: Add auto-reconnect logic here
	 *
	 * FUTURE: Exponential backoff for reconnection attempts
	 *
	 * @returns Promise that resolves when connected
	 */
	public connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
				console.log('Already connected to Lumina desktop');
				resolve();
				return;
			}

			console.log(`Connecting to Lumina desktop at ${this.url}...`);
			this.ws = new WebSocket(this.url);

			this.ws.on('open', () => {
				console.log('Connected to Lumina desktop');
				this.connected = true;
				resolve();
			});

			this.ws.on('error', (error) => {
				// DEBUG-001: Downgrade to console.log (debug level) since desktop app not running is expected
				// Extension handles this gracefully in extension.ts with user-friendly warnings
				console.log('[DEBUG] WebSocket connection error:', error.message);
				this.connected = false;
				reject(new Error(`Failed to connect to Lumina desktop: ${error.message}`));
			});

			this.ws.on('close', () => {
				console.log('Disconnected from Lumina desktop');
				this.connected = false;
				// Reject all pending requests
				this.pendingRequests.forEach((pending, id) => {
					clearTimeout(pending.timeout);
					pending.reject(new Error('Connection closed'));
				});
				this.pendingRequests.clear();
			});

			/**
			 * Handle incoming messages from desktop
			 *
			 * DESIGN DECISION: Route by message type (response vs status vs context update)
			 * WHY: Responses resolve pending requests, status/context updates call callbacks
			 *
			 * REASONING CHAIN:
			 * 1. Parse incoming JSON message
			 * 2. Check message type via type guards
			 * 3. If response: lookup pending request by ID, resolve
			 * 4. If status: lookup pending request, call status callback
			 * 5. If context update: call context update callback (broadcast)
			 * 6. Unknown messages logged for debugging
			 */
			this.ws.on('message', (data) => {
				try {
					const message: IPCMessage = JSON.parse(data.toString());
					console.log('Received message from desktop:', message);

					if (isCaptureVoiceResponse(message)) {
						// Response: resolve pending request
						const pending = this.pendingRequests.get(message.id);
						if (pending) {
							clearTimeout(pending.timeout);
							this.pendingRequests.delete(message.id);
							pending.resolve(message);
						} else {
							console.warn(`Received response for unknown request ID: ${message.id}`);
						}
					} else if (isVoiceStatus(message)) {
						// Status update: call status callback
						const pending = this.pendingRequests.get(message.requestId);
						if (pending?.statusCallback) {
							pending.statusCallback(message);
						}
					} else if (isContextUpdate(message)) {
						// Context update: call callback (broadcast to all listeners)
						if (this.contextUpdateCallback) {
							this.contextUpdateCallback(message);
						}
					} else if (isFocusVoicePanel(message)) {
						// Focus panel command: show and focus Voice panel
						console.log('Received FocusVoicePanel command from desktop (backtick pressed)');
						if (this.focusPanelCallback) {
							this.focusPanelCallback();
						} else {
							console.warn('FocusVoicePanel received but no callback registered');
						}
					} else {
						console.warn('Received unknown message type:', message);
					}
				} catch (error) {
					console.error('Failed to parse message from desktop:', error);
				}
			});
		});
	}

	/**
	 * Send voice capture request to Lumina desktop
	 *
	 * DESIGN DECISION: Message ID correlation with timeout and status callbacks
	 * WHY: Multiple requests in-flight, async responses, real-time status updates
	 *
	 * REASONING CHAIN:
	 * 1. Check if connected (lazy connect if needed)
	 * 2. Generate unique message ID for request
	 * 3. Create pending request with resolve/reject/timeout
	 * 4. Send request via WebSocket
	 * 5. Wait for response (routed by message handler)
	 * 6. Status callbacks invoked as updates arrive
	 *
	 * @param context - Code context from VS Code editor
	 * @param statusCallback - Optional callback for status updates
	 * @returns Promise that resolves with desktop response
	 */
	public async sendCaptureVoice(
		context: CodeContext,
		statusCallback?: StatusCallback
	): Promise<CaptureVoiceResponse> {
		// Ensure connected
		if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) {
			await this.connect();
		}

		return new Promise((resolve, reject) => {
			if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
				reject(new Error('Not connected to Lumina desktop'));
				return;
			}

			// Generate unique message ID
			const messageId = generateMessageId();

			// Create request message
			const request: CaptureVoiceRequest = {
				id: messageId,
				type: 'captureVoice',
				context
			};

			// Create timeout (30 seconds)
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(messageId);
				reject(new Error('Timeout waiting for response from desktop'));
			}, 30000);

			// Track pending request
			this.pendingRequests.set(messageId, {
				resolve,
				reject,
				timeout,
				statusCallback
			});

			// Send request
			this.ws.send(JSON.stringify(request));
			console.log(`Sent capture voice request (ID: ${messageId})`);
		});
	}

	/**
	 * Check if client is connected to desktop
	 *
	 * @returns true if WebSocket connection is open
	 */
	public isConnected(): boolean {
		return this.connected && this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Register callback for context updates (voice recording, git changes, etc.)
	 *
	 * DESIGN DECISION: Single callback for all context updates
	 * WHY: Simpler API, extension can route updates internally by updateType
	 *
	 * REASONING CHAIN:
	 * 1. Desktop app broadcasts context updates via IPC
	 * 2. Extension registers callback once (at startup)
	 * 3. Callback receives all update types (VoiceRecording, GitChanged, etc.)
	 * 4. Extension routes to appropriate UI components (Voice panel, status bar)
	 * 5. Result: Real-time UI updates without polling
	 *
	 * PATTERN: Pattern-IPC-003 (Bidirectional Voice State)
	 *
	 * @param callback - Function to call when context updates arrive
	 */
	public onContextUpdate(callback: ContextUpdateCallback): void {
		this.contextUpdateCallback = callback;
		console.log('Context update callback registered');
	}

	/**
	 * Register callback for focus panel command (triggered by backtick hotkey)
	 *
	 * DESIGN DECISION: Separate callback for UI commands vs state updates
	 * WHY: FocusVoicePanel is a command (action), not a state update (data)
	 *
	 * REASONING CHAIN:
	 * 1. User presses backtick (`) in any application
	 * 2. Desktop app sends FocusVoicePanel IPC message to extension
	 * 3. Extension callback shows Voice panel webview
	 * 4. Extension focuses "Command Transcript Input" field
	 * 5. User can immediately type or speak in panel
	 * 6. Tilde (~) doesn't trigger this - just records without focus change
	 *
	 * PATTERN: Pattern-IPC-004 (Hotkey-Triggered IPC Messages)
	 *
	 * @param callback - Function to call when focus panel command arrives
	 */
	public onFocusPanel(callback: FocusPanelCallback): void {
		this.focusPanelCallback = callback;
		console.log('Focus panel callback registered');
	}

	/**
	 * Disconnect from Lumina desktop
	 *
	 * DESIGN DECISION: Graceful disconnect with pending request cleanup
	 * WHY: Prevent resource leaks, reject pending requests with clear error
	 */
	public disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
			this.connected = false;

			// Reject all pending requests
			this.pendingRequests.forEach((pending) => {
				clearTimeout(pending.timeout);
				pending.reject(new Error('Disconnected'));
			});
			this.pendingRequests.clear();

			console.log('Disconnected from Lumina desktop');
		}
	}
}
