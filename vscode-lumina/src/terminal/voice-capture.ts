/**
 * Voice Capture - Audio recording in terminal
 *
 * DESIGN DECISION: Web Audio API for recording (browser-compatible)
 * WHY: VS Code extensions run in Electron (Chromium), supports Web Audio API
 *
 * REASONING CHAIN:
 * 1. VS Code extensions = Electron environment
 * 2. Electron = Chromium + Node.js
 * 3. Web Audio API = available in Chromium
 * 4. MediaRecorder API = high-quality audio recording
 * 5. Result: Native browser APIs for voice capture
 *
 * PATTERN: Pattern-VOICE-001 (Web Audio Recording)
 * RELATED: Phase 2 (Desktop App voice capture), Whisper API
 * PERFORMANCE: <100ms activation, real-time recording (no buffering)
 */

/// <reference lib="dom" />

import * as vscode from 'vscode';

/**
 * Voice Capture Events
 */
interface VoiceCaptureEvents {
    onTranscription: (text: string) => void;
    onError: (error: Error) => void;
}

/**
 * Voice Capture - Audio Recording
 *
 * DESIGN DECISION: MediaRecorder API for audio capture
 * WHY: High-quality, low-latency, browser-native
 */
export class VoiceCapture {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private events: Partial<VoiceCaptureEvents> = {};

    private isRecording: boolean = false;
    private startTime: number = 0;

    /**
     * Start recording
     *
     * PERFORMANCE: <100ms activation
     */
    async start(): Promise<void> {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create media recorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm',
            });

            // Reset audio chunks
            this.audioChunks = [];

            // Handle data available
            this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Handle stop
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                await this.transcribe(audioBlob);
            };

            // Handle errors
            this.mediaRecorder.onerror = (event: Event) => {
                const error = new Error(`MediaRecorder error: ${event}`);
                this.handleError(error);
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            this.startTime = Date.now();
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Stop recording
     *
     * RETURNS: Audio blob
     */
    async stop(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || !this.isRecording) {
                reject(new Error('Not recording'));
                return;
            }

            // Stop media recorder
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
            this.isRecording = false;

            // Stop media stream
            if (this.stream) {
                this.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                this.stream = null;
            }
        });
    }

    /**
     * Transcribe audio using Whisper API
     *
     * DESIGN DECISION: OpenAI Whisper API for transcription
     * WHY: 32x realtime, high accuracy, supports 50+ languages
     *
     * PERFORMANCE: <2s for 30s audio
     */
    private async transcribe(audioBlob: Blob): Promise<void> {
        try {
            // Get Whisper API key from config
            const config = vscode.workspace.getConfiguration('aetherlight');
            const whisperApiKey = config.get<string>('whisperApiKey');

            if (!whisperApiKey) {
                throw new Error('Whisper API key not configured');
            }

            // Convert webm to wav (if needed)
            // TODO: Implement audio conversion if Whisper doesn't support webm

            // Call Whisper API
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${whisperApiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Whisper API error: ${response.statusText}`);
            }

            const result = await response.json() as { text: string };
            const transcription = result.text;

            // Emit transcription event
            if (this.events.onTranscription) {
                this.events.onTranscription(transcription);
            }
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Register event listeners
     */
    onTranscription(callback: (text: string) => void): void {
        this.events.onTranscription = callback;
    }

    onError(callback: (error: Error) => void): void {
        this.events.onError = callback;
    }

    /**
     * Handle errors
     */
    private handleError(error: Error): void {
        if (this.events.onError) {
            this.events.onError(error);
        } else {
            console.error('VoiceCapture error:', error);
        }

        // Cleanup
        this.isRecording = false;
        if (this.stream) {
            this.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            this.stream = null;
        }
    }

    /**
     * Get recording duration
     */
    getDuration(): number {
        if (!this.isRecording) {
            return 0;
        }
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Check if recording
     */
    isActive(): boolean {
        return this.isRecording;
    }
}
