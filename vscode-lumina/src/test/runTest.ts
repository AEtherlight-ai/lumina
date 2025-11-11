import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        console.log('Extension Development Path:', extensionDevelopmentPath);
        console.log('Extension Tests Path:', extensionTestsPath);
        console.log('__dirname:', __dirname);
        console.log('process.cwd():', process.cwd());

        // Download VS Code, unzip it and run the integration test
        // Use explicit directories and quote paths to handle spaces (Windows compatibility)
        // IMPORTANT: Pass workspace folder to prevent VS Code from scanning parent directories
        // which can cause module resolution issues with paths containing spaces (Windows Dropbox bug)
        // Use a temporary empty workspace folder inside the extension directory
        const workspaceFolder = path.join(extensionDevelopmentPath, '.vscode-test-workspace');

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                workspaceFolder,  // Open workspace folder to prevent parent directory scanning
                '--new-window',
                '--skip-welcome',
                `--user-data-dir="${path.join(extensionDevelopmentPath, '.vscode-test-user-data')}"`,
                `--extensions-dir="${path.join(extensionDevelopmentPath, '.vscode-test-extensions')}"`,
                '--no-sandbox',
                '--disable-workspace-trust',
                '--disable-extensions'  // Disable other extensions during testing
            ]
        });
    } catch (err) {
        console.error('Failed to run tests');
        console.error(err);
        process.exit(1);
    }
}

main();
