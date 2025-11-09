# Welcome to ÆtherLight! 🎯

ÆtherLight is a voice-to-intelligence platform that helps you work faster with:

- **Voice Capture**: Record your thoughts and automatically transcribe them
- **Sprint Management**: Track your work with AI-powered planning
- **Pattern Matching**: Prevent AI hallucinations with verified patterns
- **Self-Configuration**: Automatically detect and configure your project

## Safety First: Backup Your Repository

Before we start analyzing and configuring your project, **please backup your work**.

This walkthrough will:
1. **Analyze your actual project** (detect language, tools, workflows)
2. **Create a configuration file** at `.aetherlight/project-config.json`
3. **Help you set up your first sprint** (optional)

While ÆtherLight is designed to be safe and non-destructive, we recommend:

- ✅ Commit your current work: `git commit -am "Pre-ÆtherLight backup"`
- ✅ Create a backup branch: `git branch backup-$(date +%Y%m%d)`
- ✅ Or backup your entire project folder

## What Happens Next?

This walkthrough will guide you through:

1. **Analyzing Your Project**: We'll scan your workspace and detect:
   - Programming language (TypeScript, JavaScript, Python, Rust, Go, etc.)
   - Package manager (npm, yarn, pnpm, pip, cargo, etc.)
   - Testing framework (Jest, Mocha, pytest, etc.)
   - Version control system (Git)
   - CI/CD setup (GitHub Actions, GitLab CI, etc.)

2. **Filling Gaps Interactively**: For anything we can't detect automatically, we'll ask you simple questions

3. **Reviewing Your Configuration**: You'll see the generated config and can customize it

4. **Setting Up Your First Sprint**: Optional - we'll help you create a sprint to track your work

## Ready?

Click the button below once you've backed up your project.

> **Note**: This is an interactive walkthrough - each step will actually configure YOUR project, not a demo project.
