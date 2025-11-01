# AI-Powered Sprint Planning Implementation Guide

**Created:** 2025-10-31
**Status:** Ready for Implementation
**Complexity:** High
**Estimated Duration:** 2-3 days

---

## Executive Summary

Transform ÆtherLight's sprint planning from template-based string concatenation to **AI-powered codebase analysis**. This implementation connects the Code Analyzer and Sprint Planner buttons to Claude AI agents that explore the codebase, understand user intent, and generate comprehensive sprint plans with actual context.

**Current State:** Template strings with "docs" and "Pattern-001"
**Target State:** AI agent explores codebase and returns "voicePanel.ts:100-500, Pattern-WEBVIEW-001 (Webview message passing)"

---

## Problem Statement

### Current Architecture (Broken)

```
User → "Sprint Planner" Button
  → PromptEnhancer.generateSprintPlannerPrompt()
  → String template with basic file scan
  → Returns: "## Codebase Context\n**Key Directories**: docs\n**Patterns**: Pattern-001... and 223 more"
  → ❌ Unusable for actual sprint planning
```

### Root Causes

1. **No AI Involvement:** PromptEnhancer uses string templates, not AI analysis
2. **Disconnected Systems:**
   - Code Analyzer exists (`packages/aetherlight-analyzer/`) but isn't invoked
   - Sprint Generator expects analysis results it never receives
3. **Basic File Scanning:**
   - `analyzeWorkspaceStructure()` just lists directories
   - Pattern detection is regex matching, not semantic analysis
4. **No Codebase Exploration:**
   - Doesn't read relevant files (voicePanel.ts, terminalManager.ts)
   - Doesn't understand current vs. desired state
   - Can't provide specific file:line references

---

## Solution: AI Agent-Powered Sprint Planning

### Architecture Overview

```
User Intent → AI Agent (Claude) → Codebase Exploration → Enhanced Prompt → Sprint Generator
     ↓              ↓                    ↓                      ↓                  ↓
"Fix bugs"    Read files         voicePanel.ts:100        Detailed prompt    TOML sprint
              Search patterns    terminalManager.ts       with context       with tasks
              Understand UI      Pattern-WEBVIEW-001      and file refs      and estimates
```

### Why Option B (AI Agent) is Best

| Aspect | Option A (Static Analyzer) | Option B (AI Agent) | Winner |
|--------|---------------------------|---------------------|--------|
| **Flexibility** | Fixed analyzers (arch, complexity, debt) | Dynamic exploration based on intent | **B** |
| **Context Understanding** | Structured data only | Understands "fix bugs in voice panel" semantically | **B** |
| **File Discovery** | Pre-scan required | Explores on-demand | **B** |
| **Pattern Matching** | Regex pattern names | Reads pattern content, understands applicability | **B** |
| **User Intent** | Ignored (uses templates) | Central to exploration strategy | **B** |
| **Adaptability** | Needs new analyzer for new analysis | Handles any request type | **B** |
| **Output Quality** | Generic sprint structure | Tailored to specific request | **B** |
| **Speed** | Fast (5-10s) | Slower (30-60s) | A |
| **Determinism** | Predictable output | Variable output | A |

**Verdict:** Option B wins 7-2. Speed trade-off is acceptable for dramatically better quality.

---

## Implementation Plan

### Phase 1: Create AI Agent Wrapper (Day 1, 4-6 hours)

#### Step 1.1: Create ClaudeAgent Service

**File:** `vscode-lumina/src/services/ClaudeAgent.ts` (NEW FILE)

