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
     * Transcribe audio - BYOK MODEL REMOVED
     *
     * DESIGN DECISION: Remove BYOK (Bring Your Own Key) model - Sprint 4
     * WHY: Monetization requires server-side key management and credit tracking
     *
     * REASONING CHAIN:
     * 1. Old model: Terminal → OpenAI (user's API key) → No monetization
     * 2. New model: Terminal uses Desktop → Server → OpenAI (Brett's key) → Credit tracking
     * 3. Desktop app handles transcription via hotkey (Shift+~ or `)
     * 4. Terminal voice capture deprecated (use desktop app instead)
     *
     * PATTERN: Pattern-MONETIZATION-001 (Server-Side Key Management)
     * RELATED: products/lumina-desktop/src-tauri/src/transcription.rs
     */
    private async transcribe(audioBlob: Blob): Promise<void> {
        const error = new Error(
            'Direct OpenAI transcription removed in Sprint 4. ' +
            'Please use the desktop app hotkey (Shift+~ or `) for voice transcription instead. ' +
            'This enables credit tracking and monetization.'
        );
        this.handleError(error);
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
