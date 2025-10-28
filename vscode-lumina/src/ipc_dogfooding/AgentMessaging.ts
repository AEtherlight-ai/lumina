/**
 * Agent Messaging Integration - Populate IPC Dogfooding Fields
 *
 * DESIGN DECISION: Extract Chain of Thought and breadcrumbs from agent completion signals
 * WHY: Agents produce structured output (completion JSON), we transform to IPC dogfooding format
 *
 * REASONING CHAIN:
 * 1. Agent completes task → writes completion signal (.complete.json)
 * 2. Project Manager detects completion → reads signal file
 * 3. AgentMessaging extracts: design_decisions → ChainOfThought
 * 4. AgentMessaging extracts: filesChanged → FileCitations
 * 5. PatternRecommender suggests patterns for next agent
 * 6. BreadcrumbManager creates breadcrumb from task summary
 * 7. Result: DogfoodingIPCMessage sent with full context
 *
 * PATTERN: Pattern-IPC-005 (Agent Messaging Integration)
 * RELATED: Phase 4 orchestrator, BreadcrumbManager, PatternRecommender
 * PERFORMANCE: <50ms to populate dogfooding fields
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
    DogfoodingIPCMessage,
    ChainOfThought,
    Breadcrumb,
    PatternReference,
    FileCitation
} from './types';
import { BreadcrumbManager, BreadcrumbUtils } from './BreadcrumbManager';
import { PatternRecommender } from './PatternRecommender';

/**
 * Agent completion signal (from agent context workflow)
 *
 * DESIGN DECISION: Match format from agent-context.md completion signal
 * WHY: Agents already write this format, we parse it
 */
interface AgentCompletionSignal {
    taskId: string;
    agentType: string;
    status: 'success' | 'failure';
    filesChanged: string[];
    designDecisions: string[];
    nextStages: string[];
    timestamp: number;
    errorMessage?: string;
}

/**
 * Agent Messaging - Transform agent signals to IPC dogfooding messages
 *
 * DESIGN DECISION: Stateless transformation (pure functions)
 * WHY: Easy to test, no side effects, composable
 */
export class AgentMessaging {
    constructor(
        private readonly breadcrumbManager: BreadcrumbManager,
        private readonly patternRecommender: PatternRecommender,
        private readonly workspaceRoot: string
    ) {}

    /**
     * Create DogfoodingIPCMessage from agent completion signal
     *
     * PERFORMANCE: <50ms (parse + pattern recommendation + breadcrumb creation)
     *
     * DESIGN DECISION: Populate all 3 dogfooding fields (patterns, CoT, breadcrumbs)
     * WHY: Maximum context sharing between agents
     */
    public async createTaskCompleteMessage(
        signal: AgentCompletionSignal
    ): Promise<DogfoodingIPCMessage> {
        const timestamp = new Date(signal.timestamp).toISOString();

        // Extract Chain of Thought from design decisions
        const chainOfThought = this._extractChainOfThought(signal.designDecisions);

        // Create breadcrumb from task completion
        const breadcrumb = await this._createBreadcrumb(signal);

        // Store breadcrumb for future queries
        await this.breadcrumbManager.addBreadcrumb(breadcrumb);

        // Recommend patterns for next agent
        const recommendedPatterns = await this._recommendPatternsForNextAgent(signal);

        // Build dogfooding IPC message
        const message: DogfoodingIPCMessage = {
            message_type: 'task_complete',
            task_id: signal.taskId,
            agent: signal.agentType,
            timestamp,
            status: signal.status === 'success' ? 'done' : 'failed',
            progress: 1.0,

            // Dogfooding fields
            recommended_patterns: recommendedPatterns,
            chain_of_thought: chainOfThought,
            breadcrumbs: [breadcrumb],

            // Error handling
            error_message: signal.errorMessage,
            next_agent: signal.nextStages[0] // First dependent task
        };

        return message;
    }

