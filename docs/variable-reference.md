# ÆtherLight Variable Reference

**Version:** 1.0.0
**Last Updated:** 2025-01-06
**Related Tasks:** SELF-003A (Phase 2 Foundation)

---

## Overview

This document provides comprehensive documentation for all variables used in ÆtherLight's project configuration system. These variables enable ÆtherLight to work with **any project type** (TypeScript, Rust, Python, Go, etc.) by replacing hardcoded values with configurable templates.

**Purpose:**
- **Variable Resolution:** The `VariableResolver` service replaces `{{VARIABLE_NAME}}` placeholders in agent prompts
- **Project Configuration:** Variables are stored in `.aetherlight/project-config.json`
- **Detection + Interview:** Code Analyzer detects values, InterviewEngine collects missing values from user

**Categories:** 10 categories, 70+ variables

---

## Table of Contents

1. [Language & Build System](#1-language--build-system) (7 variables)
2. [Project Structure & Paths](#2-project-structure--paths) (8 variables)
3. [Ignore Patterns](#3-ignore-patterns) (2 variables)
4. [Testing & Quality](#4-testing--quality) (4 variables)
5. [Performance Targets](#5-performance-targets) (6 variables)
6. [Publishing & Versioning](#6-publishing--versioning) (6 variables)
7. [Git & Workflow](#7-git--workflow) (5 variables)
8. [ÆtherLight Agent Configuration](#8-ætherlight-agent-configuration) (5 variables)
9. [Documentation Commands](#9-documentation-commands) (4 variables)
10. [Framework Specific](#10-framework-specific) (6 variables)

---

## 1. Language & Build System

Variables that define the primary programming language, build tooling, and test framework.

### 1.1 `language`

**Type:** `LanguageType` (enum)
**Required:** Yes
**Default:** `"typescript"`

**Description:** Primary programming language of the project.

**Valid Values:**
- `"typescript"` - TypeScript projects
- `"javascript"` - JavaScript projects
- `"rust"` - Rust projects
- `"go"` - Go projects
- `"python"` - Python projects
- `"java"` - Java projects
- `"csharp"` - C# projects
- `"cpp"` - C++ projects
- `"ruby"` - Ruby projects
- `"php"` - PHP projects

**Detection Sources:**
- Primary: Analyze file extensions in project root (`.ts`, `.rs`, `.go`, `.py`, etc.)
- Secondary: Check for language-specific manifest files (`Cargo.toml`, `go.mod`, `requirements.txt`)
- Tertiary: Parse `package.json` (TypeScript), `pyproject.toml` (Python), etc.

**Examples:**

```typescript
// TypeScript project
"language": "typescript"

// Rust project
"language": "rust"

// Python project
"language": "python"
```

**Usage in Templates:**
```
You are working on a {{LANGUAGE}} project. Follow {{LANGUAGE}}-specific conventions for code style and testing.
```

---

### 1.2 `file_extensions`

**Type:** `string[]` (array of strings)
**Required:** Yes
**Default:** `[".ts", ".tsx", ".js", ".jsx"]`

**Description:** File extensions to analyze during code search and workspace analysis.

**Detection Sources:**
- Scan project root and source directory for all file extensions
- Count frequency of each extension
- Select extensions with >5 occurrences (filter out one-off files)

**Examples:**

```typescript
// TypeScript + React
"file_extensions": [".ts", ".tsx", ".js", ".jsx"]

// Rust
"file_extensions": [".rs"]

// Python
"file_extensions": [".py"]

// Go
"file_extensions": [".go"]

// Multi-language (Rust + JavaScript)
"file_extensions": [".rs", ".js", ".ts"]
```

**Usage in Templates:**
```
Analyze all {{FILE_EXTENSION}} files in the project. Search for patterns in files matching {{FILE_EXTENSION}} glob patterns.
```

---

### 1.3 `build_command`

**Type:** `string`
**Required:** Yes
**Default:** `"npm run build"`

**Description:** Command to build/compile the entire project. Used by agents before testing or releasing.

**Detection Sources:**
- Node.js: Parse `package.json` scripts section for `"build"` script
- Rust: Check for `Cargo.toml` → default to `"cargo build --release"`
- Go: Check for `go.mod` → default to `"go build ./..."`
- Python: Check for `setup.py` or `pyproject.toml` → may be N/A or `"python -m build"`

**Examples:**

```typescript
// Node.js/TypeScript (npm)
"build_command": "npm run build"

// Node.js/TypeScript (yarn)
"build_command": "yarn build"

// Rust
"build_command": "cargo build --release"

// Go
"build_command": "go build ./..."

// Python (setuptools)
"build_command": "python -m build"

// Python (no build step)
"build_command": "" // Empty string if no build required
```

**Usage in Templates:**
```
Before running tests, execute {{BUILD_COMMAND}} to ensure the project compiles successfully.
```

---

### 1.4 `compile_command`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `"npm run compile"` (TypeScript), `undefined` (others)

**Description:** Separate compilation command if distinct from build. Used when compilation is a prerequisite step before building.

**Detection Sources:**
- Node.js: Parse `package.json` scripts for `"compile"` script (common for TypeScript)
- Rust: Usually N/A (compilation integrated in `cargo build`)
- Go: Usually N/A (compilation integrated in `go build`)
- Python: Usually N/A (interpreted language)

**Examples:**

```typescript
// TypeScript with separate compile step
"compile_command": "npm run compile"

// TypeScript with tsc directly
"compile_command": "tsc"

// Rust (N/A - integrated)
"compile_command": undefined

// Go (N/A - integrated)
"compile_command": undefined

// Python (N/A - interpreted)
"compile_command": undefined
```

**Usage in Templates:**
```
Run {{COMPILE_COMMAND}} to compile TypeScript to JavaScript. Ensure {{COMPILE_COMMAND}} completes without errors before proceeding.
```

---

### 1.5 `test_command`

**Type:** `string`
**Required:** Yes
**Default:** `"npm test"`

**Description:** Command to run all tests. Used by agents to verify code changes.

**Detection Sources:**
- Node.js: Parse `package.json` scripts for `"test"` script
- Rust: Check for `Cargo.toml` → default to `"cargo test"`
- Go: Check for `go.mod` → default to `"go test ./..."`
- Python: Check for `pytest.ini`, `setup.cfg`, or `pyproject.toml` → default to `"pytest"` or `"python -m pytest"`

**Examples:**

```typescript
// Node.js with Mocha
"test_command": "npm test"

// Node.js with Jest
"test_command": "npm run test"

// Rust
"test_command": "cargo test"

// Go
"test_command": "go test ./..."

// Python with pytest
"test_command": "pytest"

// Python with unittest
"test_command": "python -m unittest discover"
```

**Usage in Templates:**
```
Run {{TEST_COMMAND}} to execute all tests. All tests must pass before committing changes.
```

---

### 1.6 `package_manager`

**Type:** `PackageManager` (enum)
**Required:** Yes
**Default:** `"npm"`

**Description:** Package manager used for dependency management.

**Valid Values:**
- `"npm"` - Node.js (npm)
- `"yarn"` - Node.js (Yarn)
- `"pnpm"` - Node.js (pnpm)
- `"cargo"` - Rust (Cargo)
- `"go"` - Go (Go modules)
- `"pip"` - Python (pip)
- `"maven"` - Java (Maven)
- `"gradle"` - Java (Gradle)
- `"bundler"` - Ruby (Bundler)
- `"composer"` - PHP (Composer)

**Detection Sources:**
- Node.js: Check for `package-lock.json` (npm), `yarn.lock` (Yarn), `pnpm-lock.yaml` (pnpm)
- Rust: Check for `Cargo.lock` → `"cargo"`
- Go: Check for `go.mod` → `"go"`
- Python: Check for `requirements.txt`, `Pipfile`, `pyproject.toml` → `"pip"`
- Java: Check for `pom.xml` (Maven) or `build.gradle` (Gradle)

**Examples:**

```typescript
// Node.js (npm)
"package_manager": "npm"

// Node.js (Yarn)
"package_manager": "yarn"

// Rust
"package_manager": "cargo"

// Go
"package_manager": "go"

// Python
"package_manager": "pip"
```

**Usage in Templates:**
```
Install dependencies using {{PACKAGE_MANAGER}}. Run {{PACKAGE_MANAGER}} install to fetch required packages.
```

---

### 1.7 `test_framework`

**Type:** `TestFramework` (enum)
**Required:** Yes
**Default:** `"mocha"`

**Description:** Testing framework used by the project.

**Valid Values:**
- `"mocha"` - Node.js (Mocha)
- `"jest"` - Node.js (Jest)
- `"vitest"` - Node.js (Vitest)
- `"pytest"` - Python (pytest)
- `"cargo-test"` - Rust (built-in cargo test)
- `"go-test"` - Go (built-in go test)
- `"junit"` - Java (JUnit)
- `"nunit"` - C# (NUnit)
- `"rspec"` - Ruby (RSpec)
- `"phpunit"` - PHP (PHPUnit)

**Detection Sources:**
- Node.js: Parse `package.json` devDependencies for `mocha`, `jest`, `vitest`
- Rust: Default to `"cargo-test"` (built-in)
- Go: Default to `"go-test"` (built-in)
- Python: Check for `pytest.ini`, `setup.cfg` → default to `"pytest"`

**Examples:**

```typescript
// Node.js (Mocha)
"test_framework": "mocha"

// Node.js (Jest)
"test_framework": "jest"

// Rust
"test_framework": "cargo-test"

// Go
"test_framework": "go-test"

// Python
"test_framework": "pytest"
```

**Usage in Templates:**
```
Write tests using {{TEST_FRAMEWORK}}. Follow {{TEST_FRAMEWORK}} conventions for test structure and assertions.
```

---

## 2. Project Structure & Paths

Variables that define directory structure and file paths within the project.

### 2.1 `root_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"."`

**Description:** Workspace root directory. Usually `.` (current directory) for single-project repos, or specific subdirectory for monorepos.

**Detection Sources:**
- Primary: Workspace root opened in VS Code (`vscode.workspace.workspaceFolders[0].uri.fsPath`)
- Secondary: Git root directory (`git rev-parse --show-toplevel`)

**Examples:**

```typescript
// Single-project repo
"root_directory": "."

// Monorepo (specific package)
"root_directory": "./packages/core"

// Monorepo (workspace root)
"root_directory": "."
```

**Usage in Templates:**
```
The project root is {{ROOT_DIRECTORY}}. All relative paths are calculated from {{ROOT_DIRECTORY}}.
```

---

### 2.2 `source_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"src/"`

**Description:** Directory containing source code files.

**Detection Sources:**
- Node.js: Check for `src/`, `lib/`, `app/` directories
- Rust: Check `Cargo.toml` for `[lib]` or `[[bin]]` path, default `src/`
- Go: Check for `*.go` files in root or subdirectories, common patterns: `.`, `cmd/`, `internal/`
- Python: Check for `src/`, `lib/`, or package name directory

**Examples:**

```typescript
// TypeScript (src/)
"source_directory": "src/"

// TypeScript (lib/)
"source_directory": "lib/"

// Rust
"source_directory": "src/"

// Go (root)
"source_directory": "."

// Go (cmd/)
"source_directory": "cmd/"

// Python
"source_directory": "src/"
```

**Usage in Templates:**
```
Analyze source code in {{SOURCE_DIRECTORY}}. All production code should be located in {{SOURCE_DIRECTORY}}.
```

---

### 2.3 `test_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"test/"`

**Description:** Directory containing test files.

**Detection Sources:**
- Node.js: Check for `test/`, `tests/`, `__tests__`, `spec/` directories
- Rust: Default to `tests/` for integration tests (unit tests inline in `src/`)
- Go: Check for `*_test.go` files (usually co-located with source)
- Python: Check for `tests/`, `test/`, or `pytest.ini` configuration

**Examples:**

```typescript
// TypeScript (test/)
"test_directory": "test/"

// TypeScript (tests/)
"test_directory": "tests/"

// JavaScript (Jest convention)
"test_directory": "__tests__"

// Rust (integration tests)
"test_directory": "tests/"

// Go (co-located with source)
"test_directory": "." // Tests are *_test.go files

// Python
"test_directory": "tests/"
```

**Usage in Templates:**
```
Test files are located in {{TEST_DIRECTORY}}. Write new tests in {{TEST_DIRECTORY}} following the existing structure.
```

---

### 2.4 `output_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"out/"`

**Description:** Directory where build artifacts are output (compiled code, bundles, etc.).

**Detection Sources:**
- Node.js: Parse `tsconfig.json` for `"outDir"`, common values: `out/`, `dist/`, `build/`
- Rust: Default to `target/` (Cargo convention)
- Go: Check for `-o` flag in build scripts, or default to current directory
- Python: Check for `build/`, `dist/` directories (setuptools convention)

**Examples:**

```typescript
// TypeScript (out/)
"output_directory": "out/"

// TypeScript (dist/)
"output_directory": "dist/"

// JavaScript (build/)
"output_directory": "build/"

// Rust
"output_directory": "target/"

// Go (current directory or bin/)
"output_directory": "."
"output_directory": "bin/"

// Python
"output_directory": "dist/"
```

**Usage in Templates:**
```
Compiled code is output to {{OUTPUT_DIRECTORY}}. Clean {{OUTPUT_DIRECTORY}} before rebuilding.
```

---

### 2.5 `docs_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"docs/"`

**Description:** Directory containing documentation files.

**Detection Sources:**
- Check for `docs/`, `doc/`, `documentation/` directories
- Secondary: Check for README.md location (usually root)

**Examples:**

```typescript
// Common convention
"docs_directory": "docs/"

// Alternative
"docs_directory": "doc/"

// Rust (generated docs)
"docs_directory": "target/doc/"
```

**Usage in Templates:**
```
Documentation is located in {{DOCS_DIRECTORY}}. Update relevant docs in {{DOCS_DIRECTORY}} when making changes.
```

---

### 2.6 `scripts_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"scripts/"`

**Description:** Directory containing build scripts, automation scripts, and utilities.

**Detection Sources:**
- Check for `scripts/`, `script/`, `bin/`, `tools/` directories
- Secondary: Check `package.json` for script references

**Examples:**

```typescript
// Node.js convention
"scripts_directory": "scripts/"

// Alternative
"scripts_directory": "script/"

// Ruby convention
"scripts_directory": "bin/"
```

**Usage in Templates:**
```
Automation scripts are in {{SCRIPTS_DIRECTORY}}. Run {{SCRIPTS_DIRECTORY}}/build.sh for custom builds.
```

---

### 2.7 `internal_directory`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `"internal/"`

**Description:** ÆtherLight-specific internal directory for agents, sprints, and workflows (not related to project source).

**Detection Sources:**
- Check for existing `internal/` directory with `agents/` or `sprints/` subdirectories
- User preference during interview

**Examples:**

```typescript
// Default ÆtherLight convention
"internal_directory": "internal/"

// Alternative
"internal_directory": ".aetherlight/internal/"

// Not used
"internal_directory": undefined
```

**Usage in Templates:**
```
ÆtherLight internal files are in {{INTERNAL_DIRECTORY}}. Agent context files are in {{INTERNAL_DIRECTORY}}/agents/.
```

---

### 2.8 `packages_directory`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `"packages/"`

**Description:** Directory containing packages in monorepo projects.

**Detection Sources:**
- Check for monorepo structure (`lerna.json`, `pnpm-workspace.yaml`, `workspaces` in `package.json`)
- Check for `packages/`, `crates/` (Rust), `modules/` directories

**Examples:**

```typescript
// Node.js monorepo
"packages_directory": "packages/"

// Rust workspace
"packages_directory": "crates/"

// Alternative
"packages_directory": "modules/"

// Not a monorepo
"packages_directory": undefined
```

**Usage in Templates:**
```
This is a monorepo. Individual packages are located in {{PACKAGES_DIRECTORY}}.
```

---

## 3. Ignore Patterns

Variables that control which files are analyzed or ignored during workspace analysis.

### 3.1 `ignore_patterns`

**Type:** `string[]` (array of strings)
**Required:** Yes
**Default:** `["node_modules", ".git", "out", "dist", ".vscode-test"]`

**Description:** Directories and file patterns to ignore during code analysis and search.

**Detection Sources:**
- Parse `.gitignore` file for common patterns
- Add language-specific defaults (e.g., `node_modules` for Node.js, `target/` for Rust)
- Add build output directories from configuration

**Examples:**

```typescript
// TypeScript/Node.js
"ignore_patterns": ["node_modules", ".git", "out", "dist", ".vscode-test"]

// Rust
"ignore_patterns": ["target", ".git", "Cargo.lock"]

// Go
"ignore_patterns": ["vendor", ".git", "bin"]

// Python
"ignore_patterns": ["__pycache__", ".pytest_cache", ".venv", "venv", ".git", "dist", "build"]
```

**Usage in Templates:**
```
Ignore files matching {{IGNORE_PATTERNS}} during analysis. Do not search in {{IGNORE_PATTERNS}} directories.
```

---

### 3.2 `search_file_patterns`

**Type:** `string[]` (array of glob patterns)
**Required:** Yes
**Default:** `["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.md"]`

**Description:** File glob patterns to include in code search and analysis.

**Detection Sources:**
- Derive from `file_extensions` (e.g., `.ts` → `**/*.ts`)
- Add markdown files (`**/*.md`) for documentation
- Add configuration files (`**/*.json`, `**/*.toml`) if relevant

**Examples:**

```typescript
// TypeScript
"search_file_patterns": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.md"]

// Rust
"search_file_patterns": ["**/*.rs", "**/*.toml", "**/*.md"]

// Go
"search_file_patterns": ["**/*.go", "**/*.mod", "**/*.md"]

// Python
"search_file_patterns": ["**/*.py", "**/*.md"]
```

**Usage in Templates:**
```
Search for code matching patterns: {{SEARCH_FILE_PATTERNS}}. Include files matching {{SEARCH_FILE_PATTERNS}} in analysis.
```

---

## 4. Testing & Quality

Variables that define test coverage requirements and quality standards.

### 4.1 `coverage_infrastructure`

**Type:** `number` (percentage: 0-100)
**Required:** Yes
**Default:** `90`

**Description:** Test coverage target for infrastructure code (services, utilities, core logic).

**Detection Sources:**
- User preference during interview
- Check existing coverage config (`.nycrc`, `jest.config.js`, `pytest.ini`)
- Default to 90% (infrastructure requires high coverage)

**Examples:**

```typescript
// High reliability requirement
"coverage_infrastructure": 90

// Moderate requirement
"coverage_infrastructure": 85

// Minimum acceptable
"coverage_infrastructure": 80
```

**Usage in Templates:**
```
Infrastructure code must have {{COVERAGE_INFRASTRUCTURE}}% test coverage. Aim for {{COVERAGE_INFRASTRUCTURE}}% coverage on all services.
```

---

### 4.2 `coverage_api`

**Type:** `number` (percentage: 0-100)
**Required:** Yes
**Default:** `85`

**Description:** Test coverage target for API endpoints and public interfaces.

**Detection Sources:**
- User preference during interview
- Default to 85% (APIs require good coverage but less than infrastructure)

**Examples:**

```typescript
// High quality API
"coverage_api": 85

// Moderate quality
"coverage_api": 80

// Minimum acceptable
"coverage_api": 75
```

**Usage in Templates:**
```
API endpoints must have {{COVERAGE_API}}% test coverage. All public methods need {{COVERAGE_API}}% coverage.
```

---

### 4.3 `coverage_ui`

**Type:** `number` (percentage: 0-100)
**Required:** Yes
**Default:** `70`

**Description:** Test coverage target for UI code (components, views, visual elements).

**Detection Sources:**
- User preference during interview
- Default to 70% (UI testing is harder, lower target acceptable)

**Examples:**

```typescript
// Good UI testing
"coverage_ui": 70

// Moderate UI testing
"coverage_ui": 60

// Minimum acceptable
"coverage_ui": 50
```

**Usage in Templates:**
```
UI components should have {{COVERAGE_UI}}% test coverage. Target {{COVERAGE_UI}}% coverage for visual components.
```

---

### 4.4 `coverage_command`

**Type:** `string`
**Required:** Yes
**Default:** `"npm run coverage"`

**Description:** Command to run tests with coverage reporting.

**Detection Sources:**
- Node.js: Parse `package.json` scripts for `"coverage"` script
- Rust: Default to `"cargo tarpaulin"` (if `tarpaulin` installed) or `"cargo llvm-cov"` (if `llvm-cov` installed)
- Go: Default to `"go test -coverprofile=coverage.out ./..."`
- Python: Default to `"pytest --cov"` (if `pytest-cov` installed)

**Examples:**

```typescript
// Node.js (npm)
"coverage_command": "npm run coverage"

// Node.js (nyc + mocha)
"coverage_command": "nyc mocha"

// Rust (tarpaulin)
"coverage_command": "cargo tarpaulin"

// Go
"coverage_command": "go test -coverprofile=coverage.out ./..."

// Python (pytest-cov)
"coverage_command": "pytest --cov"
```

**Usage in Templates:**
```
Run {{COVERAGE_COMMAND}} to measure test coverage. Execute {{COVERAGE_COMMAND}} before committing.
```

---

## 5. Performance Targets

Variables that define performance requirements and latency targets for ÆtherLight operations.

### 5.1 `workflow_check_ms`

**Type:** `number` (milliseconds)
**Required:** Yes
**Default:** `500`

**Description:** Maximum latency for workflow checks (validate sprint exists, check git status, etc.).

**Detection Sources:**
- User preference during interview
- Default to 500ms (responsive UX requirement)

**Examples:**

```typescript
// Default target
"workflow_check_ms": 500

// Faster requirement
"workflow_check_ms": 300

// Slower acceptable
"workflow_check_ms": 1000
```

**Usage in Templates:**
```
Workflow checks must complete within {{WORKFLOW_CHECK_MS}}ms. Optimize operations to meet {{WORKFLOW_CHECK_MS}}ms target.
```

---

### 5.2 `agent_assignment_ms`

**Type:** `number` (milliseconds)
**Required:** Yes
**Default:** `50`

**Description:** Maximum latency for agent assignment (determine which agent handles a task).

**Detection Sources:**
- User preference during interview
- Default to 50ms (fast operation, keyword matching)

**Examples:**

```typescript
// Default target
"agent_assignment_ms": 50

// Faster requirement
"agent_assignment_ms": 30

// Slower acceptable
"agent_assignment_ms": 100
```

**Usage in Templates:**
```
Agent assignment must complete within {{AGENT_ASSIGNMENT_MS}}ms. Keep agent lookup under {{AGENT_ASSIGNMENT_MS}}ms.
```

---

### 5.3 `confidence_scoring_ms`

**Type:** `number` (milliseconds)
**Required:** Yes
**Default:** `100`

**Description:** Maximum latency for confidence scoring (calculate confidence that agent is correct match).

**Detection Sources:**
- User preference during interview
- Default to 100ms (lightweight scoring algorithm)

**Examples:**

```typescript
// Default target
"confidence_scoring_ms": 100

// Faster requirement
"confidence_scoring_ms": 50

// Slower acceptable
"confidence_scoring_ms": 200
```

**Usage in Templates:**
```
Confidence scoring must complete within {{CONFIDENCE_SCORING_MS}}ms. Optimize scoring to meet {{CONFIDENCE_SCORING_MS}}ms target.
```

---

### 5.4 `test_validation_ms`

**Type:** `number` (milliseconds)
**Required:** Yes
**Default:** `200`

**Description:** Maximum latency for test validation checks (verify tests exist for changed code).

**Detection Sources:**
- User preference during interview
- Default to 200ms (file system checks, pattern matching)

**Examples:**

```typescript
// Default target
"test_validation_ms": 200

// Faster requirement
"test_validation_ms": 100

// Slower acceptable
"test_validation_ms": 500
```

**Usage in Templates:**
```
Test validation must complete within {{TEST_VALIDATION_MS}}ms. Keep validation under {{TEST_VALIDATION_MS}}ms.
```

---

### 5.5 `extension_activation_ms`

**Type:** `number | undefined` (milliseconds)
**Required:** No (optional, VS Code extensions only)
**Default:** `200`

**Description:** Maximum extension activation time (VS Code requirement for responsive extensions).

**Detection Sources:**
- VS Code extensions: Default to 200ms (VS Code best practice)
- Other projects: `undefined` (not applicable)

**Examples:**

```typescript
// VS Code extension
"extension_activation_ms": 200

// Non-VS Code project
"extension_activation_ms": undefined
```

**Usage in Templates:**
```
Extension activation must complete within {{EXTENSION_ACTIVATION_MS}}ms. Optimize startup to meet {{EXTENSION_ACTIVATION_MS}}ms target.
```

---

### 5.6 `compile_time_s`

**Type:** `number` (seconds)
**Required:** Yes
**Default:** `10`

**Description:** Target full compilation time for the project.

**Detection Sources:**
- Measure actual compile time during detection
- User preference during interview
- Default to 10 seconds (reasonable for incremental builds)

**Examples:**

```typescript
// Fast compilation
"compile_time_s": 10

// Moderate compilation
"compile_time_s": 30

// Large project
"compile_time_s": 60
```

**Usage in Templates:**
```
Target compilation time is {{COMPILE_TIME_S}} seconds. Optimize build to achieve {{COMPILE_TIME_S}}s compile time.
```

---

## 6. Publishing & Versioning

Variables that control package publishing and version management.

### 6.1 `package_registry`

**Type:** `PackageRegistry` (enum)
**Required:** Yes
**Default:** `"npm"`

**Description:** Package registry for publishing releases.

**Valid Values:**
- `"npm"` - Node.js (npm registry)
- `"crates.io"` - Rust (crates.io)
- `"pypi"` - Python (PyPI)
- `"maven-central"` - Java (Maven Central)
- `"nuget"` - C# (NuGet)
- `"rubygems"` - Ruby (RubyGems)

**Detection Sources:**
- Node.js: Default to `"npm"`
- Rust: Default to `"crates.io"`
- Python: Default to `"pypi"`
- Java: Check for Maven/Gradle → `"maven-central"`

**Examples:**

```typescript
// Node.js
"package_registry": "npm"

// Rust
"package_registry": "crates.io"

// Python
"package_registry": "pypi"
```

**Usage in Templates:**
```
Publish packages to {{PACKAGE_REGISTRY}}. Register on {{PACKAGE_REGISTRY}} before publishing.
```

---

### 6.2 `package_names`

**Type:** `string[]` (array of strings)
**Required:** Yes
**Default:** `[]`

**Description:** Package names for publishing (supports monorepo with multiple packages).

**Detection Sources:**
- Node.js: Parse `package.json` for `"name"` field
- Rust: Parse `Cargo.toml` for `[package] name` field
- Python: Parse `setup.py` or `pyproject.toml` for package name
- Monorepo: Collect names from all packages

**Examples:**

```typescript
// Single package
"package_names": ["my-project"]

// Monorepo (ÆtherLight)
"package_names": ["lumina", "aetherlight-sdk", "aetherlight-analyzer", "aetherlight-node"]

// Rust workspace
"package_names": ["my-lib", "my-cli"]
```

**Usage in Templates:**
```
Publish packages: {{PACKAGE_NAMES}}. Ensure all packages in {{PACKAGE_NAMES}} have synchronized versions.
```

---

### 6.3 `version_format`

**Type:** `VersionFormat` (enum)
**Required:** Yes
**Default:** `"semver"`

**Description:** Version numbering format.

**Valid Values:**
- `"semver"` - Semantic Versioning (MAJOR.MINOR.PATCH, e.g., 1.2.3)
- `"calver"` - Calendar Versioning (YYYY.MM.DD, e.g., 2025.01.15)

**Detection Sources:**
- Parse existing version in `package.json`, `Cargo.toml`, etc.
- Check format: semver (x.y.z) vs calver (YYYY.MM.DD)
- Default to `"semver"` (most common)

**Examples:**

```typescript
// Semantic Versioning
"version_format": "semver"
// Example versions: 0.16.15, 1.0.0, 2.3.1

// Calendar Versioning
"version_format": "calver"
// Example versions: 2025.01.06, 2025.02.15
```

**Usage in Templates:**
```
Use {{VERSION_FORMAT}} for version numbers. Follow {{VERSION_FORMAT}} conventions when bumping versions.
```

---

### 6.4 `publish_command`

**Type:** `string`
**Required:** Yes
**Default:** `"npm publish"`

**Description:** Command to publish a package to the registry.

**Detection Sources:**
- Node.js: Default to `"npm publish"` (or `yarn publish`, `pnpm publish`)
- Rust: Default to `"cargo publish"`
- Python: Default to `"python -m twine upload dist/*"`

**Examples:**

```typescript
// Node.js (npm)
"publish_command": "npm publish"

// Node.js (yarn)
"publish_command": "yarn publish"

// Rust
"publish_command": "cargo publish"

// Python
"publish_command": "python -m twine upload dist/*"
```

**Usage in Templates:**
```
Run {{PUBLISH_COMMAND}} to publish to registry. Execute {{PUBLISH_COMMAND}} after version bump.
```

---

### 6.5 `version_bump_script`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `"scripts/bump-version.js"`

**Description:** Script to bump version numbers across all packages (monorepo support).

**Detection Sources:**
- Check for existing script in `scripts/` directory (`bump-version.js`, `version.sh`, etc.)
- User preference during interview

**Examples:**

```typescript
// ÆtherLight convention
"version_bump_script": "scripts/bump-version.js"

// Shell script
"version_bump_script": "scripts/bump-version.sh"

// Not used
"version_bump_script": undefined
```

**Usage in Templates:**
```
Run {{VERSION_BUMP_SCRIPT}} to synchronize versions. Use {{VERSION_BUMP_SCRIPT}} before publishing.
```

---

### 6.6 `publish_script`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `"scripts/publish-release.js"`

**Description:** Automated script for full release process (version bump, build, test, publish).

**Detection Sources:**
- Check for existing script in `scripts/` directory (`publish-release.js`, `release.sh`, etc.)
- User preference during interview

**Examples:**

```typescript
// ÆtherLight convention
"publish_script": "scripts/publish-release.js"

// Shell script
"publish_script": "scripts/release.sh"

// Not used
"publish_script": undefined
```

**Usage in Templates:**
```
Run {{PUBLISH_SCRIPT}} to automate full release. Use {{PUBLISH_SCRIPT}} instead of manual steps.
```

---

## 7. Git & Workflow

Variables that control Git workflow and commit conventions.

### 7.1 `main_branch`

**Type:** `string`
**Required:** Yes
**Default:** `"main"`

**Description:** Name of the main/primary branch for the repository.

**Detection Sources:**
- Execute `git symbolic-ref refs/remotes/origin/HEAD` to get default branch
- Parse `.git/config` for remote default branch
- Fallback: Check for `main` or `master` branch

**Examples:**

```typescript
// Modern convention
"main_branch": "main"

// Legacy convention
"main_branch": "master"

// Custom
"main_branch": "trunk"
```

**Usage in Templates:**
```
Create pull requests against {{MAIN_BRANCH}}. Merge feature branches into {{MAIN_BRANCH}}.
```

---

### 7.2 `commit_format`

**Type:** `CommitFormat` (enum)
**Required:** Yes
**Default:** `"conventional"`

**Description:** Commit message format convention.

**Valid Values:**
- `"conventional"` - Conventional Commits (type(scope): message)
- `"angular"` - Angular style (type: message)
- `"custom"` - Custom format

**Detection Sources:**
- Check for `commitlint.config.js` or `.commitlintrc`
- Analyze recent commit messages for patterns
- Default to `"conventional"` (industry standard)

**Examples:**

```typescript
// Conventional Commits
"commit_format": "conventional"
// Example: "feat(auth): add JWT authentication"

// Angular style
"commit_format": "angular"
// Example: "feat: add JWT authentication"

// Custom
"commit_format": "custom"
```

**Usage in Templates:**
```
Use {{COMMIT_FORMAT}} format for commit messages. Follow {{COMMIT_FORMAT}} conventions.
```

---

### 7.3 `pre_commit_hook`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `undefined`

**Description:** Path to pre-commit hook script (runs before every commit).

**Detection Sources:**
- Check for `.git/hooks/pre-commit` file
- Check for Husky configuration (`.huskyrc`, `package.json` husky field)
- User preference during interview

**Examples:**

```typescript
// Git hook
"pre_commit_hook": ".git/hooks/pre-commit"

// Husky
"pre_commit_hook": ".husky/pre-commit"

// Not used
"pre_commit_hook": undefined
```

**Usage in Templates:**
```
Pre-commit hook: {{PRE_COMMIT_HOOK}}. Execute {{PRE_COMMIT_HOOK}} before allowing commits.
```

---

### 7.4 `enforce_tests_on_commit`

**Type:** `boolean`
**Required:** Yes
**Default:** `true`

**Description:** Whether to enforce that all tests pass before allowing commits.

**Detection Sources:**
- User preference during interview
- Check pre-commit hook for test execution
- Default to `true` (quality enforcement)

**Examples:**

```typescript
// Enforce tests
"enforce_tests_on_commit": true

// Allow commits without tests passing
"enforce_tests_on_commit": false
```

**Usage in Templates:**
```
Tests must pass before commit: {{ENFORCE_TESTS_ON_COMMIT}}. Validate tests pass if {{ENFORCE_TESTS_ON_COMMIT}} is true.
```

---

### 7.5 `enforce_compile_on_commit`

**Type:** `boolean`
**Required:** Yes
**Default:** `true`

**Description:** Whether to enforce that code compiles before allowing commits.

**Detection Sources:**
- User preference during interview
- Check pre-commit hook for compilation check
- Default to `true` (quality enforcement)

**Examples:**

```typescript
// Enforce compilation
"enforce_compile_on_commit": true

// Allow commits without compiling
"enforce_compile_on_commit": false
```

**Usage in Templates:**
```
Code must compile before commit: {{ENFORCE_COMPILE_ON_COMMIT}}. Run compilation check if {{ENFORCE_COMPILE_ON_COMMIT}} is true.
```

---

## 8. ÆtherLight Agent Configuration

Variables that control ÆtherLight-specific directories and configuration paths.

### 8.1 `agents_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"internal/agents"`

**Description:** Directory containing agent context files (markdown files defining agent behavior).

**Detection Sources:**
- Check for existing `internal/agents/` directory
- User preference during interview

**Examples:**

```typescript
// Default ÆtherLight convention
"agents_directory": "internal/agents"

// Alternative
"agents_directory": ".aetherlight/agents"
```

**Usage in Templates:**
```
Agent context files are in {{AGENTS_DIRECTORY}}. Load agent definitions from {{AGENTS_DIRECTORY}}.
```

---

### 8.2 `sprints_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"internal/sprints"`

**Description:** Directory containing sprint TOML files.

**Detection Sources:**
- Check for existing `internal/sprints/` directory
- User preference during interview

**Examples:**

```typescript
// Default ÆtherLight convention
"sprints_directory": "internal/sprints"

// Alternative
"sprints_directory": ".aetherlight/sprints"
```

**Usage in Templates:**
```
Sprint files are in {{SPRINTS_DIRECTORY}}. Load active sprint from {{SPRINTS_DIRECTORY}}/ACTIVE_SPRINT.toml.
```

---

### 8.3 `patterns_directory`

**Type:** `string`
**Required:** Yes
**Default:** `"docs/patterns"`

**Description:** Directory containing pattern library (reusable workflow patterns).

**Detection Sources:**
- Check for existing `docs/patterns/` directory
- User preference during interview

**Examples:**

```typescript
// Default ÆtherLight convention
"patterns_directory": "docs/patterns"

// Alternative
"patterns_directory": ".aetherlight/patterns"
```

**Usage in Templates:**
```
Patterns are documented in {{PATTERNS_DIRECTORY}}. Reference patterns from {{PATTERNS_DIRECTORY}}.
```

---

### 8.4 `skills_directory`

**Type:** `string`
**Required:** Yes
**Default:** `".claude/skills"`

**Description:** Directory containing Claude Code skill definitions.

**Detection Sources:**
- Check for existing `.claude/skills/` directory
- User preference during interview

**Examples:**

```typescript
// Default Claude Code convention
"skills_directory": ".claude/skills"

// Alternative
"skills_directory": "internal/skills"
```

**Usage in Templates:**
```
Skills are defined in {{SKILLS_DIRECTORY}}. Load skill implementations from {{SKILLS_DIRECTORY}}.
```

---

### 8.5 `claude_config_path`

**Type:** `string`
**Required:** Yes
**Default:** `".claude/CLAUDE.md"`

**Description:** Path to main Claude Code configuration file (project instructions).

**Detection Sources:**
- Check for existing `.claude/CLAUDE.md` file
- User preference during interview

**Examples:**

```typescript
// Default Claude Code convention
"claude_config_path": ".claude/CLAUDE.md"

// Alternative
"claude_config_path": "docs/CLAUDE.md"
```

**Usage in Templates:**
```
Claude configuration is in {{CLAUDE_CONFIG_PATH}}. Read project instructions from {{CLAUDE_CONFIG_PATH}}.
```

---

## 9. Documentation Commands

Variables that control documentation paths and generation commands.

### 9.1 `changelog_path`

**Type:** `string`
**Required:** Yes
**Default:** `"CHANGELOG.md"`

**Description:** Path to CHANGELOG file (version history and release notes).

**Detection Sources:**
- Check for existing `CHANGELOG.md`, `CHANGES.md`, `HISTORY.md` files
- User preference during interview

**Examples:**

```typescript
// Standard convention
"changelog_path": "CHANGELOG.md"

// Alternative
"changelog_path": "CHANGES.md"

// Nested
"changelog_path": "docs/CHANGELOG.md"
```

**Usage in Templates:**
```
Update {{CHANGELOG_PATH}} with release notes. Document changes in {{CHANGELOG_PATH}}.
```

---

### 9.2 `readme_path`

**Type:** `string`
**Required:** Yes
**Default:** `"README.md"`

**Description:** Path to README file (project overview and getting started guide).

**Detection Sources:**
- Check for existing `README.md`, `README.rst`, `README.txt` files
- Default to `"README.md"` (universal convention)

**Examples:**

```typescript
// Standard convention
"readme_path": "README.md"

// Python (reStructuredText)
"readme_path": "README.rst"

// Nested
"readme_path": "docs/README.md"
```

**Usage in Templates:**
```
Project README is {{README_PATH}}. Update installation instructions in {{README_PATH}}.
```

---

### 9.3 `api_docs_command`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `"typedoc"` (TypeScript), `undefined` (others)

**Description:** Command to generate API documentation from code comments.

**Detection Sources:**
- Node.js: Check for `typedoc`, `jsdoc` in devDependencies
- Rust: Default to `"cargo doc"`
- Go: Default to `"go doc"`
- Python: Check for `sphinx`, `pdoc` in dependencies

**Examples:**

```typescript
// TypeScript (TypeDoc)
"api_docs_command": "typedoc"

// JavaScript (JSDoc)
"api_docs_command": "jsdoc"

// Rust
"api_docs_command": "cargo doc"

// Go
"api_docs_command": "go doc"

// Python (Sphinx)
"api_docs_command": "sphinx-build"

// Not used
"api_docs_command": undefined
```

**Usage in Templates:**
```
Generate API docs with {{API_DOCS_COMMAND}}. Run {{API_DOCS_COMMAND}} before releasing.
```

---

### 9.4 `api_docs_output`

**Type:** `string | undefined`
**Required:** No (optional)
**Default:** `"docs/api"` (TypeScript), `undefined` (others)

**Description:** Directory where generated API documentation is output.

**Detection Sources:**
- Parse documentation tool config for output directory
- Common patterns: `docs/api`, `target/doc` (Rust), `doc/` (Go)

**Examples:**

```typescript
// TypeScript
"api_docs_output": "docs/api"

// Rust
"api_docs_output": "target/doc"

// Go
"api_docs_output": "doc/"

// Not used
"api_docs_output": undefined
```

**Usage in Templates:**
```
API documentation is output to {{API_DOCS_OUTPUT}}. Publish docs from {{API_DOCS_OUTPUT}}.
```

---

## 10. Framework Specific

Variables that capture framework-specific metadata (VS Code extensions, Tauri apps, etc.).

### 10.1 `framework_type`

**Type:** `FrameworkType | undefined` (enum)
**Required:** No (optional)
**Default:** `"library"`

**Description:** Type of framework or application structure.

**Valid Values:**
- `"vscode-extension"` - VS Code extension
- `"tauri-app"` - Tauri desktop application
- `"react-app"` - React web application
- `"vue-app"` - Vue web application
- `"angular-app"` - Angular web application
- `"express-server"` - Express.js server
- `"library"` - Reusable library/package
- `"cli-tool"` - Command-line tool

**Detection Sources:**
- VS Code: Check for `vscode` in `package.json` dependencies
- Tauri: Check for `@tauri-apps/api` in dependencies or `tauri.conf.json`
- React: Check for `react` in dependencies
- Vue: Check for `vue` in dependencies
- Express: Check for `express` in dependencies

**Examples:**

```typescript
// VS Code extension
"framework_type": "vscode-extension"

// Tauri app
"framework_type": "tauri-app"

// React app
"framework_type": "react-app"

// Library
"framework_type": "library"

// CLI tool
"framework_type": "cli-tool"
```

**Usage in Templates:**
```
This is a {{FRAMEWORK_TYPE}} project. Follow {{FRAMEWORK_TYPE}} best practices.
```

---

### 10.2 `vscode_api_version`

**Type:** `string | undefined`
**Required:** No (optional, VS Code extensions only)
**Default:** `undefined`

**Description:** VS Code API version requirement for extensions.

**Detection Sources:**
- Parse `package.json` for `engines.vscode` field
- Example: `"engines": { "vscode": "^1.80.0" }`

**Examples:**

```typescript
// VS Code extension
"vscode_api_version": "^1.80.0"

// Non-VS Code project
"vscode_api_version": undefined
```

**Usage in Templates:**
```
Requires VS Code API {{VSCODE_API_VERSION}}. Ensure compatibility with VS Code {{VSCODE_API_VERSION}}.
```

---

### 10.3 `nodejs_version`

**Type:** `string | undefined`
**Required:** No (optional, Node.js projects)
**Default:** `">=18.0.0"`

**Description:** Node.js version requirement.

**Detection Sources:**
- Parse `package.json` for `engines.node` field
- Parse `.nvmrc` file
- Example: `"engines": { "node": ">=18.0.0" }`

**Examples:**

```typescript
// Modern Node.js
"nodejs_version": ">=18.0.0"

// Specific version
"nodejs_version": ">=20.0.0"

// Non-Node.js project
"nodejs_version": undefined
```

**Usage in Templates:**
```
Requires Node.js {{NODEJS_VERSION}}. Ensure Node.js {{NODEJS_VERSION}} is installed.
```

---

### 10.4 `tauri_version`

**Type:** `string | undefined`
**Required:** No (optional, Tauri apps only)
**Default:** `undefined`

**Description:** Tauri framework version.

**Detection Sources:**
- Parse `package.json` for `@tauri-apps/api` version
- Parse `Cargo.toml` for `tauri` dependency version

**Examples:**

```typescript
// Tauri app
"tauri_version": "1.5.0"

// Non-Tauri project
"tauri_version": undefined
```

**Usage in Templates:**
```
Uses Tauri {{TAURI_VERSION}}. Follow Tauri {{TAURI_VERSION}} API conventions.
```

---

### 10.5 `react_version`

**Type:** `string | undefined`
**Required:** No (optional, React apps only)
**Default:** `undefined`

**Description:** React framework version.

**Detection Sources:**
- Parse `package.json` for `react` dependency version

**Examples:**

```typescript
// React app
"react_version": "18.2.0"

// Non-React project
"react_version": undefined
```

**Usage in Templates:**
```
Uses React {{REACT_VERSION}}. Follow React {{REACT_VERSION}} hooks conventions.
```

---

### 10.6 `vue_version`

**Type:** `string | undefined`
**Required:** No (optional, Vue apps only)
**Default:** `undefined`

**Description:** Vue framework version.

**Detection Sources:**
- Parse `package.json` for `vue` dependency version

**Examples:**

```typescript
// Vue 3 app
"vue_version": "3.3.0"

// Non-Vue project
"vue_version": undefined
```

**Usage in Templates:**
```
Uses Vue {{VUE_VERSION}}. Follow Vue {{VUE_VERSION}} composition API conventions.
```

---

## Variable Usage in Templates

### Template Syntax

Variables are referenced in agent prompts and templates using double curly braces:

```
{{VARIABLE_NAME}}
```

**Example Agent Prompt (Before Resolution):**
```
You are working on a {{LANGUAGE}} project using {{PACKAGE_MANAGER}}.

To build the project, run: {{BUILD_COMMAND}}
To run tests, execute: {{TEST_COMMAND}}

Source code is located in {{SOURCE_DIRECTORY}}.
Test files are in {{TEST_DIRECTORY}}.
Build artifacts output to {{OUTPUT_DIRECTORY}}.

Test coverage requirements:
- Infrastructure: {{COVERAGE_INFRASTRUCTURE}}%
- API: {{COVERAGE_API}}%
- UI: {{COVERAGE_UI}}%

Follow {{COMMIT_FORMAT}} commit message format.
```

**Example Resolved (TypeScript Project):**
```
You are working on a typescript project using npm.

To build the project, run: npm run build
To run tests, execute: npm test

Source code is located in src/.
Test files are in test/.
Build artifacts output to out/.

Test coverage requirements:
- Infrastructure: 90%
- API: 85%
- UI: 70%

Follow conventional commit message format.
```

**Example Resolved (Rust Project):**
```
You are working on a rust project using cargo.

To build the project, run: cargo build --release
To run tests, execute: cargo test

Source code is located in src/.
Test files are in tests/.
Build artifacts output to target/.

Test coverage requirements:
- Infrastructure: 90%
- API: 85%
- UI: 70%

Follow conventional commit message format.
```

---

## Variable Resolution Algorithm

The `VariableResolver` service resolves variables recursively with the following algorithm:

1. **Find all `{{VAR}}` patterns** in template
2. **For each variable:**
   - a. Check cache first (performance optimization)
   - b. If not cached, resolve recursively (handle nested variables)
   - c. Detect circular dependencies (track resolution chain)
   - d. Cache result for future use
3. **Replace all variables** in single pass

**Features:**
- **Recursive resolution:** Variables can reference other variables (`{{A}} → {{B}} → "value"`)
- **Maximum recursion depth:** 10 levels (prevents infinite loops)
- **Circular dependency detection:** Throws error if cycle detected (`{{A}} → {{B}} → {{A}}`)
- **Performance optimization:** Caching resolved values (Map)
- **Error handling:** `VariableNotFoundError`, `CircularDependencyError`, `VariableSyntaxError`

**Performance Target:** 100 variables resolved in <10ms

---

## Detection vs. Interview vs. Defaults

Variables are populated through a **3-tier hierarchy**:

### 1. Defaults (Lowest Priority)
- Defined in `DEFAULT_CONFIG` constant (ProjectConfig.ts:454)
- TypeScript/npm-centric defaults (ÆtherLight's own stack)
- Used when detection and interview provide no value

### 2. Detection (Medium Priority)
- Code Analyzer scans project structure and configuration files
- Detects language, file extensions, build commands, directory structure
- Overrides defaults with project-specific values

### 3. Interview (Highest Priority)
- InterviewEngine (SELF-004) prompts user for missing/override values
- User preferences take precedence over detection
- Used when detection is incorrect or incomplete

**Merge Strategy (ProjectConfigGenerator):**
```typescript
1. Start with DEFAULT_CONFIG
2. Apply detection results (overrides defaults)
3. Apply interview answers (overrides detection)
4. Validate using ProjectConfigValidator
5. Write to .aetherlight/project-config.json
```

---

## Related Services

- **VariableResolver** (`vscode-lumina/src/services/VariableResolver.ts`) - Resolves `{{VARIABLE}}` placeholders in templates
- **ProjectConfigGenerator** (`vscode-lumina/src/services/ProjectConfigGenerator.ts`) - Generates project-config.json from detection + interview
- **ProjectConfig** (`vscode-lumina/src/services/ProjectConfig.ts`) - TypeScript schema and DEFAULT_CONFIG
- **ProjectConfigValidator** (`vscode-lumina/src/services/ProjectConfigValidator.ts`) - Validates configuration structure
- **InterviewEngine** (`vscode-lumina/src/services/InterviewEngine.ts`) - (SELF-004) Collects user preferences

---

## Testing

All variable-related services have comprehensive test coverage:

- **VariableResolver:** 95% coverage (infrastructure requirement)
- **ProjectConfigGenerator:** 90% coverage (infrastructure requirement)
- **ProjectConfigValidator:** 90% coverage (infrastructure requirement)

Test locations:
- `vscode-lumina/test/services/VariableResolver.test.ts`
- `vscode-lumina/test/services/ProjectConfigGenerator.test.ts`
- `vscode-lumina/test/services/ProjectConfigValidator.test.ts`

---

## Configuration File Format

Variables are stored in `.aetherlight/project-config.json` (JSON format, pretty-printed with 2-space indent):

```json
{
  "schema_version": "1.0.0",
  "project_name": "my-project",
  "language": {
    "language": "rust",
    "file_extensions": [".rs"],
    "build_command": "cargo build --release",
    "test_command": "cargo test",
    "package_manager": "cargo",
    "test_framework": "cargo-test"
  },
  "structure": {
    "root_directory": ".",
    "source_directory": "src/",
    "test_directory": "tests/",
    "output_directory": "target/",
    "docs_directory": "docs/",
    "scripts_directory": "scripts/",
    "internal_directory": "internal/",
    "packages_directory": "crates/"
  },
  "ignore": {
    "ignore_patterns": ["target", ".git", "Cargo.lock"],
    "search_file_patterns": ["**/*.rs", "**/*.toml", "**/*.md"]
  },
  "testing": {
    "coverage_infrastructure": 90,
    "coverage_api": 85,
    "coverage_ui": 70,
    "coverage_command": "cargo tarpaulin"
  },
  "performance": {
    "workflow_check_ms": 500,
    "agent_assignment_ms": 50,
    "confidence_scoring_ms": 100,
    "test_validation_ms": 200,
    "compile_time_s": 10
  },
  "publishing": {
    "package_registry": "crates.io",
    "package_names": ["my-lib"],
    "version_format": "semver",
    "publish_command": "cargo publish",
    "version_bump_script": "scripts/bump-version.sh",
    "publish_script": "scripts/release.sh"
  },
  "git_workflow": {
    "main_branch": "main",
    "commit_format": "conventional",
    "enforce_tests_on_commit": true,
    "enforce_compile_on_commit": true
  },
  "aetherlight": {
    "agents_directory": "internal/agents",
    "sprints_directory": "internal/sprints",
    "patterns_directory": "docs/patterns",
    "skills_directory": ".claude/skills",
    "claude_config_path": ".claude/CLAUDE.md"
  },
  "documentation": {
    "changelog_path": "CHANGELOG.md",
    "readme_path": "README.md",
    "api_docs_command": "cargo doc",
    "api_docs_output": "target/doc"
  },
  "framework": {
    "framework_type": "library",
    "rust_edition": "2021"
  }
}
```

---

## Future Enhancements (Phase 3+)

- **Auto-detection Phase 3:** Code Analyzer will automatically detect most variables
- **Smart defaults:** Machine learning to suggest better defaults based on project type
- **Variable validation:** Runtime validation of variable values (e.g., check if `{{BUILD_COMMAND}}` succeeds)
- **Dynamic variables:** Variables that change based on context (e.g., `{{CURRENT_BRANCH}}`, `{{USER_NAME}}`)
- **Variable interpolation:** Support for expressions (e.g., `{{COVERAGE_INFRASTRUCTURE + 5}}`)

---

## Questions?

For questions or issues with variable configuration:
- **Schemas:** See `vscode-lumina/src/services/ProjectConfig.ts`
- **Resolution:** See `vscode-lumina/src/services/VariableResolver.ts`
- **Generation:** See `vscode-lumina/src/services/ProjectConfigGenerator.ts`
- **Validation:** See `vscode-lumina/src/services/ProjectConfigValidator.ts`
- **Tests:** See `vscode-lumina/test/services/*.test.ts`

---

**END OF VARIABLE REFERENCE**