```typescript
/**
 * ClaudeAgent - AI-powered codebase analysis and sprint planning
 *
 * DESIGN DECISION: Use Claude API directly instead of CLI
 * WHY: CLI requires external process, API is faster and more integrated
 *
 * REASONING CHAIN:
 * 1. User wants sprint plan for "fix bugs in voice panel"
 * 2. AI agent needs to explore codebase to understand:
 *    - What is the voice panel? (voicePanel.ts)
 *    - What bugs exist? (search for TODO, FIXME, error handling)
 *    - What patterns apply? (read pattern files, not just names)
 * 3. Agent uses Claude Code tools: Read, Grep, Glob, Task
 * 4. Agent generates enhanced prompt with actual context
 * 5. Result: Sprint Generator gets quality input
 *
 * PATTERN: Pattern-AI-AGENT-001 (AI-Powered Code Analysis)
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

export interface AgentOptions {
    subagent_type: 'Explore' | 'Plan' | 'general-purpose';
    thoroughness: 'quick' | 'medium' | 'very thorough';
    allowFileReads: boolean;
    allowCodebaseSearch: boolean;
    maxTokens?: number;
}

export interface AgentResult {
    enhancedPrompt: string;
    filesAnalyzed: string[];
    patternsFound: string[];
    confidence: 'high' | 'medium' | 'low';
    tokensUsed: number;
    durationMs: number;
}

export class ClaudeAgent {
    private anthropic: Anthropic;
    private workspaceRoot: string;

    constructor(private context: vscode.ExtensionContext) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.workspaceRoot = workspaceFolder?.uri.fsPath || '';

        // Get API key from settings
        const config = vscode.workspace.getConfiguration('aetherlight');
        const apiKey = config.get<string>('anthropic.apiKey') ||
                      process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            throw new Error(
                'Anthropic API key not found. Set it in Settings → ÆtherLight → Anthropic API Key'
            );
        }

        this.anthropic = new Anthropic({ apiKey });
    }

    /**
     * Analyze codebase using AI agent
     *
     * @param userIntent - User's natural language request
     * @param options - Agent configuration
     * @returns Enhanced prompt with codebase context
     */
    async analyze(userIntent: string, options: AgentOptions): Promise<AgentResult> {
        const startTime = Date.now();

        // Build agent prompt
        const systemPrompt = this.buildSystemPrompt(options);
        const agentPrompt = this.buildAgentPrompt(userIntent, options);

        console.log('[ÆtherLight ClaudeAgent] 🤖 Invoking AI agent...');
        console.log(`[ÆtherLight ClaudeAgent]    Type: ${options.subagent_type}`);
        console.log(`[ÆtherLight ClaudeAgent]    Thoroughness: ${options.thoroughness}`);

        try {
            // Invoke Claude API with extended thinking
            const response = await this.anthropic.messages.create({
                model: 'claude-sonnet-4-20250514', // Latest model with extended thinking
                max_tokens: options.maxTokens || 16000,
                temperature: 0.7,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: agentPrompt
                    }
                ],
                // Enable extended thinking for complex analysis
                thinking: {
                    type: 'enabled',
                    budget_tokens: 10000
                }
            });

            // Extract response
            const content = response.content[0];
            const enhancedPrompt = content.type === 'text' ? content.text : '';

            // Parse metadata from response (files analyzed, patterns found)
            const metadata = this.extractMetadata(enhancedPrompt);

            const result: AgentResult = {
                enhancedPrompt,
                filesAnalyzed: metadata.filesAnalyzed,
                patternsFound: metadata.patternsFound,
                confidence: this.calculateConfidence(response),
                tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
                durationMs: Date.now() - startTime
            };

            console.log('[ÆtherLight ClaudeAgent] ✅ Analysis complete');
            console.log(`[ÆtherLight ClaudeAgent]    Files analyzed: ${result.filesAnalyzed.length}`);
            console.log(`[ÆtherLight ClaudeAgent]    Patterns found: ${result.patternsFound.length}`);
            console.log(`[ÆtherLight ClaudeAgent]    Tokens used: ${result.tokensUsed}`);
            console.log(`[ÆtherLight ClaudeAgent]    Duration: ${result.durationMs}ms`);

            return result;

        } catch (error) {
            console.error('[ÆtherLight ClaudeAgent] ❌ Analysis failed:', error);
            throw new Error(`AI agent failed: ${error.message}`);
        }
    }

    /**
     * Build system prompt for AI agent
     */
    private buildSystemPrompt(options: AgentOptions): string {
        return `You are an expert code analysis agent for ÆtherLight, a voice-to-intelligence platform.

Your role: Analyze codebases to generate comprehensive sprint planning prompts.

Capabilities:
- Explore file structure and understand architecture
- Search for relevant code patterns and files
- Read and analyze source files
- Identify patterns, TODOs, FIXMEs, and technical debt
- Understand user intent and translate to specific file:line references

Analysis Level: ${options.thoroughness}
${options.thoroughness === 'quick' ? '- Focus on most relevant files only (1-5 files)' : ''}
${options.thoroughness === 'medium' ? '- Balanced exploration (5-15 files)' : ''}
${options.thoroughness === 'very thorough' ? '- Comprehensive analysis (15+ files)' : ''}

Tools Available:
- File Reading: Read any file in the workspace
- Code Search: Search for keywords, patterns, functions
- Pattern Matching: Find and understand ÆtherLight patterns
- Architecture Detection: Identify project structure

Output Format:
Return a markdown-formatted sprint planning prompt following this EXACT structure:

# Sprint Planning Request

## Goal
[Clean, concise goal extracted from user intent - NO transcription artifacts]

## Screenshots
[List screenshots if mentioned, otherwise state "None provided"]

## Codebase Context
**Primary Files**:
- path/to/file.ts:100-500 (description of what this file does)
- path/to/another.ts:50-200 (description)

**Architecture**: [Pattern detected - e.g., "MVC", "Layered", "Component-based"]

**Languages**: [List of languages found]

**Key Patterns**:
- Pattern-XXX-001: [Pattern name and description - NOT just the ID]
- Pattern-YYY-002: [Pattern name and description]

## Current State Analysis
[What you found in the code - bugs, TODOs, structure, complexity]

## Requirements
[Specific requirements extracted from user intent, backed by code analysis]

## Proposed Changes
**Files to Modify**:
- file.ts:line - [What needs to change]
- another.ts:line - [What needs to change]

## Success Criteria
✅ [Specific, testable criteria]
✅ [Based on actual code findings]
✅ [Measurable outcomes]

CRITICAL RULES:
1. ALWAYS provide actual file paths with line numbers (file.ts:100-200)
2. NEVER return generic placeholders like "docs" or "Pattern-001"
3. Read pattern files to understand content, don't just list IDs
4. Clean up transcription artifacts from user intent (remove "ding, code analyzer" etc.)
5. If screenshots mentioned but not provided, note this explicitly
6. Focus on RELEVANT files only (not every file in the project)
7. Provide specific, actionable context for sprint planning`;
    }

    /**
     * Build agent analysis prompt
     */
    private buildAgentPrompt(userIntent: string, options: AgentOptions): string {
        return `Analyze this codebase to generate a comprehensive sprint planning prompt.

