# Lumina IPC Protocol Documentation

**DESIGN DECISION:** WebSocket-based IPC protocol for VS Code ↔ Desktop communication
**WHY:** Real-time bidirectional messaging, <5ms latency, event-driven status updates
**VERSION:** 1.0.0
**CREATED:** 2025-10-04

---

## Overview

The Lumina IPC (Inter-Process Communication) protocol enables real-time communication between:
- **VS Code Extension** (client) - Captures code context, displays results
- **Desktop App** (server) - Handles voice capture, transcription, pattern matching

### Key Features

- **Message ID Correlation** - UUID v4 for request/response matching
- **Status Updates** - Real-time progress (listening → transcribing → matching)
- **Type Safety** - TypeScript discriminated unions for message routing
- **Error Handling** - Structured error codes (MICROPHONE_DENIED, TIMEOUT, etc.)
- **Performance** - <5ms target latency for IPC overhead

---

## Transport Layer

**Protocol:** WebSocket
**URL:** `ws://localhost:43215`
**Format:** JSON messages
**Encoding:** UTF-8

### Connection Flow

```
1. Desktop app starts → WebSocket server on localhost:43215
2. VS Code extension activates → IPC client created (not connected yet)
3. User presses F13 → Client connects lazily (on first use)
4. Client sends CaptureVoiceRequest → Desktop starts voice capture
5. Desktop sends VoiceStatus updates → Client shows progress
6. Desktop sends CaptureVoiceResponse → Client displays result
```

**DESIGN DECISION:** Lazy connection pattern
**WHY:** Extension activates even if desktop app not running

---

## Message Types

All messages extend `BaseMessage`:

```typescript
interface BaseMessage {
  id: string;      // UUID v4 for correlation
  type: string;    // Message type discriminator
}
```

### 1. CaptureVoiceRequest (Extension → Desktop)

**Purpose:** Initiate voice capture with code context

```typescript
interface CaptureVoiceRequest extends BaseMessage {
  type: 'captureVoice';
  context: CodeContext;
}

interface CodeContext {
  language: string;           // "typescript", "rust", "python"
  currentFile: string;        // Absolute path: "/Users/brett/project/src/file.ts"
  cursorPosition: {
    line: number;             // Zero-indexed line number
    character: number;        // Zero-indexed character offset
  };
  surroundingCode: string;    // 50 lines before/after cursor (100 lines total)
}
```

**Example:**

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "type": "captureVoice",
  "context": {
    "language": "typescript",
    "currentFile": "/Users/brett/project/src/extension.ts",
    "cursorPosition": { "line": 42, "character": 10 },
    "surroundingCode": "function activate(context: vscode.ExtensionContext) {\n  // cursor here\n}"
  }
}
```

---

### 2. VoiceStatus (Desktop → Extension)

**Purpose:** Real-time status updates during voice capture

```typescript
interface VoiceStatus extends BaseMessage {
  type: 'voiceStatus';
  status: 'listening' | 'transcribing' | 'matching' | 'complete' | 'error';
  message?: string;       // Optional human-readable message
  requestId: string;      // Original request ID (for correlation)
}
```

**Flow:**

```
1. Desktop sends: { status: 'listening', message: 'Microphone active...' }
2. Desktop sends: { status: 'transcribing', message: 'Converting speech to text...' }
3. Desktop sends: { status: 'matching', message: 'Finding patterns...' }
4. Desktop sends CaptureVoiceResponse (final result)
```

**Example:**

```json
{
  "id": "status-uuid-1",
  "type": "voiceStatus",
  "status": "listening",
  "message": "Listening for voice input...",
  "requestId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
}
```

**DESIGN DECISION:** Separate status messages from request/response
**WHY:** Multiple status updates per request, independent flow

---

### 3. CaptureVoiceResponse (Desktop → Extension)

**Purpose:** Final voice capture result with transcription + pattern match

```typescript
interface CaptureVoiceResponse extends BaseMessage {
  type: 'captureVoiceResponse';
  success: boolean;
  text: string;              // Transcribed text from voice
  confidence: number;        // Overall confidence (0.0 - 1.0)
  pattern?: PatternMatch;    // Matched pattern (if confidence >85%)
  error?: string;            // Error message (if success = false)
  errorCode?: ErrorCode;     // Structured error code
}

