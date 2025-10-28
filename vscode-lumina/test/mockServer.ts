/**
 * Mock WebSocket Server - Simulates Lumina desktop app for testing
 *
 * DESIGN DECISION: Simulate full IPC protocol flow for integration tests
 * WHY: Need to test VS Code extension without running actual desktop app
 *
 * REASONING CHAIN:
 * 1. VS Code extension connects to ws://localhost:43215
 * 2. Extension sends CaptureVoiceRequest
 * 3. Mock server simulates: listening → transcribing → matching flow
 * 4. Mock server sends VoiceStatus updates (real-time)
 * 5. Mock server sends CaptureVoiceResponse (success or error)
 * 6. Integration test validates: latency <5ms, message correlation, error handling
 *
 * PATTERN: Pattern-IPC-001 (WebSocket-based IPC protocol)
 * RELATED: client.ts (WebSocket client), protocol.ts (message types)
 * FUTURE: Add configurable latency, error injection, multi-client support
 *
 * @module test/mockServer
 */

import { WebSocketServer, WebSocket } from 'ws';
import {
	IPCMessage,
	CaptureVoiceRequest,
	CaptureVoiceResponse,
	VoiceStatus,
	isCaptureVoiceRequest,
	ErrorCode
} from '../src/ipc/protocol';

/**
 * Mock WebSocket Server - Simulates desktop app behavior
 *
 * DESIGN DECISION: Mimic exact desktop app protocol flow
 * WHY: Validates extension works correctly before desktop app exists
 */
export class MockIPCServer {
	private wss: WebSocketServer | null = null;
	private port: number;
	private statusDelay: number;

	/**
	 * DESIGN DECISION: Configurable port and status delay
	 * WHY: Tests can customize behavior, measure latency impact
	 *
	 * @param port - WebSocket server port (default: 43215)
	 * @param statusDelay - Delay between status updates in ms (default: 100ms)
	 */
	constructor(port: number = 43215, statusDelay: number = 100) {
		this.port = port;
		this.statusDelay = statusDelay;
	}

	/**
	 * Start mock WebSocket server
	 *
	 * DESIGN DECISION: Promise-based startup with error handling
	 * WHY: Test can await server ready before running tests
	 *
	 * REASONING CHAIN:
	 * 1. Create WebSocket server on specified port
	 * 2. Register connection handler
	 * 3. Register message handler (route by message type)
	 * 4. Return promise that resolves when server listening
	 * 5. Test code waits for server before connecting client
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.wss = new WebSocketServer({ port: this.port });

				this.wss.on('listening', () => {
					console.log(`Mock IPC server listening on ws://localhost:${this.port}`);
					resolve();
				});

				this.wss.on('error', (error) => {
					console.error('Mock server error:', error);
					reject(error);
				});

				this.wss.on('connection', (ws: WebSocket) => {
					console.log('Client connected to mock server');

					ws.on('message', async (data) => {
						try {
							const message: IPCMessage = JSON.parse(data.toString());
							console.log('Mock server received:', message);

							if (isCaptureVoiceRequest(message)) {
								await this.handleCaptureVoice(ws, message);
							} else {
								console.warn('Mock server: Unknown message type:', message);
							}
						} catch (error) {
							console.error('Mock server failed to parse message:', error);
						}
					});

					ws.on('close', () => {
						console.log('Client disconnected from mock server');
					});
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Handle capture voice request - Simulate full desktop app flow
	 *
	 * DESIGN DECISION: Send status updates THEN final response
	 * WHY: Mimics real desktop app behavior (status callback tests)
	 *
	 * REASONING CHAIN:
	 * 1. Receive CaptureVoiceRequest from client
	 * 2. Send VoiceStatus: "listening" (simulates mic active)
	 * 3. Wait statusDelay (simulate audio capture time)
	 * 4. Send VoiceStatus: "transcribing" (simulates Whisper.cpp)
	 * 5. Wait statusDelay (simulate transcription time)
	 * 6. Send VoiceStatus: "matching" (simulates pattern matching)
	 * 7. Wait statusDelay (simulate pattern search)
	 * 8. Send CaptureVoiceResponse with mock data (success case)
	 * 9. Future: Add error injection for testing error paths
	 *
	 * @param ws - WebSocket connection to client
	 * @param request - CaptureVoiceRequest from client
	 */
	private async handleCaptureVoice(ws: WebSocket, request: CaptureVoiceRequest): Promise<void> {
		// Send status: listening
		const listeningStatus: VoiceStatus = {
			id: `${request.id}-status-1`,
			type: 'voiceStatus',
			status: 'listening',
			message: 'Listening for voice input...',
			requestId: request.id
		};
		ws.send(JSON.stringify(listeningStatus));
		await this.sleep(this.statusDelay);

		// Send status: transcribing
		const transcribingStatus: VoiceStatus = {
			id: `${request.id}-status-2`,
			type: 'voiceStatus',
			status: 'transcribing',
			message: 'Transcribing audio...',
			requestId: request.id
		};
		ws.send(JSON.stringify(transcribingStatus));
		await this.sleep(this.statusDelay);

		// Send status: matching
		const matchingStatus: VoiceStatus = {
			id: `${request.id}-status-3`,
			type: 'voiceStatus',
			status: 'matching',
			message: 'Finding patterns...',
			requestId: request.id
		};
		ws.send(JSON.stringify(matchingStatus));
		await this.sleep(this.statusDelay);

		/**
		 * DESIGN DECISION: Mock response includes realistic test data
		 * WHY: Extension can display pattern info in UI
		 *
		 * Mock data:
		 * - Text: "add error handling to function"
		 * - Confidence: 92% (above 85% threshold)
		 * - Pattern matched: Pattern-TS-042 (Error Handling Best Practices)
		 * - Pattern confidence: 89%
		 */
		const response: CaptureVoiceResponse = {
			id: request.id,
			type: 'captureVoiceResponse',
			success: true,
			text: 'add error handling to function',
			confidence: 0.92,
			pattern: {
				id: 'Pattern-TS-042',
				name: 'Error Handling Best Practices',
				reasoning: 'Detected try-catch pattern request in TypeScript context',
				confidence: 0.89
			}
		};
		ws.send(JSON.stringify(response));
		console.log('Mock server sent response:', response);
	}

	/**
	 * Sleep utility for simulating async delays
	 *
	 * @param ms - Milliseconds to sleep
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Stop mock WebSocket server
	 *
	 * DESIGN DECISION: Graceful shutdown with connection cleanup
	 * WHY: Prevents resource leaks in test suite
	 */
	public stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.wss) {
				this.wss.close(() => {
					console.log('Mock IPC server stopped');
					this.wss = null;
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	/**
	 * Check if server is running
	 *
	 * @returns true if server is active
	 */
	public isRunning(): boolean {
		return this.wss !== null;
	}
}

/**
 * Example usage for manual testing:
 *
 * ```typescript
 * const server = new MockIPCServer(43215, 100);
 * await server.start();
 * // ... run tests ...
 * await server.stop();
 * ```
 */