## User Intent (Raw)
${userIntent}

## Workspace Information
- **Root Path**: ${this.workspaceRoot}
- **Project**: ÆtherLight VS Code Extension
- **Tech Stack**: TypeScript, VS Code API, Webviews, IPC

## Your Task

1. **Clean the user intent**:
   - Remove transcription artifacts ("ding", "code analyzer", etc.)
   - Extract the core goal clearly
   - Identify if screenshots were mentioned

2. **Explore the codebase**:
   ${options.thoroughness === 'quick' ? '- Find 1-5 most relevant files' : ''}
   ${options.thoroughness === 'medium' ? '- Explore 5-15 key files' : ''}
   ${options.thoroughness === 'very thorough' ? '- Comprehensive analysis of 15+ files' : ''}
   - Focus on files mentioned or implied by user intent
   - For UI changes: Look for voicePanel.ts, webview files
   - For terminals: Look for terminalManager.ts
   - For patterns: Read actual pattern files in .aetherlight/patterns/

3. **Analyze current state**:
   - What exists now? (current implementation)
   - What bugs/TODOs exist? (search for TODO, FIXME, BUG)
   - What patterns apply? (read pattern content)
   - What complexity/debt exists?

4. **Identify specific changes needed**:
   - Which files need modification? (with line numbers)
   - What functions/classes are affected?
   - What patterns should be applied?

5. **Generate the enhanced prompt**:
   - Follow the exact format from system prompt
   - Include actual file:line references
   - Provide meaningful pattern descriptions
   - Make it actionable for sprint planning

## Example of GOOD Output

\`\`\`markdown
# Sprint Planning Request

## Goal
Reorganize ÆtherLight voice panel UI: remove Voice tab (make permanent), keep only Default and Settings tabs, consolidate terminal display to multi-row layout.

## Screenshots
User mentioned screenshots but did not provide them in the request.

## Codebase Context
**Primary Files**:
- vscode-lumina/src/commands/voicePanel.ts:450-550 (Main voice panel webview setup)
- vscode-lumina/src/commands/voicePanel.ts:1350-1400 (Tab rendering logic)
- vscode-lumina/src/commands/voicePanel.ts:838-870 (Terminal list management)
- vscode-lumina/src/services/TabManager.ts:1-100 (Tab state management)

**Architecture**: Component-based VS Code Extension with Webview UI

**Languages**: TypeScript, HTML (webview templates)

**Key Patterns**:
- Pattern-WEBVIEW-001 (Webview Message Passing): Uses postMessage for extension ↔ webview communication
- Pattern-UI-LAYOUT-002 (Tab Navigation): TabManager handles tab state persistence
- Pattern-TERMINAL-003 (Terminal Lifecycle): Terminal creation and tracking via VS Code API

## Current State Analysis
Found in voicePanel.ts:
- Line 515-536: Tab switching logic handles 6 tabs (Voice, Sprint, Planning, Patterns, Activity, Settings)
- Line 1757-1761: Button handlers for all tab types
- Line 838-870: Terminal list uses vertical layout (one terminal per row)
- TODO at line 869: "Add terminal grouping for better space usage"

## Requirements
1. Remove Voice tab from tab list (keep content always visible at top)
2. Deprecate Planning, Patterns, Activity tabs (comment out, don't delete)
3. Keep only Default and Settings tabs visible
4. Refactor terminal display from vertical list to multi-row grid (5-6 per row)
5. Implement unique naming for ÆtherLight Cloud terminals (Cloud 1, Cloud 2, etc.)

## Proposed Changes
**Files to Modify**:
- voicePanel.ts:515-536 - Update tab switching logic to skip deprecated tabs
- voicePanel.ts:1757-1761 - Comment out Planning/Patterns/Activity button handlers
- voicePanel.ts:838-870 - Refactor terminal list to CSS grid layout
- voicePanel.ts:869-923 - Add terminal counter for unique naming
- TabManager.ts:1-50 - Update active tab validation to only allow Default/Settings

## Success Criteria
✅ Voice panel content always visible at top (no tab for it)
✅ Only Default and Settings tabs shown in tab bar
✅ Planning, Patterns, Activity tabs commented out (not deleted)
✅ Terminals display in multi-row grid (5-6 per row)
✅ ÆtherLight Cloud terminals numbered uniquely (Cloud 1, Cloud 2, etc.)
✅ Extension compiles without errors
✅ All existing functionality preserved
\`\`\`

## Example of BAD Output (What to Avoid)

\`\`\`markdown
# Sprint Planning Request

## Goal
ding, code analyzer, sprint planner, enhancement, send, and clear to where it currently says command slash transcription...

## Codebase Context
**Key Directories**: docs
**Patterns**: Pattern-001, Pattern-002... and 223 more

[❌ This is unusable - no specific files, no context, transcription garbage]
\`\`\`

---

Now analyze the codebase and generate the enhanced sprint planning prompt following the GOOD example format.`;
    }

    /**
     * Extract metadata from enhanced prompt
     */
    private extractMetadata(prompt: string): { filesAnalyzed: string[], patternsFound: string[] } {
        const filesAnalyzed: string[] = [];
        const patternsFound: string[] = [];

        // Extract file paths (look for path/to/file.ts:100-200 pattern)
        const fileMatches = prompt.matchAll(/([a-zA-Z0-9_\-\/\.]+\.(?:ts|tsx|js|jsx|rs|toml|md))(?::(\d+))?(?:-(\d+))?/g);
        for (const match of fileMatches) {
            filesAnalyzed.push(match[1]);
        }

        // Extract pattern references (look for Pattern-XXX-001 pattern)
        const patternMatches = prompt.matchAll(/Pattern-([A-Z0-9]+-\d+)/g);
        for (const match of patternMatches) {
            patternsFound.push(`Pattern-${match[1]}`);
        }

        return {
            filesAnalyzed: [...new Set(filesAnalyzed)],
            patternsFound: [...new Set(patternsFound)]
        };
    }

    /**
     * Calculate confidence based on response quality
     */
    private calculateConfidence(response: Anthropic.Message): 'high' | 'medium' | 'low' {
        const content = response.content[0];
        const text = content.type === 'text' ? content.text : '';

        // High confidence indicators
        const hasFileReferences = /[a-zA-Z0-9_\-\/\.]+\.(?:ts|tsx|js|jsx):\d+/.test(text);
        const hasSpecificPatterns = /Pattern-[A-Z]+-\d+:/.test(text);
        const hasDetailedAnalysis = text.length > 2000;
        const noPlaceholders = !text.includes('...') && !text.includes('[TODO]');

        const score = [
            hasFileReferences,
            hasSpecificPatterns,
            hasDetailedAnalysis,
            noPlaceholders
        ].filter(Boolean).length;

        if (score >= 3) return 'high';
        if (score >= 2) return 'medium';
        return 'low';
    }
}
```

#### Step 1.2: Add Anthropic SDK Dependency

**File:** `vscode-lumina/package.json`

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    // ... existing dependencies
  }
}
```

