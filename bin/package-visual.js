#!/usr/bin/env node
/**
 * Runs a packaging script in the visual app: apps/deneb when present,
 * otherwise the only app with a pbiviz.json. The root packaging scripts go
 * through here, so `npm run package` at the root packages whichever visual
 * the checkout holds.
 *
 * Usage in the root package.json:
 *   "package": "node bin/package-visual.js package"
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const selectVisualApp = (appsDir) => {
    const visuals = fs
        .readdirSync(appsDir)
        .filter((name) =>
            fs.existsSync(path.join(appsDir, name, 'pbiviz.json'))
        );
    if (visuals.includes('deneb')) return 'deneb';
    if (visuals.length === 1) return visuals[0];
    throw new Error(
        `Expected apps/deneb or exactly one app with a pbiviz.json, found: ${visuals.join(', ') || 'none'}`
    );
};

if (require.main === module) {
    const script = process.argv[2];
    if (!script) {
        console.error('Usage: node bin/package-visual.js <script>');
        process.exit(2);
    }
    const app = selectVisualApp(path.join(root, 'apps'));
    const result = spawnSync(`npm run ${script} -w apps/${app}`, {
        cwd: root,
        stdio: 'inherit',
        shell: true
    });
    process.exit(result.status ?? 1);
}

module.exports = { selectVisualApp };