    /**
     * Create task_update message with breadcrumb queries
     *
     * DESIGN DECISION: Query recent breadcrumbs for context
     * WHY: Agent can see what other agents did (no context loss)
     */
    public async createTaskUpdateMessage(
        taskId: string,
        agent: string,
        progress: number,
        tags?: string[]
    ): Promise<DogfoodingIPCMessage> {
        // Query recent breadcrumbs (relevant to this task)
        const recentBreadcrumbs = await this.breadcrumbManager.queryBreadcrumbs({
            tags,
            limit: 5
        });

        const message: DogfoodingIPCMessage = {
            message_type: 'task_update',
            task_id: taskId,
            agent,
            timestamp: new Date().toISOString(),
            status: 'running',
            progress,

            // Dogfooding fields
            breadcrumbs: recentBreadcrumbs
        };

        return message;
    }

    /**
     * Create handoff message with pattern recommendations
     *
     * DESIGN DECISION: Recommend patterns for receiving agent
     * WHY: Next agent gets head start with proven patterns
     */
    public async createHandoffMessage(
        fromTask: string,
        toTask: string,
        fromAgent: string,
        toAgent: string,
        taskDescription: string
    ): Promise<DogfoodingIPCMessage> {
        // Recommend patterns for receiving agent
        const recommendations = await this.patternRecommender.recommendPatterns({
            task_description: taskDescription,
            agent_type: toAgent,
            tech_stack: [] // TODO: Extract from project config
        });

        // Query breadcrumbs from sending agent
        const handoffBreadcrumbs = await this.breadcrumbManager.queryBreadcrumbs({
            task_id: fromTask,
            limit: 3
        });

        const message: DogfoodingIPCMessage = {
            message_type: 'handoff',
            task_id: toTask,
            agent: fromAgent,
            timestamp: new Date().toISOString(),

            // Dogfooding fields
            recommended_patterns: recommendations.patterns,
            breadcrumbs: handoffBreadcrumbs,

            next_agent: toAgent
        };

        return message;
    }

    /**
     * Extract Chain of Thought from design decisions
     *
     * DESIGN DECISION: First decision = main decision, rest = reasoning chain
     * WHY: Agent completion signals already structured this way
     */
    private _extractChainOfThought(designDecisions: string[]): ChainOfThought {
        if (designDecisions.length === 0) {
            return {
                design_decision: 'Task completed',
                why: 'No specific design decisions documented',
                reasoning_chain: []
            };
        }

        // First decision is the main one
        const mainDecision = designDecisions[0];

        // Rest are reasoning steps
        const reasoningChain = designDecisions.slice(1);

        // Infer WHY from context (simple heuristic)
        const why = this._inferWhy(mainDecision);

        return {
            design_decision: mainDecision,
            why,
            reasoning_chain: reasoningChain
        };
    }

    /**
     * Infer WHY from design decision (simple heuristic)
     *
     * DESIGN DECISION: Pattern matching on common decision types
     * WHY: Agents don't always explicitly state WHY
     */
    private _inferWhy(decision: string): string {
        const lowerDecision = decision.toLowerCase();

        if (lowerDecision.includes('uuid')) {
            return 'UUIDs prevent ID collisions in distributed systems';
        }
        if (lowerDecision.includes('index') || lowerDecision.includes('indexed')) {
            return 'Indexes improve query performance for frequent lookups';
        }
        if (lowerDecision.includes('transaction')) {
            return 'Transactions ensure atomicity and data consistency';
        }
        if (lowerDecision.includes('cascade')) {
            return 'CASCADE delete maintains referential integrity';
        }
        if (lowerDecision.includes('async') || lowerDecision.includes('await')) {
            return 'Asynchronous operations improve responsiveness';
        }

        // Default fallback
        return 'This approach was chosen for its reliability and maintainability';
    }