**Run:**
```bash
cd vscode-lumina
npm install @anthropic-ai/sdk
```

#### Step 1.3: Add API Key Configuration

**File:** `vscode-lumina/package.json` (configuration contribution)

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "aetherlight.anthropic.apiKey": {
          "type": "string",
          "default": "",
          "description": "Anthropic API key for AI-powered sprint planning (get from https://console.anthropic.com)",
          "order": 10
        }
      }
    }
  }
}
```

---

### Phase 2: Integrate AI Agent with Sprint Planner (Day 2, 6-8 hours)

#### Step 2.1: Update PromptEnhancer to Use AI Agent

**File:** `vscode-lumina/src/services/PromptEnhancer.ts:485`

**Replace the entire `generateSprintPlannerPrompt` method:**

```typescript
/**
 * Generate Sprint Planner prompt using AI agent
 *
 * DESIGN DECISION: Use AI agent instead of template strings
 * WHY: AI can explore codebase, understand intent, and provide specific context
 *
 * REASONING CHAIN:
 * 1. User enters intent: "Fix bugs in voice panel UI"
 * 2. Old approach: String template with "docs" and "Pattern-001"
 * 3. New approach: AI agent explores voicePanel.ts, finds bugs, identifies patterns
 * 4. Result: Prompt with "voicePanel.ts:100-500", "Pattern-WEBVIEW-001 (message passing)"
 * 5. Sprint Generator gets actionable context
 *
 * PATTERN: Pattern-AI-PLANNING-001 (AI-Powered Sprint Planning)
 * RELATED: ClaudeAgent.ts, generateCodeAnalyzerPrompt
 */
private async generateSprintPlannerPrompt(context: EnhancementContext): Promise<string> {
    console.log('[ÆtherLight PromptEnhancer] 🤖 Using AI agent for sprint planning...');

    try {
        // Import AI agent
        const { ClaudeAgent } = await import('./ClaudeAgent');

        // Initialize agent
        const agent = new ClaudeAgent(this.context);

        // Determine thoroughness based on complexity
        const complexity = this.assessComplexity(context.userIntent);
        const thoroughness = complexity === 'complex' ? 'very thorough' :
                           complexity === 'medium' ? 'medium' : 'quick';

        console.log(`[ÆtherLight PromptEnhancer] Analysis level: ${thoroughness}`);

        // Run AI agent analysis
        const result = await agent.analyze(context.userIntent, {
            subagent_type: 'Plan',
            thoroughness,
            allowFileReads: true,
            allowCodebaseSearch: true,
            maxTokens: 16000
        });

        // Log results
        console.log('[ÆtherLight PromptEnhancer] ✅ AI analysis complete');
        console.log(`[ÆtherLight PromptEnhancer]    Files analyzed: ${result.filesAnalyzed.length}`);
        console.log(`[ÆtherLight PromptEnhancer]    Patterns found: ${result.patternsFound.length}`);
        console.log(`[ÆtherLight PromptEnhancer]    Confidence: ${result.confidence}`);
        console.log(`[ÆtherLight PromptEnhancer]    Tokens: ${result.tokensUsed}`);
        console.log(`[ÆtherLight PromptEnhancer]    Duration: ${(result.durationMs / 1000).toFixed(1)}s`);

        // Return enhanced prompt
        return result.enhancedPrompt;

    } catch (error) {
        console.error('[ÆtherLight PromptEnhancer] ❌ AI agent failed:', error);

        // Fallback to template-based approach
        console.warn('[ÆtherLight PromptEnhancer] ⚠️ Falling back to template-based prompt');
        return this.generateSprintPlannerPromptFallback(context);
    }
}