interface PatternMatch {
  id: string;                // "Pattern-TS-042"
  name: string;              // "Error Handling Best Practices"
  reasoning: string;         // Chain of Thought explanation
  confidence: number;        // Pattern match confidence (0.0 - 1.0)
}

enum ErrorCode {
  MICROPHONE_DENIED = 'MICROPHONE_DENIED',
  MICROPHONE_NOT_FOUND = 'MICROPHONE_NOT_FOUND',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  PATTERN_MATCHING_FAILED = 'PATTERN_MATCHING_FAILED',
  TIMEOUT = 'TIMEOUT',
  DESKTOP_NOT_RUNNING = 'DESKTOP_NOT_RUNNING',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  UNKNOWN = 'UNKNOWN'
}
```

**Success Example:**

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "type": "captureVoiceResponse",
  "success": true,
  "text": "add error handling to function",
  "confidence": 0.92,
  "pattern": {
    "id": "Pattern-TS-042",
    "name": "Error Handling Best Practices",
    "reasoning": "Detected try-catch pattern request in TypeScript context",
    "confidence": 0.89
  }
}
```

**Error Example:**

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "type": "captureVoiceResponse",
  "success": false,
  "text": "",
  "confidence": 0.0,
  "error": "Microphone access denied by user",
  "errorCode": "MICROPHONE_DENIED"
}
```

---

## Message Correlation

**DESIGN DECISION:** UUID v4 message IDs for request/response matching
**WHY:** Multiple in-flight requests, async responses, no race conditions

### Request/Response Flow

```typescript
// Extension generates UUID
const requestId = generateMessageId(); // "a1b2c3d4-..."

// Extension sends request
client.send({
  id: requestId,
  type: 'captureVoice',
  context: { ... }
});

// Desktop sends status updates (independent)
server.send({
  id: "status-1",
  type: 'voiceStatus',
  status: 'listening',
  requestId: requestId  // Links to original request
});

// Desktop sends response (same ID as request)
server.send({
  id: requestId,        // SAME ID as request
  type: 'captureVoiceResponse',
  success: true,
  text: "..."
});

// Extension matches by ID
const pending = pendingRequests.get(requestId);
pending.resolve(response);
```

**Key Points:**
- Request and response share same message ID
- Status updates have unique IDs but link via `requestId`
- Extension tracks pending requests in `Map<string, PendingRequest>`
- 30-second timeout per request (cleanup on timeout/disconnect)

---

## Type Guards

**DESIGN DECISION:** TypeScript type guards for safe message routing
**WHY:** Discriminated unions enable type narrowing, prevent runtime errors

```typescript
export function isCaptureVoiceRequest(msg: IPCMessage): msg is CaptureVoiceRequest {
  return msg.type === 'captureVoice';
}

export function isCaptureVoiceResponse(msg: IPCMessage): msg is CaptureVoiceResponse {
  return msg.type === 'captureVoiceResponse';
}

