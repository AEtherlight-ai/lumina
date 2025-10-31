/**
 * Skill Detector Service
 *
 * Analyzes user intent and automatically suggests/adds appropriate skills
 * to their prompts. This creates a natural flow where users describe what
 * they want and the system enhances it with the right skill commands.
 *
 * Chain of Thought:
 * 1. User types natural language intent (e.g., "set up this project")
 * 2. Skill detector analyzes keywords and patterns
 * 3. Matches intent to available skills
 * 4. Returns enhanced prompt with skill command
 * 5. User sees and can modify before sending
 *
 * PATTERN: Pattern-SKILL-DETECT-001 (Intent-based Skill Matching)
 */

export interface SkillMatch {
    skillName: string;
    confidence: number;
    enhancedPrompt: string;
}

export class SkillDetector {
    /**
     * Skill patterns for intent matching
     * Each skill has keywords and phrases that indicate user wants that functionality
     */
    private skillPatterns = {
        'initialize': {
            keywords: [
                'set up', 'setup', 'initialize', 'init',
                'configure', 'start new', 'create project',
                'add aetherlight', 'add ætherlight',
                'claude.md', 'project structure',
                'get started', 'begin', 'bootstrap'
            ],
            description: 'Set up ÆtherLight in your project'
        },
        'sprint-plan': {
            keywords: [
                'sprint', 'plan', 'planning', 'agile',
                'tasks', 'epic', 'story', 'stories',
                'iteration', 'milestone', 'roadmap',
                'organize work', 'break down', 'schedule'
            ],
            description: 'Plan a development sprint'
        },
        'code-analyze': {
            keywords: [
                'analyze', 'analysis', 'review', 'audit',
                'check code', 'find issues', 'find bugs',
                'code quality', 'technical debt', 'problems',
                'security', 'performance', 'optimize',
                'refactor', 'improve', 'scan'
            ],
            description: 'Analyze your codebase'
        },
        'publish': {
            keywords: [
                'publish', 'release', 'deploy', 'ship',
                'version', 'npm', 'package', 'distribution',
                'push to production', 'go live', 'launch'
            ],
            description: 'Publish a new release'
        }
    };

    /**
     * Detects which skill best matches the user's intent
     */
    public detectSkill(userIntent: string): SkillMatch | null {
        const intentLower = userIntent.toLowerCase();
        const matches: SkillMatch[] = [];

        // Check each skill's patterns
        for (const [skillName, pattern] of Object.entries(this.skillPatterns)) {
            let matchCount = 0;

            // Count keyword matches
            for (const keyword of pattern.keywords) {
                if (intentLower.includes(keyword)) {
                    matchCount++;
                }
            }

            // Calculate confidence (0-1)
            if (matchCount > 0) {
                const confidence = Math.min(matchCount / 3, 1); // 3 matches = 100% confidence
                matches.push({
                    skillName,
                    confidence,
                    enhancedPrompt: this.enhanceWithSkill(userIntent, skillName)
                });
            }
        }

        // Return best match (highest confidence)
        if (matches.length > 0) {
            matches.sort((a, b) => b.confidence - a.confidence);
            return matches[0];
        }

        return null;
    }

    /**
     * Enhances user prompt with appropriate skill command
     */
    private enhanceWithSkill(userIntent: string, skillName: string): string {
        // Special handling for each skill to create natural enhanced prompts
        switch (skillName) {
            case 'initialize':
                return `/initialize

${userIntent}

Please set up ÆtherLight with:
- Proper Git workflow and branching strategy
- Sprint management structure
- Pattern library templates
- VS Code integration
- Handle any existing CLAUDE.md files by merging`;

            case 'sprint-plan':
                return `/sprint-plan

${userIntent}

Create sprint structure with:
- Git branches for features
- Task dependencies and validation
- TOML sprint definition
- Proper workflow enforcement`;

            case 'code-analyze':
                return `/code-analyze

${userIntent}

Focus the analysis on:
- Code quality and technical debt
- Security vulnerabilities
- Performance bottlenecks
- Generate actionable report`;

            case 'publish':
                // Try to detect version type from intent
                let versionType = 'patch';
                if (userIntent.includes('major') || userIntent.includes('breaking')) {
                    versionType = 'major';
                } else if (userIntent.includes('minor') || userIntent.includes('feature')) {
                    versionType = 'minor';
                }

                return `/publish ${versionType}

${userIntent}

Follow proper release workflow:
- Ensure on master branch
- Run all pre-publish checks
- Create GitHub release first
- Then publish to npm`;

            default:
                return `/${skillName}\n\n${userIntent}`;
        }
    }

    /**
     * Suggests skills based on partial input (for autocomplete)
     */
    public suggestSkills(partialInput: string): string[] {
        const inputLower = partialInput.toLowerCase();
        const suggestions: string[] = [];

        for (const [skillName, pattern] of Object.entries(this.skillPatterns)) {
            // Check if any keyword starts with the partial input
            const hasMatch = pattern.keywords.some(keyword =>
                keyword.startsWith(inputLower) || inputLower.includes(keyword)
            );

            if (hasMatch) {
                suggestions.push(`/${skillName} - ${pattern.description}`);
            }
        }

        return suggestions;
    }

    /**
     * Checks if a prompt already contains a skill command
     */
    public hasSkillCommand(prompt: string): boolean {
        const skillCommands = ['/initialize', '/sprint-plan', '/code-analyze', '/publish'];
        return skillCommands.some(cmd => prompt.includes(cmd));
    }

    /**
     * Extracts skill command from a prompt if present
     */
    public extractSkillCommand(prompt: string): string | null {
        const match = prompt.match(/^\/([a-z-]+)/);
        return match ? match[1] : null;
    }
}