/**
 * Fallback: Template-based sprint planning prompt
 * Used when AI agent fails (no API key, network error, etc.)
 */
private async generateSprintPlannerPromptFallback(context: EnhancementContext): Promise<string> {
    // This is the EXISTING implementation (lines 485-516)
    // Keep it as fallback for when AI agent is unavailable
    const sections = [];
    sections.push(`# Sprint Planning Request\n`);
    sections.push(`## Goal\n${context.userIntent}\n`);
    sections.push(`## Codebase Context`);

    if (context.workspaceStructure.mainLanguages.length > 0) {
        sections.push(`**Languages**: ${context.workspaceStructure.mainLanguages.join(', ')}`);
    }

    sections.push(`\n⚠️ **Using fallback mode** - Install Anthropic API key for AI-powered analysis\n`);

    // ... rest of existing template code ...

    return sections.join('\n');
}
```

#### Step 2.2: Update Code Analyzer to Use AI Agent

**File:** `vscode-lumina/src/services/PromptEnhancer.ts:416`

**Replace `generateCodeAnalyzerPrompt` method:**

```typescript
/**
 * Generate Code Analyzer prompt using AI agent
 *
 * DESIGN DECISION: Same AI-powered approach as sprint planner
 * WHY: Code analysis benefits from AI exploration even more than sprint planning
 */
private async generateCodeAnalyzerPrompt(context: EnhancementContext): Promise<string> {
    console.log('[ÆtherLight PromptEnhancer] 🤖 Using AI agent for code analysis...');

    try {
        const { ClaudeAgent } = await import('./ClaudeAgent');
        const agent = new ClaudeAgent(this.context);

        // Code analysis should be thorough by default
        const result = await agent.analyze(context.userIntent, {
            subagent_type: 'Explore',
            thoroughness: 'very thorough',
            allowFileReads: true,
            allowCodebaseSearch: true,
            maxTokens: 16000
        });

        console.log('[ÆtherLight PromptEnhancer] ✅ Code analysis complete');
        console.log(`[ÆtherLight PromptEnhancer]    Files: ${result.filesAnalyzed.length}`);
        console.log(`[ÆtherLight PromptEnhancer]    Confidence: ${result.confidence}`);

        return result.enhancedPrompt;

    } catch (error) {
        console.error('[ÆtherLight PromptEnhancer] ❌ AI agent failed:', error);
        return this.generateCodeAnalyzerPromptFallback(context);
    }
}

/**
 * Fallback for code analyzer (template-based)
 */
private async generateCodeAnalyzerPromptFallback(context: EnhancementContext): Promise<string> {
    // Existing implementation (lines 416-445)
    const sections = [];
    sections.push(`# Code Analysis Request\n`);
    sections.push(`## Intent\n${context.userIntent}\n`);
    sections.push(`## Codebase Context`);
    // ... rest of existing code ...
    sections.push(`\n⚠️ **Using fallback mode** - Install Anthropic API key for AI-powered analysis\n`);
    return sections.join('\n');
}
```

#### Step 2.3: Add Progress Feedback to UI

**File:** `vscode-lumina/src/commands/voicePanel.ts:1493-1511`

**Update the sprint planner button handler to show progress:**

```typescript
// Show enhancement status with AI-specific messaging
const statusDiv = document.getElementById('enhancementStatus');
if (statusDiv) {
    statusDiv.innerHTML = `
        <div class="enhancement-progress">
            <div class="spinner"></div>
            <div class="status-text">
                <strong>🤖 AI Agent Analyzing Codebase...</strong>
                <p>Exploring files, patterns, and architecture</p>
                <p class="status-detail">This may take 30-60 seconds</p>
            </div>
        </div>
    `;
    statusDiv.style.display = 'flex';
}
```

#### Step 2.4: Handle AI Agent Results

**File:** `vscode-lumina/src/commands/voicePanel.ts` (in `_handleMessage` method)

**Update the 'enhancePrompt' message handler:**

```typescript
case 'enhancePrompt':
    try {
        const enhancedResult = await this.promptEnhancer.enhancePrompt(
            message.userIntent,
            message.promptType
        );

        // Log AI agent statistics if available
        if (enhancedResult.metadata?.tokensUsed) {
            console.log(`[ÆtherLight] AI Agent Statistics:`);
            console.log(`  - Tokens: ${enhancedResult.metadata.tokensUsed}`);
            console.log(`  - Files: ${enhancedResult.metadata.filesAnalyzed?.length || 0}`);
            console.log(`  - Duration: ${enhancedResult.metadata.durationMs}ms`);
        }

        // Send enhanced prompt back to webview
        webview.postMessage({
            type: 'enhancedPrompt',
            prompt: enhancedResult.prompt,
            confidence: enhancedResult.confidence,
            warnings: enhancedResult.warnings,
            metadata: {
                filesAnalyzed: enhancedResult.metadata?.filesAnalyzed || [],
                patternsFound: enhancedResult.metadata?.patternsFound || [],
                aiPowered: true
            }
        });

        vscode.window.showInformationMessage(
            `✅ AI analysis complete! Analyzed ${enhancedResult.metadata?.filesAnalyzed?.length || 0} files`
        );

    } catch (error) {
        console.error('[ÆtherLight] Enhancement failed:', error);

        vscode.window.showErrorMessage(
            error.message.includes('API key')
                ? '🔑 Anthropic API key required. Set it in Settings → ÆtherLight'
                : `❌ Enhancement failed: ${error.message}`
        );

        webview.postMessage({
            type: 'enhancementError',
            error: error.message
        });
    }
    break;
