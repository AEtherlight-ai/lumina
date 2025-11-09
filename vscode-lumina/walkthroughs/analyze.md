# Analyze Your Project 🔍

Now we'll run ÆtherLight's intelligent detection system on **your actual project**.

## What Will Be Detected?

ÆtherLight will scan your workspace and automatically detect:

### 🗣️ Language & Runtime
- Programming language (TypeScript, JavaScript, Python, Rust, Go, etc.)
- Runtime version (Node.js, Python version, etc.)
- Frameworks (React, Express, FastAPI, etc.)

### 📦 Tools & Package Management
- Package manager (npm, yarn, pnpm, pip, cargo, go mod, etc.)
- Build tools (tsc, webpack, vite, etc.)
- Test frameworks (Jest, Mocha, pytest, cargo test, etc.)
- Linters (ESLint, Pylint, clippy, etc.)
- Formatters (Prettier, Black, rustfmt, etc.)

### 🔄 Workflows & Version Control
- Version control system (Git, Mercurial, etc.)
- CI/CD setup (GitHub Actions, GitLab CI, Circle CI, etc.)
- Pre-commit hooks

### 📁 Project Structure
- Source directory location
- Test directory location
- Build output directory
- Documentation directory

### 🎯 Domain Detection
- Project type (web app, CLI tool, library, mobile app, etc.)
- Key dependencies
- Architecture patterns

## How It Works

The detection system looks for telltale files in your project:

- `package.json`, `tsconfig.json` → TypeScript/Node.js project
- `Cargo.toml` → Rust project
- `requirements.txt`, `pyproject.toml` → Python project
- `.github/workflows/` → GitHub Actions CI/CD
- `.git/` → Git version control
- `jest.config.js` → Jest testing
- And many more...

## What Happens After Detection?

Once detection completes, you'll see a summary of what was found. Then we'll move to the next step where you can:

- **Fill in gaps** for things we couldn't detect
- **Confirm or override** our detections if needed
- **Add custom configuration** specific to your workflow

## Ready to Analyze?

Click the button below to start analyzing your project. This typically takes 1-3 seconds.

> **Note**: This is read-only - we're just scanning files, not modifying anything yet.
