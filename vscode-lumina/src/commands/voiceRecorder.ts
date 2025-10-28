/**
 * Voice Recorder using VS Code Webview - DEPRECATED in v0.9.0
 *
 * @deprecated This approach does not work in VS Code extensions
 *
 * DEPRECATION REASON: VS Code webviews have Permissions-Policy that blocks microphone access
 * ERROR: "[Violation] Permissions policy violation: microphone is not allowed in this document"
 *
 * NEW APPROACH: Desktop app with native microphone access via IPC (Tauri)
 * - No webview = no permission restrictions
 * - Native OS microphone API (PortAudio via Tauri)
 * - 100% reliable recording
 *
 * This file is kept for reference only but should not be used.
 *
 * See: Desktop app in products/lumina-desktop/ (replacement)
 * See: src/ipc/client.ts (IPC communication)
 *
 * @module commands/voiceRecorder
 */

import * as vscode from 'vscode';

/**
 * Create webview-based voice recorder
 *
 * @param context - Extension context
 * @param onTranscription - Callback for each transcription chunk
 * @returns Promise<string> - Full transcribed text
 */
export async function recordVoiceWithWebview(
    context: vscode.ExtensionContext,
    onTranscription?: (chunk: string) => void
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        // Create webview panel (smaller, bottom left position)
        const panel = vscode.window.createWebviewPanel(
            'aetherlightVoiceRecorder',
            '🎤 Recording',
            {
                viewColumn: vscode.ViewColumn.One, // Use column 1 (left side)
                preserveFocus: false // Give focus to webview
            },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableForms: true // Required for microphone access
            }
        );

        const transcriptions: string[] = [];
        let isRecording = false;

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'recordingStarted':
                        isRecording = true;
                        vscode.window.showInformationMessage('🎤 Recording started... Speak now!');
                        break;

                    case 'audioChunk':
                        // Receive audio chunk from webview (base64 encoded)
                        try {
                            const audioBlob = Buffer.from(message.data, 'base64');
                            const transcription = await transcribeAudio(audioBlob);

                            if (transcription.trim()) {
                                transcriptions.push(transcription);

                                // Call callback with new chunk
                                if (onTranscription) {
                                    onTranscription(transcription);
                                }

                                // Send transcription back to webview to display
                                panel.webview.postMessage({
                                    type: 'transcriptionChunk',
                                    text: transcription,
                                    fullText: transcriptions.join(' ')
                                });
                            }
                        } catch (error) {
                            console.error('[ÆtherLight] Transcription error:', error);
                        }
                        break;

                    case 'recordingStopped':
                        isRecording = false;
                        const fullTranscription = transcriptions.join(' ').trim();

                        if (fullTranscription) {
                            resolve(fullTranscription);
                        } else {
                            reject(new Error('No speech detected'));
                        }

                        // Close webview
                        panel.dispose();
                        break;

                    case 'error':
                        reject(new Error(message.message));
                        panel.dispose();
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Set webview HTML content
        panel.webview.html = getWebviewContent();

        // Handle webview disposal (user closed panel)
        panel.onDidDispose(() => {
            if (isRecording) {
                reject(new Error('Recording cancelled'));
            }
        });
    });
}

/**
 * Transcribe audio buffer using OpenAI Whisper API
 */