```

---

### Phase 3: Update PromptEnhancer Types (Day 2, 1 hour)

#### Step 3.1: Update EnhancementResult Interface

**File:** `vscode-lumina/src/services/PromptEnhancer.ts` (top of file)

```typescript
export interface EnhancementResult {
    prompt: string;
    context: EnhancementContext;
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
    metadata?: {
        filesAnalyzed?: string[];
        patternsFound?: string[];
        tokensUsed?: number;
        durationMs?: number;
        aiPowered?: boolean;
    };
}
```

#### Step 3.2: Update enhancePrompt Return Type

**File:** `vscode-lumina/src/services/PromptEnhancer.ts:75`

```typescript
async enhancePrompt(userIntent: string, promptType: string = 'general'): Promise<EnhancementResult> {
    // ... existing code ...

    // When AI agent is used, include metadata
    if (result && result.filesAnalyzed) {
        return {
            prompt,
            context,
            confidence,
            warnings,
            metadata: {
                filesAnalyzed: result.filesAnalyzed,
                patternsFound: result.patternsFound,
                tokensUsed: result.tokensUsed,
                durationMs: result.durationMs,
                aiPowered: true
            }
        };
    }

    // Fallback (no AI agent)
    return {
        prompt,
        context,
        confidence,
        warnings,
        metadata: {
            aiPowered: false
        }
    };
}
```

---

### Phase 4: Testing & Validation (Day 3, 4-6 hours)

#### Step 4.1: Manual Testing Checklist

**Test Case 1: API Key Not Set**
1. Don't set API key
2. Click "Sprint Planner"
3. Enter intent: "Fix bugs in voice panel"
4. Click "Enhance"
5. **Expected:** Error message "🔑 Anthropic API key required"
6. **Expected:** Falls back to template-based prompt

**Test Case 2: Simple Request (Quick Analysis)**
1. Set API key in settings
2. Click "Sprint Planner"
3. Enter intent: "Add logging to voicePanel.ts"
4. Click "Enhance"
5. **Expected:** Analysis completes in 10-20 seconds
6. **Expected:** Finds voicePanel.ts with specific line numbers
7. **Expected:** No transcription artifacts in goal

**Test Case 3: Complex Request (Thorough Analysis)**
1. Click "Sprint Planner"
2. Enter intent from your example (the garbled one)
3. Click "Enhance"
4. **Expected:** Analysis takes 30-60 seconds
5. **Expected:** Prompt includes:
   - Clean goal (no "ding, code analyzer" garbage)
   - Actual files: voicePanel.ts:X-Y, terminalManager.ts:X-Y
   - Patterns with descriptions (not just IDs)
   - Current state analysis
   - Specific files to modify with line numbers
6. **Expected:** Success message with file count

**Test Case 4: Network Error**
1. Disconnect internet
2. Click "Sprint Planner"
3. Enter intent
4. Click "Enhance"
5. **Expected:** Error message
6. **Expected:** Falls back to template-based prompt

**Test Case 5: Code Analyzer Button**
1. Click "Code Analyzer"
2. Enter: "Find all TODO comments in voice panel"
3. Click "Enhance"
4. **Expected:** AI finds voicePanel.ts
5. **Expected:** Lists TODO comments with line numbers

#### Step 4.2: Validation Criteria

**Quality Metrics:**
- ✅ No transcription artifacts in output ("ding, code analyzer" removed)
- ✅ All file references include line numbers (file.ts:100-200)
- ✅ Patterns include descriptions, not just IDs
- ✅ Goal is clean and concise (1-2 sentences)
- ✅ Current state analysis backed by actual code findings
- ✅ Success criteria are specific and measurable

**Performance Metrics:**
- ✅ Quick analysis: < 20 seconds
- ✅ Medium analysis: 20-40 seconds
- ✅ Thorough analysis: 40-60 seconds
- ✅ Token usage: < 20,000 tokens per request
- ✅ API cost: < $0.50 per request (at Claude Sonnet rates)

**Reliability Metrics:**
- ✅ Graceful fallback when API key missing
- ✅ Graceful fallback on network errors
- ✅ Helpful error messages for common failures
- ✅ Progress feedback during long-running analysis

---

### Phase 5: Documentation & User Guidance (Day 3, 2 hours)

#### Step 5.1: Update CLAUDE.md

**File:** `.claude/CLAUDE.md`

**Add new section:**

```markdown
## AI-Powered Sprint Planning

**Status:** IMPLEMENTED (v0.16.0+)

### Overview