export function isVoiceStatus(msg: IPCMessage): msg is VoiceStatus {
  return msg.type === 'voiceStatus';
}
```

**Usage:**

```typescript
ws.on('message', (data) => {
  const message: IPCMessage = JSON.parse(data.toString());

  if (isCaptureVoiceResponse(message)) {
    // TypeScript knows: message is CaptureVoiceResponse
    const pending = pendingRequests.get(message.id);
    pending.resolve(message);
  } else if (isVoiceStatus(message)) {
    // TypeScript knows: message is VoiceStatus
    const pending = pendingRequests.get(message.requestId);
    pending.statusCallback?.(message);
  }
});
```

---

## Error Handling

### Client-Side Errors

**Connection Failures:**
```typescript
try {
  await client.connect();
} catch (error) {
  // Desktop app not running
  vscode.window.showErrorMessage('Lumina: Desktop app not running');
}
```

**Request Timeout:**
```typescript
// 30-second timeout per request
setTimeout(() => {
  pending.reject(new Error('Timeout waiting for response'));
}, 30000);
```

**Connection Close:**
```typescript
ws.on('close', () => {
  // Reject all pending requests
  pendingRequests.forEach((pending) => {
    pending.reject(new Error('Connection closed'));
  });
});
```

### Server-Side Errors

**Structured Error Codes:**
```json
{
  "success": false,
  "error": "Microphone access denied by user",
  "errorCode": "MICROPHONE_DENIED"
}
```

**Error Code Handling:**
```typescript
if (!response.success) {
  switch (response.errorCode) {
    case ErrorCode.MICROPHONE_DENIED:
      // Show permission instructions
      break;
    case ErrorCode.TIMEOUT:
      // Retry or show timeout message
      break;
    default:
      // Generic error handling
  }
}
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| IPC Latency | <5ms (p50) | Request → Response (excluding processing) |
| Connection Startup | <500ms | connect() → 'open' event |
| Message Size | <50KB | JSON.stringify(request).length |
| Status Updates | 3-5 per request | Count VoiceStatus messages |

**DESIGN DECISION:** <5ms IPC latency target
**WHY:** Real-time UX, user presses F13 and sees immediate response

**Measurement:**
```typescript
const startTime = Date.now();
const response = await client.sendCaptureVoice(context);
const endTime = Date.now();
const latency = endTime - startTime;
console.log(`IPC latency: ${latency}ms`);
```

---

## Implementation Notes

### Extension Side (VS Code)

**File:** `vscode-lumina/src/ipc/client.ts`

**Key Features:**
- Lazy connection (connect on first use)
- Pending request tracking (Map of message ID → resolve/reject)
- Status callbacks (real-time updates)
- Timeout handling (30 seconds)
- Disconnect cleanup (reject pending requests)

### Desktop Side (Tauri)

**Future Implementation:**
- WebSocket server on `localhost:43215`
- Receive `CaptureVoiceRequest` → start voice capture
- Send `VoiceStatus` updates during processing
- Send `CaptureVoiceResponse` with final result
- Handle multiple clients (VS Code + other IDEs)

---

## Testing

**Mock Server:** `vscode-lumina/test/mockServer.ts`
**Integration Tests:** `vscode-lumina/test/integration.test.ts`

**Run Tests:**
```bash
cd vscode-lumina
npm test
```

**Test Coverage:**
- ✅ Basic request/response flow
- ✅ Status callback routing
- ✅ Message ID correlation
- ✅ Connection close cleanup
- ✅ Latency measurement
- ⏳ Multiple concurrent requests (future)
- ⏳ Error injection tests (future)

---

## Future Enhancements

### Reconnection Logic
- Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Auto-reconnect on disconnect
- Queue messages while reconnecting

### Heartbeat Keepalive
- Ping/pong every 30 seconds
- Detect stale connections
- Close dead connections

### Message Queuing
- Queue requests while disconnected
- Flush queue on reconnect
- Persist queue to disk (optional)

### Multi-Client Support
- Desktop app tracks multiple IDE clients
- Broadcast status updates to all clients
- Per-client request isolation

---

## References

**Pattern:** Pattern-IPC-001 (WebSocket-based IPC protocol)
**Related Files:**
- `vscode-lumina/src/ipc/protocol.ts` - Type definitions
- `vscode-lumina/src/ipc/client.ts` - WebSocket client
- `vscode-lumina/test/mockServer.ts` - Mock desktop app
- `vscode-lumina/test/integration.test.ts` - Integration tests

**Spec:** PHASE_1_IMPLEMENTATION.md (P1-010)

---

**Created:** 2025-10-04
**Version:** 1.0.0
**Author:** ÆtherLight/Lumina Team
