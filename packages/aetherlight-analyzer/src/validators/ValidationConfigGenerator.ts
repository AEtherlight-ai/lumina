/**
 * ValidationConfigGenerator
 *
 * DESIGN DECISION: Auto-generate project-specific validation.toml configuration
 * WHY: Validators need configuration to be effective, but manual config is error-prone
 *
 * REASONING CHAIN:
 * 1. Analyze project structure (type, packages, dependencies)
 * 2. Detect potential issues (native deps, runtime npm deps, version mismatches)
 * 3. Generate intelligent defaults based on analysis
 * 4. Communicate findings to user
 * 5. Save configuration after confirmation
 * 6. Result: Accurate, project-specific validation rules
 *
 * Pattern: Pattern-ANALYZER-001 (Auto-Configuration)
 * Related: VAL-002, VAL-007, SYNC-001
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Project type classifications
 */
export type ProjectType = 'vscode-extension' | 'library' | 'application' | 'monorepo';

/**
 * Package structure info
 */
export interface PackageStructure {
    type: 'single' | 'monorepo';
    packages: string[]; // Relative paths from project root
}

/**
 * Detected issue with project
 */
export interface DetectedIssue {
    type: 'native_dependencies' | 'runtime_npm_dependencies' | 'large_bundle' | 'missing_tests' | 'version_mismatch';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    packages?: string[];
    suggestion?: string;
}

/**
 * Validation configuration structure
 */
export interface ValidationConfig {
    validation: {
        enabled: boolean;
        dependencies: {
            allow_native_dependencies: boolean;
            allow_runtime_npm_dependencies: boolean;
            allowed_exceptions: string[];
        };
        version_sync?: {
            mode: 'auto-discover' | 'explicit';
            packages: string[];
            require_exact_match: boolean;
        };
        test_coverage?: {
            infrastructure_min: number;
            api_min: number;
            ui_min: number;
        };
        package_size?: {
            max_size_mb: number;
            warn_size_mb: number;
        };
    };
}

/**
 * Analysis result
 */
export interface AnalysisResult {
    projectType: ProjectType;
    packageStructure: PackageStructure;
    issues: DetectedIssue[];
    config: ValidationConfig;
    configSaved: boolean;
}

/**
 * Save options
 */
export interface SaveOptions {
    force?: boolean;
}

/**
 * Generate options
 */
export interface GenerateOptions {
    autoSave?: boolean;
}

/**
 * Native dependency patterns (packages that require native compilation)
 */
const NATIVE_DEP_PATTERNS = [
    '@nut-tree-fork/nut-js',
    'robotjs',
    'node-hid',
    'serialport',
    'usb',
    'ffi-napi',
    'ref-napi',
    'node-gyp',
    'bindings',
    'prebuild'
];

/**
 * Runtime npm dependencies that are problematic for VS Code extensions
 * (because vsce package --no-dependencies excludes them)
 */
const RUNTIME_NPM_DEP_PATTERNS = [
    'glob',
    'fast-glob',
    'lodash',
    'underscore',
    'moment',
    'date-fns',
    'axios',
    'got',
    'chalk',
    'colors'
];

/**
 * Allowed exceptions (packages that ARE allowed as runtime dependencies)
 */
const ALLOWED_EXCEPTIONS = [
    '@iarna/toml',
    'node-fetch',
    'ws',
    'form-data',
    // Sub-packages are always allowed
    'aetherlight-analyzer',
    'aetherlight-sdk',
    'aetherlight-node'
];