ÆtherLight now uses Claude AI to analyze your codebase and generate sprint plans. This provides:
- Actual file:line references instead of generic directories
- Pattern descriptions instead of just IDs
- Cleaned user intent (no transcription artifacts)
- Current state analysis backed by code findings
- Specific, actionable recommendations

### Setup

1. **Get Anthropic API Key:**
   - Visit https://console.anthropic.com
   - Create account / log in
   - Go to API Keys section
   - Create new key
   - Copy key

2. **Configure ÆtherLight:**
   - Open VS Code Settings (Ctrl+,)
   - Search for "aetherlight"
   - Find "Anthropic API Key"
   - Paste your key
   - Save

3. **Verify Setup:**
   - Click "Sprint Planner" button in ÆtherLight Voice panel
   - Enter any intent
   - Click "✨ Enhance & Generate Prompt"
   - Should see "🤖 AI Agent Analyzing Codebase..."
   - Should complete without "API key required" error

### Usage

**Sprint Planning:**
1. Click "Sprint Planner" button
2. Enter your intent (e.g., "Fix bugs in voice panel UI")
3. Click "Enhance & Generate Prompt"
4. Wait 30-60 seconds for AI analysis
5. Review enhanced prompt with actual context
6. Click "Send to Sprint Generator"

**Code Analysis:**
1. Click "Code Analyzer" button
2. Enter analysis request (e.g., "Find all TODO comments")
3. Click "Enhance & Generate Prompt"
4. AI explores codebase and finds relevant files
5. Review analysis results

### How It Works

```
User Intent → AI Agent → Codebase Exploration → Enhanced Prompt
     ↓            ↓               ↓                     ↓
"Fix bugs"   Reads files    voicePanel.ts:100    Detailed context
             Searches       Pattern-WEBVIEW-001   with file refs
             Analyzes       Current bugs found    and line numbers
```

**AI Agent Capabilities:**
- Reads source files
- Searches for keywords, patterns, TODOs
- Understands architecture (MVC, Layered, etc.)
- Identifies relevant patterns and reads their content
- Cleans transcription artifacts
- Generates specific file:line references

### Cost Estimation

Using Claude Sonnet 4:
- Quick analysis (1-5 files): $0.10 - $0.20 per request
- Medium analysis (5-15 files): $0.20 - $0.40 per request
- Thorough analysis (15+ files): $0.40 - $0.60 per request

**Budget-Friendly Tips:**
- Start with "Quick" analysis for simple requests
- Use "Thorough" only for complex sprint planning
- Review API usage in Anthropic Console
- Set spending limits in Anthropic Console

### Fallback Mode

If AI agent fails (no API key, network error):
- Extension automatically falls back to template-based prompts
- You'll see: "⚠️ Using fallback mode"
- Prompts will be less detailed but still functional
- No functionality is lost

### Troubleshooting

**"API key required" error:**
- Solution: Set API key in Settings → ÆtherLight → Anthropic API Key

**"AI agent failed: rate limit" error:**
- Solution: Wait a few minutes, try again
- Solution: Reduce analysis thoroughness

**Analysis takes too long (>2 minutes):**
- Solution: Reduce complexity of request
- Solution: Be more specific in intent
- Solution: Use Quick analysis instead of Thorough

**Poor quality results:**
- Solution: Be more specific in user intent
- Solution: Mention specific files/areas you want analyzed
- Solution: Use Thorough analysis for complex requests
```

#### Step 5.2: Create User Guide

**File:** `.aetherlight/internals/AI_SPRINT_PLANNING_USER_GUIDE.md`

```markdown
# AI-Powered Sprint Planning - User Guide

## Quick Start

1. **Set API Key** (one-time):
   - Settings → ÆtherLight → Anthropic API Key
   - Get key from https://console.anthropic.com

2. **Use Sprint Planner**:
   - Click "Sprint Planner" button
   - Describe what you want to build
   - Click "Enhance"
   - Wait for AI analysis (~30-60s)
   - Review enhanced prompt
   - Send to Sprint Generator

## Writing Good Intents

**Good Examples:**
- "Reorganize voice panel UI to remove Voice tab and consolidate terminals"
- "Fix terminal naming bug where ÆtherLight Cloud terminals have duplicate names"
- "Add keyboard shortcut for starting voice recording"

**Bad Examples:**
- "Fix it" (too vague)
- "ding code analyzer sprint planner" (transcription artifacts)
- "Make it better" (no specific goal)

**Tips:**
- Be specific about what you want
- Mention files/components if you know them
- Describe current problem and desired state
- Keep it focused (one sprint = one goal)

## Understanding Results

**What You'll See:**

```markdown
# Sprint Planning Request

## Goal
[Clean, specific goal - no transcription errors]

## Codebase Context
**Primary Files**:
- actual/path/to/file.ts:100-500 (what this file does)

**Key Patterns**:
- Pattern-XXX-001: Full description of pattern
```

**Quality Indicators:**
- ✅ Actual file paths with line numbers
- ✅ Pattern descriptions (not just IDs)
- ✅ Current state analysis with code findings
- ✅ Specific files to modify

**Red Flags:**
- ❌ Generic directories ("docs", "src")
- ❌ Pattern IDs without descriptions ("Pattern-001")
- ❌ Transcription artifacts in goal
- ❌ No specific file references

## Cost Management

