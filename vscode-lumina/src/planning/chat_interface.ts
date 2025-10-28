/**
 * Planning Chat Interface - VS Code webview for planning agent
 *
 * DESIGN DECISION: Chat-style webview with message history
 * WHY: Familiar chat UI, users comfortable with conversational planning
 *
 * REASONING CHAIN:
 * 1. User opens planning panel (Command Palette)
 * 2. Chat webview loads (side panel)
 * 3. User types: "I want to add OAuth2 authentication"
 * 4. Agent responds: "What database are you using?"
 * 5. User types: "PostgreSQL"
 * 6. Agent generates draft sprint plan
 * 7. User reviews, approves
 * 8. Result: Sprint plan ready for execution
 *
 * PATTERN: Pattern-UI-003 (Conversational Planning Interface)
 * RELATED: AS-018 (Collaborative Planning Agent)
 */

import * as vscode from 'vscode';
import { PlanningAgent, PlanningMessage, PlanningState } from './agent';
import { SprintPlan } from '../sprint_parser/types';

/**
 * Planning chat interface
 */
export class PlanningChatInterface {
    private panel: vscode.WebviewPanel | null = null;
    private agent: PlanningAgent;
    private onPlanReady: ((plan: SprintPlan) => void) | null = null;

    constructor() {
        this.agent = new PlanningAgent();
    }

    /**
     * Show chat panel
     */
    show(context: vscode.ExtensionContext): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'luminaPlanning',
            'Sprint Planning',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        // Set HTML content
        this.panel.webview.html = this.getHtmlContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message),
            undefined,
            context.subscriptions
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = null;
        });
    }

    /**
     * Start planning session
     */
    startSession(initialPrompt: string): void {
        const response = this.agent.start(initialPrompt);

        // Send initial messages to webview
        this.sendToWebview({
            type: 'message',
            message: {
                role: 'user',
                content: initialPrompt,
                timestamp: new Date().toISOString(),
            },
        });

        this.sendToWebview({
            type: 'message',
            message: response,
        });
    }

    /**
     * Set plan ready callback
     */
    onSprintPlanReady(callback: (plan: SprintPlan) => void): void {
        this.onPlanReady = callback;
    }

    /**
     * Handle message from webview
     */
    private handleWebviewMessage(message: any): void {
        switch (message.type) {
            case 'send':
                this.handleUserMessage(message.content);
                break;

            case 'approve':
                this.handleApproval();
                break;

            case 'ready':
                // Webview loaded, send existing conversation
                this.syncConversation();
                break;
        }
    }

    /**
     * Handle user message
     */
    private handleUserMessage(content: string): void {
        // Send to agent
        const response = this.agent.sendMessage(content);

        // Send to webview
        this.sendToWebview({
            type: 'message',
            message: response,
        });

        // Check if plan ready
        if (this.agent.getState() === PlanningState.READY) {
            this.sendToWebview({
                type: 'planReady',
                plan: this.agent.getDraftPlan(),
            });
        }
    }

    /**
     * Handle approval
     */
    private handleApproval(): void {
        const plan = this.agent.toSprintPlan();
        if (plan && this.onPlanReady) {
            this.onPlanReady(plan);
            vscode.window.showInformationMessage('Sprint plan approved! Ready to execute.');
        }
    }

    /**
     * Sync conversation to webview
     */
    private syncConversation(): void {
        const conversation = this.agent.getConversation();
        this.sendToWebview({
            type: 'sync',
            conversation,
        });
    }

    /**
     * Send message to webview
     */
    private sendToWebview(message: any): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    /**
     * Get HTML content for webview
     *
     * DESIGN DECISION: Inline HTML with minimal styling
     * WHY: Simple chat UI, no build step required
     */
    private getHtmlContent(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sprint Planning</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        #messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }

        .message.user {
            background-color: var(--vscode-input-background);
            margin-left: 20%;
        }

        .message.agent {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            margin-right: 20%;
        }

        .message .role {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .message .content {
            white-space: pre-wrap;
        }

        .message .timestamp {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }

        #input-container {
            display: flex;
            padding: 10px;
            background-color: var(--vscode-input-background);
            border-top: 1px solid var(--vscode-panel-border);
        }

        #input {
            flex: 1;
            padding: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
        }

        #send {
            margin-left: 10px;
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }

        #send:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        #approve {
            display: none;
            margin-left: 10px;
            padding: 10px 20px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }

        #approve:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        #approve.visible {
            display: inline-block;
        }
    </style>
</head>
<body>
    <div id="messages"></div>
    <div id="input-container">
        <input type="text" id="input" placeholder="Type your message..." />
        <button id="send">Send</button>
        <button id="approve">Approve Plan</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const inputField = document.getElementById('input');
        const sendButton = document.getElementById('send');
        const approveButton = document.getElementById('approve');

        // Send message
        function sendMessage() {
            const content = inputField.value.trim();
            if (!content) return;

            // Add user message to UI
            addMessage({
                role: 'user',
                content,
                timestamp: new Date().toISOString(),
            });

            // Send to extension
            vscode.postMessage({
                type: 'send',
                content,
            });

            inputField.value = '';
        }

        // Add message to UI
        function addMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + message.role;

            const roleDiv = document.createElement('div');
            roleDiv.className = 'role';
            roleDiv.textContent = message.role === 'user' ? 'You' : 'Planning Agent';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            contentDiv.textContent = message.content;

            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'timestamp';
            const date = new Date(message.timestamp);
            timestampDiv.textContent = date.toLocaleTimeString();

            messageDiv.appendChild(roleDiv);
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(timestampDiv);

            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'message':
                    addMessage(message.message);
                    break;

                case 'sync':
                    // Clear and add all messages
                    messagesDiv.innerHTML = '';
                    message.conversation.forEach(msg => addMessage(msg));
                    break;

                case 'planReady':
                    // Show approve button
                    approveButton.classList.add('visible');
                    break;
            }
        });

        // Event listeners
        sendButton.addEventListener('click', sendMessage);
        inputField.addEventListener('keypress', event => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });

        approveButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'approve' });
        });

        // Notify extension that webview is ready
        vscode.postMessage({ type: 'ready' });
    </script>
</body>
</html>
        `;
    }
}