export class ValidationConfigGenerator {
    /**
     * Detect project type by analyzing package.json and directory structure
     */
    detectProjectType(projectRoot: string): ProjectType {
        const packageJsonPath = path.join(projectRoot, 'package.json');

        // Check for monorepo first (packages/ or apps/ directory)
        const packagesDir = path.join(projectRoot, 'packages');
        const appsDir = path.join(projectRoot, 'apps');
        if (fs.existsSync(packagesDir) || fs.existsSync(appsDir)) {
            const hasPackages = fs.existsSync(packagesDir) &&
                fs.readdirSync(packagesDir).some(dir => {
                    const pkgPath = path.join(packagesDir, dir, 'package.json');
                    return fs.existsSync(pkgPath);
                });
            const hasApps = fs.existsSync(appsDir) &&
                fs.readdirSync(appsDir).some(dir => {
                    const pkgPath = path.join(appsDir, dir, 'package.json');
                    return fs.existsSync(pkgPath);
                });

            if (hasPackages || hasApps) {
                return 'monorepo';
            }
        }

        // Check package.json
        if (!fs.existsSync(packageJsonPath)) {
            return 'application';
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        // VS Code extension
        if (packageJson.engines?.vscode || packageJson.contributes) {
            return 'vscode-extension';
        }

        // Library (has types and main)
        if (packageJson.types && packageJson.main) {
            return 'library';
        }

        return 'application';
    }

    /**
     * Detect package structure (single package or monorepo with multiple packages)
     */
    detectPackageStructure(projectRoot: string): PackageStructure {
        const packages: string[] = [];

        // Check packages/ directory
        const packagesDir = path.join(projectRoot, 'packages');
        if (fs.existsSync(packagesDir)) {
            const dirs = fs.readdirSync(packagesDir);
            for (const dir of dirs) {
                const pkgPath = path.join(packagesDir, dir, 'package.json');
                if (fs.existsSync(pkgPath)) {
                    packages.push(`packages/${dir}`);
                }
            }
        }

        // Check apps/ directory
        const appsDir = path.join(projectRoot, 'apps');
        if (fs.existsSync(appsDir)) {
            const dirs = fs.readdirSync(appsDir);
            for (const dir of dirs) {
                const pkgPath = path.join(appsDir, dir, 'package.json');
                if (fs.existsSync(pkgPath)) {
                    packages.push(`apps/${dir}`);
                }
            }
        }

        // If no packages found, it's a single package
        if (packages.length === 0) {
            return {
                type: 'single',
                packages: ['.']
            };
        }

        return {
            type: 'monorepo',
            packages
        };
    }

    /**
     * Detect potential issues in the project
     */
    detectPotentialIssues(projectRoot: string): DetectedIssue[] {
        const issues: DetectedIssue[] = [];
        const projectType = this.detectProjectType(projectRoot);
        const packageStructure = this.detectPackageStructure(projectRoot);

        // Check each package for issues
        const packagesToCheck = packageStructure.type === 'single'
            ? [projectRoot]
            : packageStructure.packages.map(p => path.join(projectRoot, p));

        for (const pkgPath of packagesToCheck) {
            const packageJsonPath = path.join(pkgPath, 'package.json');
            if (!fs.existsSync(packageJsonPath)) continue;

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check for native dependencies
            const nativeDeps = Object.keys(deps).filter(dep =>
                NATIVE_DEP_PATTERNS.some(pattern => dep.includes(pattern))
            );
            if (nativeDeps.length > 0) {
                issues.push({
                    type: 'native_dependencies',
                    severity: 'critical',
                    message: `Native dependencies found: ${nativeDeps.join(', ')}`,
                    packages: nativeDeps,
                    suggestion: 'Replace with VS Code APIs or pure JavaScript alternatives'
                });
            }

            // Check for runtime npm dependencies in VS Code extensions
            if (projectType === 'vscode-extension') {
                const runtimeDeps = Object.keys(packageJson.dependencies || {}).filter(dep =>
                    RUNTIME_NPM_DEP_PATTERNS.some(pattern => dep.includes(pattern)) &&
                    !ALLOWED_EXCEPTIONS.some(allowed => dep.includes(allowed))
                );
                if (runtimeDeps.length > 0) {
                    issues.push({
                        type: 'runtime_npm_dependencies',
                        severity: 'critical',
                        message: `Runtime npm dependencies found: ${runtimeDeps.join(', ')}`,
                        packages: runtimeDeps,
                        suggestion: 'Replace with Node.js built-in APIs (fs, path, etc.)'
                    });
                }
            }

            // Check for large bundle size (many dependencies)
            const depCount = Object.keys(deps).length;
            if (depCount > 30) {
                issues.push({
                    type: 'large_bundle',
                    severity: 'warning',
                    message: `Large number of dependencies: ${depCount}`,
                    suggestion: 'Consider reducing dependencies to improve package size'
                });
            }

            // Check for missing tests
            const testDirs = ['test', 'tests', '__tests__', 'src/test', 'src/tests'];
            const hasTests = testDirs.some(dir => fs.existsSync(path.join(pkgPath, dir)));
            if (!hasTests) {
                issues.push({
                    type: 'missing_tests',
                    severity: 'warning',
                    message: 'No test directory found',
                    suggestion: 'Add tests following Pattern-TDD-001'
                });
            }
        }

        // Check for version mismatches in monorepo
        if (packageStructure.type === 'monorepo') {
            const versions = new Set<string>();
            for (const pkg of packageStructure.packages) {
                const pkgPath = path.join(projectRoot, pkg, 'package.json');
                if (fs.existsSync(pkgPath)) {
                    const packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                    versions.add(packageJson.version);
                }
            }

            if (versions.size > 1) {
                issues.push({
                    type: 'version_mismatch',
                    severity: 'critical',
                    message: `Version mismatch in monorepo: ${Array.from(versions).join(', ')}`,
                    suggestion: 'All packages should have the same version'
                });
            }
        }

        return issues;
    }

    /**
     * Generate validation config based on project analysis
     */
    generateConfig(projectRoot: string): ValidationConfig {
        const projectType = this.detectProjectType(projectRoot);
        const packageStructure = this.detectPackageStructure(projectRoot);
        const packageJsonPath = path.join(projectRoot, 'package.json');

        // Get allowed exceptions from existing dependencies
        const allowedExceptions = [...ALLOWED_EXCEPTIONS];
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = Object.keys(packageJson.dependencies || {});
            // Add current dependencies to allowed exceptions
            allowedExceptions.push(...deps.filter(dep =>
                ALLOWED_EXCEPTIONS.some(allowed => dep.includes(allowed))
            ));
        }

        const config: ValidationConfig = {
            validation: {
                enabled: true,
                dependencies: {
                    allow_native_dependencies: projectType !== 'vscode-extension',
                    allow_runtime_npm_dependencies: projectType !== 'vscode-extension',
                    allowed_exceptions: [...new Set(allowedExceptions)] // Remove duplicates
                },
                test_coverage: {
                    infrastructure_min: 0.90,
                    api_min: 0.85,
                    ui_min: 0.70
                }
            }
        };

        // Add version sync for monorepos
        if (packageStructure.type === 'monorepo') {
            config.validation.version_sync = {
                mode: 'auto-discover',
                packages: packageStructure.packages,
                require_exact_match: true
            };
        }

        // Add package size limits for VS Code extensions
        if (projectType === 'vscode-extension') {
            config.validation.package_size = {
                max_size_mb: 5,
                warn_size_mb: 2
            };
        }

        return config;
    }