**Free Tier:** Anthropic provides free credits for new accounts

**Paid Usage:**
- Each sprint planning request: $0.20 - $0.60
- Each code analysis request: $0.10 - $0.40
- Average: ~$0.30 per request

**Budget Tips:**
- Use Quick analysis for simple requests
- Save Thorough for complex sprint planning
- Review API usage monthly
- Set spending alerts in Anthropic Console

## Troubleshooting

See main CLAUDE.md for troubleshooting guide.
```

---

## Success Criteria

### Implementation Success
- ✅ ClaudeAgent service created and working
- ✅ Anthropic SDK integrated
- ✅ PromptEnhancer uses AI agent for sprint planning
- ✅ PromptEnhancer uses AI agent for code analysis
- ✅ Graceful fallback to templates when AI unavailable
- ✅ Progress feedback during analysis
- ✅ Error handling for common failures

### Output Quality Success
- ✅ No transcription artifacts in prompts
- ✅ All file references include line numbers
- ✅ Patterns include descriptions
- ✅ Current state backed by code findings
- ✅ Specific, actionable recommendations

### User Experience Success
- ✅ Clear progress feedback ("AI Agent Analyzing...")
- ✅ Helpful error messages
- ✅ Analysis completes in reasonable time (< 60s)
- ✅ Easy API key configuration
- ✅ Clear documentation

### Performance Success
- ✅ Quick analysis: < 20 seconds
- ✅ Thorough analysis: < 60 seconds
- ✅ Token usage: < 20,000 tokens per request
- ✅ Cost per request: < $0.50

---

## Rollout Plan

### Week 1: Development
- Day 1: Create ClaudeAgent service
- Day 2: Integrate with PromptEnhancer
- Day 3: Testing and validation

### Week 2: Beta Testing
- Internal testing with 5-10 sprint plans
- Gather feedback on quality
- Adjust prompts based on results

### Week 3: Release
- Publish v0.16.0 with AI-powered sprint planning
- Update documentation
- Announce feature to users

---

## Maintenance Plan

### Monitoring
- Track API usage and costs monthly
- Monitor token usage per request
- Track analysis duration metrics
- Collect user feedback on quality

### Optimization Opportunities
- Cache analysis results for similar intents
- Fine-tune system prompts based on results
- Add user preferences for analysis depth
- Implement smart thoroughness detection

### Future Enhancements
- Add support for Claude Opus (higher quality)
- Add support for Claude Haiku (lower cost)
- Implement analysis result caching
- Add user feedback loop ("Was this helpful?")
- Generate sprint TOML directly from AI (skip intermediate prompt)

---

## Related Files

**New Files:**
- `vscode-lumina/src/services/ClaudeAgent.ts` (Main AI agent service)
- `.aetherlight/internals/AI_SPRINT_PLANNING_USER_GUIDE.md` (User documentation)

**Modified Files:**
- `vscode-lumina/src/services/PromptEnhancer.ts` (Use AI agent)
- `vscode-lumina/src/commands/voicePanel.ts` (UI updates, error handling)
- `vscode-lumina/package.json` (Add Anthropic SDK, API key config)
- `.claude/CLAUDE.md` (Documentation)

**Referenced Files:**
- `packages/aetherlight-analyzer/src/generators/sprint-generator.ts` (Sprint TOML generation)
- `packages/aetherlight-analyzer/src/analyzers/*` (For future Option A integration)

---

## Notes for Implementation

### Critical Decisions Made

1. **AI Agent vs Static Analyzer:**
   - Chose AI agent (Option B) for flexibility and quality
   - Keep static analyzers for future use (hybrid approach)

2. **API vs CLI:**
   - Chose direct API integration over CLI
   - Faster, more integrated, better error handling

3. **Fallback Strategy:**
   - Keep template-based prompts as fallback
   - No functionality lost when AI unavailable

4. **Cost Management:**
   - Expose thoroughness setting to users
   - Default to "medium" (balanced cost/quality)
   - Document costs transparently

### Known Limitations

1. **Requires API Key:**
   - Users must create Anthropic account
   - Free tier available but limited
   - Document clearly in setup

2. **Analysis Time:**
   - 30-60 seconds for thorough analysis
   - Longer than template approach (instant)
   - Acceptable trade-off for quality

3. **Token Costs:**
   - Each request costs $0.20-$0.60
   - Can add up for heavy users
   - Provide cost estimates upfront

4. **Network Dependency:**
   - Requires internet connection
   - Fails gracefully to templates
   - Clear error messages

### Future Considerations

1. **Caching:**
   - Cache analysis results for similar intents
   - Significant cost savings for repeated requests
   - Implement in v0.17.0

2. **Hybrid Approach:**
   - Use static analyzers for initial scan
   - Use AI agent for interpretation
   - Best of both worlds

3. **Local Models:**
   - Consider llama.cpp for offline analysis
   - Lower quality but zero cost
   - Research in v0.18.0

4. **User Feedback Loop:**
   - "Was this helpful?" after analysis
   - Use feedback to improve prompts
   - Build quality metrics

---

**End of Implementation Guide**

This guide provides everything needed to implement AI-powered sprint planning in ÆtherLight. Follow the phases sequentially, test thoroughly, and document as you go. The result will be dramatically better sprint planning with actual codebase context instead of template strings.