async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const config = vscode.workspace.getConfiguration('aetherlight');
    const apiKey = config.get<string>('openai.apiKey');

    if (!apiKey) {
        throw new Error('OpenAI API key not configured');
    }

    // Create form data for Whisper API
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');

    // Use node-fetch for API call
    const fetch = require('node-fetch');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${error}`);
    }

    const result = await response.json();
    return result.text || '';
}

/**
 * Generate webview HTML content with audio recording UI
 */
function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voice Recorder</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            margin: 0;
            max-width: 300px;
        }

        #micIcon {
            font-size: 32px;
            margin-bottom: 8px;
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
        }

        #status {
            font-size: 12px;
            margin-bottom: 10px;
            text-align: center;
        }

        #transcription {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px;
            min-height: 40px;
            max-height: 80px;
            overflow-y: auto;
            width: 100%;
            margin-bottom: 10px;
            font-size: 11px;
            line-height: 1.3;
        }

        #transcription.empty {
            color: var(--vscode-input-placeholderForeground);
            font-style: italic;
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            font-size: 11px;
            border-radius: 3px;
            cursor: pointer;
            margin: 3px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .recording {
            color: #f14c4c;
        }
    </style>
</head>
<body>
    <div id="micIcon">🎤</div>
    <div id="status">Click "Start Recording" to begin</div>
    <div id="transcription" class="empty">Transcription will appear here as you speak...</div>

    <div>
        <button id="permissionBtn" onclick="requestPermission()" style="background-color: #f48771; font-weight: bold;">🎤 Allow Microphone Access</button>
        <button id="startBtn" onclick="startRecording()" style="display: none;">Start Recording</button>
        <button id="stopBtn" onclick="stopRecording()" disabled>Stop & Enhance</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let mediaRecorder;
        let audioChunks = [];
        let permissionGranted = false;

        // Check if we already have permission on load, if not auto-request
        (async function checkPermission() {
            try {
                const result = await navigator.permissions.query({ name: 'microphone' });
                if (result.state === 'granted') {
                    // Permission already granted - skip to recording
                    permissionGranted = true;
                    document.getElementById('permissionBtn').style.display = 'none';
                    document.getElementById('startBtn').style.display = 'inline-block';
                    document.getElementById('status').textContent = '✅ Ready! Click "Start Recording"';
                } else {
                    // Permission not granted - auto-request it (no button click needed)
                    document.getElementById('status').textContent = '🔍 Requesting microphone access...';
                    document.getElementById('transcription').innerHTML =
                        '<strong style="color: #f48771;">⚠️ LOOK AT THE TOP OF CURSOR WINDOW</strong><br/><br/>' +
                        'A popup should appear asking:<br/>' +
                        '<em>"Allow this site to access your microphone?"</em><br/><br/>' +
                        '👉 Click <strong>ALLOW</strong> to enable voice recording<br/><br/>' +
                        'Permission is stored and only needed once.';
                    document.getElementById('transcription').classList.remove('empty');

                    // Auto-request permission (no button click needed)
                    requestPermission();
                }
            } catch (e) {
                // Fallback to manual request
                document.getElementById('status').textContent = '👇 Click button below to allow microphone';
            }
        })();

        async function requestPermission() {
            console.log('[ÆtherLight] requestPermission() called');
            try {
                console.log('[ÆtherLight] Updating UI for permission request...');
                document.getElementById('status').textContent = '🔍 Requesting microphone access...';
                document.getElementById('transcription').innerHTML =
                    '<strong style="color: #f48771;">⚠️ LOOK AT THE TOP OF CURSOR WINDOW</strong><br/><br/>' +
                    'A popup should appear asking:<br/>' +
                    '<em>"Allow this site to access your microphone?"</em><br/><br/>' +
                    '👉 Click <strong>ALLOW</strong><br/><br/>' +
                    'If you don\'t see the popup, it may be:<br/>' +
                    '• Hidden behind this panel (check top of window)<br/>' +
                    '• Already blocked (look for 🔇 icon in address bar)';
                document.getElementById('transcription').classList.remove('empty');

                console.log('[ÆtherLight] Calling getUserMedia...');
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('[ÆtherLight] Permission granted!', stream);

                // Permission granted! Update UI
                stream.getTracks().forEach(track => track.stop()); // Stop the test stream
                permissionGranted = true;
                document.getElementById('permissionBtn').style.display = 'none';
                document.getElementById('startBtn').style.display = 'inline-block';
                document.getElementById('status').textContent = '✅ Permission granted! Click "Start Recording"';
                document.getElementById('transcription').textContent = 'Ready to record. Click "Start Recording" to begin.';
                document.getElementById('transcription').classList.remove('empty');

            } catch (error) {
                console.error('[ÆtherLight] Permission error:', error);
                // Show helpful error message in the webview itself
                document.getElementById('status').textContent = '⚠️ Microphone permission denied';
                document.getElementById('status').style.color = '#f48771';
                document.getElementById('transcription').innerHTML =
                    '<strong style="color: #f48771;">❌ Permission Denied</strong><br/><br/>' +
                    'The microphone permission was denied.<br/><br/>' +
                    '<strong>To fix:</strong><br/>' +
                    '1. Look for 🔇 icon near the top of Cursor<br/>' +
                    '2. Click it and select "Allow"<br/>' +
                    '3. Click "Allow Microphone Access" again<br/><br/>' +
                    '<strong>Error details:</strong> ' + error.message;
                document.getElementById('transcription').classList.remove('empty');

                vscode.postMessage({
                    type: 'error',
                    message: 'Microphone access denied: ' + error.message
                });
            }
        }

        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                // Collect chunks every 3 seconds
                mediaRecorder.ondataavailable = async (event) => {
                    if (event.data.size > 0) {
                        // Convert blob to base64 and send to extension
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64 = reader.result.split(',')[1];
                            vscode.postMessage({
                                type: 'audioChunk',
                                data: base64
                            });
                        };
                        reader.readAsDataURL(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    stream.getTracks().forEach(track => track.stop());
                    vscode.postMessage({ type: 'recordingStopped' });
                };

                // Start recording with 3-second chunks
                mediaRecorder.start(3000);

                // Update UI
                document.getElementById('status').textContent = '🔴 Recording... Speak now!';
                document.getElementById('status').className = 'recording';
                document.getElementById('startBtn').disabled = true;
                document.getElementById('stopBtn').disabled = false;
                document.getElementById('transcription').classList.remove('empty');
                document.getElementById('transcription').textContent = 'Listening...';

                vscode.postMessage({ type: 'recordingStarted' });
            } catch (error) {
                // Show helpful error message in the webview itself
                document.getElementById('status').textContent = '⚠️ Microphone error';
                document.getElementById('status').style.color = '#f48771';
                document.getElementById('transcription').innerHTML =
                    '<strong>Allow microphone access:</strong><br/>' +
                    '1. Look for browser popup (top of window)<br/>' +
                    '2. Click "Allow" to grant permission<br/>' +
                    '3. Click "Start Recording" again';
                document.getElementById('transcription').classList.remove('empty');

                vscode.postMessage({
                    type: 'error',
                    message: 'Microphone access denied: ' + error.message
                });
            }
        }

        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                document.getElementById('status').textContent = '⏹️ Recording stopped';
                document.getElementById('status').className = '';
                document.getElementById('stopBtn').disabled = true;
            }
        }

        // Receive transcription chunks from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'transcriptionChunk') {
                document.getElementById('transcription').textContent = message.fullText;
            }
        });

        // DESIGN DECISION: No auto-start - let user click button
        // WHY: Permission popup appears when user clicks (more intuitive)
        // Browser remembers permission after first grant (no repeated prompts)
    </script>
</body>
</html>`;
}