    /**
     * Create breadcrumb from agent completion signal
     *
     * PERFORMANCE: <10ms (extract file citations + truncate)
     */
    private async _createBreadcrumb(signal: AgentCompletionSignal): Promise<Breadcrumb> {
        // Extract file citations from filesChanged
        const fileCitations: FileCitation[] = signal.filesChanged.map(filePath => ({
            file_path: filePath,
            description: `Modified by ${signal.agentType}`
        }));

        // Create citation from design decisions
        const citationParts = signal.designDecisions.slice(0, 3); // Top 3 decisions
        const citationText = citationParts.join('. ');
        const citation = BreadcrumbUtils.truncateCitation(citationText, 500);

        // Infer tags from agent type and task
        const tags = this._inferTags(signal);

        return BreadcrumbUtils.createFromTaskCompletion(
            signal.agentType,
            signal.taskId,
            citation,
            fileCitations,
            tags
        );
    }

    /**
     * Infer tags from agent type and task context
     */
    private _inferTags(signal: AgentCompletionSignal): string[] {
        const tags: string[] = [];

        // Agent type tag
        tags.push(signal.agentType.toLowerCase().replace(' agent', ''));

        // Task type tags (from design decisions)
        for (const decision of signal.designDecisions) {
            const lower = decision.toLowerCase();
            if (lower.includes('database') || lower.includes('schema') || lower.includes('migration')) {
                tags.push('database');
            }
            if (lower.includes('api') || lower.includes('endpoint') || lower.includes('route')) {
                tags.push('api');
            }
            if (lower.includes('ui') || lower.includes('component') || lower.includes('react')) {
                tags.push('ui');
            }
            if (lower.includes('test') || lower.includes('testing')) {
                tags.push('test');
            }
            if (lower.includes('auth') || lower.includes('authentication')) {
                tags.push('authentication');
            }
        }

        // Remove duplicates
        return Array.from(new Set(tags));
    }

    /**
     * Recommend patterns for next agent
     *
     * PERFORMANCE: <100ms (pattern recommendation)
     */
    private async _recommendPatternsForNextAgent(
        signal: AgentCompletionSignal
    ): Promise<PatternReference[]> {
        if (signal.nextStages.length === 0) {
            return []; // No next agent
        }

        const nextAgent = signal.nextStages[0];

        // Infer task description from completed task
        const taskDescription = this._inferNextTaskDescription(signal, nextAgent);

        // Query breadcrumbs for context
        const breadcrumbs = await this.breadcrumbManager.getRecentBreadcrumbs(5);

        // Recommend patterns
        const recommendations = await this.patternRecommender.recommendPatterns({
            task_description: taskDescription,
            agent_type: nextAgent,
            breadcrumbs
        });

        return recommendations.patterns;
    }

    /**
     * Infer next task description from completed task context
     */
    private _inferNextTaskDescription(signal: AgentCompletionSignal, nextAgent: string): string {
        // Extract key terms from design decisions
        const keyTerms: string[] = [];
        for (const decision of signal.designDecisions) {
            const words = decision.split(/\s+/);
            // Extract capitalized words or technical terms
            for (const word of words) {
                if (word.length > 3 && (word[0] === word[0].toUpperCase() || word.includes('_'))) {
                    keyTerms.push(word);
                }
            }
        }

        // Build description based on next agent type
        if (nextAgent.toLowerCase().includes('api')) {
            return `Implement API endpoints for ${keyTerms.slice(0, 3).join(', ')}`;
        }
        if (nextAgent.toLowerCase().includes('ui')) {
            return `Create UI components for ${keyTerms.slice(0, 3).join(', ')}`;
        }
        if (nextAgent.toLowerCase().includes('test')) {
            return `Write tests for ${keyTerms.slice(0, 3).join(', ')}`;
        }

        // Default fallback
        return `Implement ${nextAgent} for ${signal.taskId}`;
    }

    /**
     * Read agent completion signal from file
     *
     * DESIGN DECISION: Completion signals stored in .lumina/workflow/
     * WHY: Standardized location for IPC file-based communication
     */
    public static async readCompletionSignal(
        workspaceRoot: string,
        taskId: string
    ): Promise<AgentCompletionSignal> {
        const signalPath = path.join(workspaceRoot, '.lumina', 'workflow', `${taskId}.complete.json`);
        const content = await fs.readFile(signalPath, 'utf-8');
        return JSON.parse(content) as AgentCompletionSignal;
    }
}
