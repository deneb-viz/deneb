#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook (matcher: Bash).
 *
 * Before a `gh pr create` runs, execute the local CI check (`npm run ci:local` —
 * the same steps as the GitHub `ci` job, run against `.env.ci`). If it fails,
 * block the PR creation (exit 2) so problems are caught before the PR is
 * proposed rather than on CI.
 *
 * Only `gh pr create` is gated; every other Bash command passes straight
 * through (exit 0). Escapes:
 *   - CI_LOCAL_HOOK_SKIP=1   bypass the check (e.g. an intentional draft PR)
 *   - CI_LOCAL_HOOK_DRYRUN=1 decide-only, don't run ci:local (used by tests)
 */
const { execSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function readStdin() {
    return new Promise((resolve) => {
        if (process.stdin.isTTY) {
            resolve('');
            return;
        }
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => (data += chunk));
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', () => resolve(''));
    });
}

function isPrCreate(payload) {
    if ((payload.tool_name || '') !== 'Bash') return false;
    const command = (payload.tool_input && payload.tool_input.command) || '';
    return /\bgh\s+pr\s+create\b/.test(command);
}

(async () => {
    let payload = {};
    try {
        payload = JSON.parse((await readStdin()) || '{}');
    } catch {
        // Malformed payload — never get in the way of the tool call.
        process.exit(0);
    }

    if (!isPrCreate(payload)) {
        process.exit(0);
    }

    if (process.env.CI_LOCAL_HOOK_SKIP === '1') {
        process.stderr.write(
            '[ci:local hook] CI_LOCAL_HOOK_SKIP=1 — skipping the local CI check.\n'
        );
        process.exit(0);
    }

    if (process.env.CI_LOCAL_HOOK_DRYRUN === '1') {
        process.stderr.write(
            '[ci:local hook] dry run — would run `npm run ci:local`.\n'
        );
        process.exit(0);
    }

    try {
        execSync('npm run ci:local', {
            cwd: repoRoot,
            stdio: 'pipe',
            maxBuffer: 64 * 1024 * 1024
        });
    } catch (err) {
        const out = `${(err && err.stdout) || ''}${(err && err.stderr) || ''}`;
        const tail = out.split(/\r?\n/).slice(-40).join('\n');
        process.stderr.write(
            'Blocked `gh pr create`: `npm run ci:local` failed. Fix the failures ' +
                'below (or set CI_LOCAL_HOOK_SKIP=1 to bypass intentionally), then ' +
                'propose the PR again.\n\n' +
                tail +
                '\n'
        );
        process.exit(2);
    }

    process.stderr.write(
        '[ci:local hook] local CI passed — proposing the PR.\n'
    );
    process.exit(0);
})();