    /**
     * Save config to .aetherlight/validation.toml
     */
    async saveConfig(projectRoot: string, config: ValidationConfig, options: SaveOptions = {}): Promise<void> {
        const aetherlightDir = path.join(projectRoot, '.aetherlight');
        const configPath = path.join(aetherlightDir, 'validation.toml');

        // Check if config already exists
        if (fs.existsSync(configPath) && !options.force) {
            throw new Error('Config already exists. Use force: true to overwrite.');
        }

        // Create .aetherlight directory if missing
        if (!fs.existsSync(aetherlightDir)) {
            fs.mkdirSync(aetherlightDir, { recursive: true });
        }

        // Convert config to TOML format
        const toml = this.configToToml(config);

        // Write file
        fs.writeFileSync(configPath, toml, 'utf-8');
    }

    /**
     * Convert config object to TOML string
     */
    private configToToml(config: ValidationConfig): string {
        let toml = '# Generated by ÆtherLight Code Analyzer\n';
        toml += '# Pattern: Pattern-ANALYZER-001 (Auto-Configuration)\n\n';
        toml += '[validation]\n';
        toml += `enabled = ${config.validation.enabled}\n\n`;

        toml += '[validation.dependencies]\n';
        toml += `# Detected: ${config.validation.dependencies.allow_native_dependencies ? 'Native deps allowed' : 'Native deps not allowed (VS Code extension)'}\n`;
        toml += `allow_native_dependencies = ${config.validation.dependencies.allow_native_dependencies}\n`;
        toml += `allow_runtime_npm_dependencies = ${config.validation.dependencies.allow_runtime_npm_dependencies}\n\n`;
        toml += '# Auto-whitelisted (detected in use):\n';
        toml += `allowed_exceptions = ${JSON.stringify(config.validation.dependencies.allowed_exceptions)}\n\n`;

        if (config.validation.version_sync) {
            toml += '[validation.version_sync]\n';
            toml += `# Detected: Monorepo with ${config.validation.version_sync.packages.length} packages\n`;
            toml += `mode = "${config.validation.version_sync.mode}"\n`;
            toml += `packages = ${JSON.stringify(config.validation.version_sync.packages)}\n`;
            toml += `require_exact_match = ${config.validation.version_sync.require_exact_match}\n\n`;
        }

        if (config.validation.test_coverage) {
            toml += '[validation.test_coverage]\n';
            toml += `infrastructure_min = ${config.validation.test_coverage.infrastructure_min}\n`;
            toml += `api_min = ${config.validation.test_coverage.api_min}\n`;
            toml += `ui_min = ${config.validation.test_coverage.ui_min}\n\n`;
        }

        if (config.validation.package_size) {
            toml += '[validation.package_size]\n';
            toml += `max_size_mb = ${config.validation.package_size.max_size_mb}\n`;
            toml += `warn_size_mb = ${config.validation.package_size.warn_size_mb}\n`;
        }

        return toml;
    }

    /**
     * Full analysis and config generation workflow
     */
    async analyzeAndGenerateConfig(projectRoot: string, options: GenerateOptions = {}): Promise<AnalysisResult> {
        // 1. ANALYZE
        const projectType = this.detectProjectType(projectRoot);
        const packageStructure = this.detectPackageStructure(projectRoot);
        const issues = this.detectPotentialIssues(projectRoot);

        // 2. GENERATE
        const config = this.generateConfig(projectRoot);

        // 3. SAVE (if autoSave enabled)
        let configSaved = false;
        if (options.autoSave) {
            await this.saveConfig(projectRoot, config, { force: true });
            configSaved = true;
        }

        return {
            projectType,
            packageStructure,
            issues,
            config,
            configSaved
        };
    }
}
