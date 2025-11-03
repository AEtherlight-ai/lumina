import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';

/**
 * DESIGN DECISION: Use Node.js built-in fs instead of glob package
 * WHY: Pattern-PUBLISH-003 - Avoid runtime npm dependencies
 *      Extension packaged with --no-dependencies excludes npm packages
 * RELATED: v0.15.31-0.15.32 bug (glob excluded from .vsix)
 */

/**
 * Recursively find all .test.js files in directory
 *
 * @param dir - Directory to search
 * @returns Array of test file paths
 */
function findTestFiles(dir: string): string[] {
	const files: string[] = [];

	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				// Recurse into subdirectories
				files.push(...findTestFiles(fullPath));
			} else if (entry.isFile() && entry.name.endsWith('.test.js')) {
				// Add test file
				files.push(fullPath);
			}
		}
	} catch (err) {
		console.error(`Error reading directory ${dir}:`, err);
	}

	return files;
}

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');

    try {
        // Find all test files using Node.js built-in fs (Pattern-PUBLISH-003)
        const files = findTestFiles(testsRoot);

        // Add files to the test suite
        files.forEach(f => mocha.addFile(f));

        // Run the mocha test
        return new Promise((c, e) => {
            mocha.run(failures => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}
