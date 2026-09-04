# Move the root visual into `apps/deneb` — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the Power BI visual from the repository root into `apps/deneb` with zero behavioural change, proven by a content-level parity comparison of the packaged `.pbiviz` before and after.

**Architecture:** Lift-and-shift (`git mv`) of the visual tree into `apps/deneb`, which becomes workspace package `@deneb-viz/deneb`; the root `package.json` is renamed `@deneb-viz/monorepo` and keeps delegating shims for every externally-used entry point. All visual scripts then run with `cwd = apps/deneb` (npm workspace invocation does this), which is load-bearing: the packaging plugin resolves `stringResources/` and `assets/icon.png` from `process.cwd()`. `.env*` stays at the root; moved configs reach it via an explicit repo-root constant. A permanent parity tool compares per-part hashes of two `.pbiviz` files and is the acceptance gate.

**Tech Stack:** npm workspaces, Turbo, Webpack 5, powerbi-visuals-webpack-plugin, ts-node, Vitest, ESLint 9 flat config, jszip (new root devDependency for the parity tool).

**Spec:** [docs/brainstorms/2026-08-26-apps-deneb-move-requirements.md](../brainstorms/2026-08-26-apps-deneb-move-requirements.md)

---

## Preconditions (read before Task 1)

- Execute **after** the pending certification cut and after the currently open PRs have merged. First action: `git checkout chore/757-apps-deneb && git rebase main` (resolve the spec doc trivially if needed), then a clean `npm install`.
- Branch: `chore/757-apps-deneb`, merge target `main`.
- Windows dev environment; commands below are PowerShell-safe unless marked bash.
- Commits map to the spec's sequence: (1) parity tool, (2) pure `git mv`, (3) identity + path fixes, (4) tooling coverage, (5) CI + docs, (6) delete dead `webpack.config.js`. The parity report goes in the PR body, not a commit.
- **Commit 2 (pure mv) intentionally does not build.** Nothing between commits 2 and 3 is expected to be green; verification resumes at Task 4.
- Facts verified during planning (2026-09-04), relied on below:
  - The `.pbiviz` zip contains `package.json` (metadata + resource index) and `resources/<guid>.pbiviz.json` with top-level keys `visual, author, apiVersion, style, stringResources, capabilities, content {js, css, iconBase64}, visualEntryPoint, externalJS, assets`. The certified 2.0.0.0 artifact carries 45 locales under `stringResources` even though `pbiviz.json` has `"stringResources": []` — the plugin resolves the `stringResources/` directory from `process.cwd()`, which is exactly the silent trap the parity tool must catch.
  - `powerbi-visuals-webpack-plugin` resolves `assets/icon.png` via `path.join(process.cwd(), options.assets.icon)` and locales via `path.join(process.cwd(), "stringResources")`.
  - The certified `npm run package` path does **not** patch the version (alpha/beta do), so a pre-move and post-move certified build of the same source have identical metadata.
  - MS certification file requirements prescribe `"eslint": "npx eslint . --ext .js,.jsx,.ts,.tsx"` in package.json — stale wording (`--ext` is invalid with ESLint 9 flat config); the currently certified repo already deviates and was accepted. Requirement honoured in substance: `typescript`, `eslint`, `eslint-plugin-powerbi-visuals` stay installed at root **and** are declared in `apps/deneb`, and both keep an `eslint` script.
  - `apps/web-client-sample` already has `eslint.config.js` and an `eslint` script (`node ../../bin/workspace-eslint.js`) — the pattern `apps/deneb` copies.
  - `jszip` is already in the tree transitively (powerbi-visuals-webpack-plugin); we declare it explicitly.

---

### Task 1: Parity tool (`bin/verify-package-parity.ts`) — commit 1

**Files:**
- Create: `bin/verify-package-parity.ts`
- Modify: `package.json` (add `jszip` devDependency + `verify-package-parity` script)

- [ ] **Step 1: Add jszip and the script**

In root `package.json`, add to `devDependencies` (alphabetical position):

```json
        "jszip": "^3.10.1",
```

and to `scripts`:

```json
        "verify-package-parity": "ts-node -P tsconfig.build-scripts.json bin/verify-package-parity.ts",
```

Run: `npm install`
Expected: exit 0, lockfile updated with a top-level `jszip` entry.

- [ ] **Step 2: Write the tool**

Create `bin/verify-package-parity.ts`:

```ts
/**
 * Compares two .pbiviz packages at the content level and reports exactly
 * which part differs. Byte-level comparison of the archives is not possible
 * (the zip stamps wall-clock entry mtimes), so content-level is the bar.
 *
 * Parts compared (sha256 of each):
 *   - content.js, content.css, content.iconBase64
 *   - capabilities (stringified)
 *   - metadata (visual/author/apiVersion/style/dependencies/
 *     visualEntryPoint/externalJS/assets, stringified)
 *   - the sorted set of locale keys, and each locale's resources
 *
 * This inherently catches the known silent traps of the apps/deneb move:
 * a root-cwd invocation ships an icon-less, locale-less package (icon and
 * stringResources hashes change), and an ajv hoisting swap changes
 * content.js.
 *
 * Usage:
 *   npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz>
 *
 * Exit codes: 0 all parts match; 1 at least one part differs; 2 usage error.
 */
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import JSZip from 'jszip';

interface PbivizResource {
    visual: Record<string, unknown>;
    author: Record<string, unknown>;
    apiVersion: string;
    style: string;
    dependencies?: unknown;
    stringResources?: Record<string, Record<string, string>>;
    capabilities: Record<string, unknown>;
    content: { js?: string; css?: string; iconBase64?: string };
    visualEntryPoint?: unknown;
    externalJS?: unknown;
    assets?: Record<string, unknown>;
}

const sha256 = (value: string): string =>
    createHash('sha256').update(value).digest('hex');

const loadResource = async (pbivizPath: string): Promise<PbivizResource> => {
    const zip = await JSZip.loadAsync(readFileSync(pbivizPath));
    const resourceFile = Object.keys(zip.files).find(
        (name) =>
            name.startsWith('resources/') && name.endsWith('.pbiviz.json')
    );
    if (!resourceFile) {
        throw new Error(`No resources/*.pbiviz.json found in ${pbivizPath}`);
    }
    return JSON.parse(
        await zip.files[resourceFile].async('string')
    ) as PbivizResource;
};

export const getPartHashes = (
    resource: PbivizResource
): Record<string, string> => {
    const locales = Object.keys(resource.stringResources ?? {}).sort();
    const parts: Record<string, string> = {
        'content.js': sha256(resource.content.js ?? ''),
        'content.css': sha256(resource.content.css ?? ''),
        'content.iconBase64': sha256(resource.content.iconBase64 ?? ''),
        capabilities: sha256(JSON.stringify(resource.capabilities ?? null)),
        metadata: sha256(
            JSON.stringify({
                visual: resource.visual,
                author: resource.author,
                apiVersion: resource.apiVersion,
                style: resource.style,
                dependencies: resource.dependencies ?? null,
                visualEntryPoint: resource.visualEntryPoint ?? null,
                externalJS: resource.externalJS ?? null,
                assets: resource.assets ?? null
            })
        ),
        'locales.keys': sha256(JSON.stringify(locales))
    };
    for (const locale of locales) {
        parts[`locale.${locale}`] = sha256(
            JSON.stringify(resource.stringResources?.[locale] ?? null)
        );
    }
    return parts;
};

const main = async (): Promise<void> => {
    const [baselinePath, candidatePath] = process.argv.slice(2);
    if (!baselinePath || !candidatePath) {
        console.error(
            'Usage: npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz>'
        );
        process.exit(2);
    }
    const baseline = getPartHashes(await loadResource(baselinePath));
    const candidate = getPartHashes(await loadResource(candidatePath));
    const partNames = [
        ...new Set([...Object.keys(baseline), ...Object.keys(candidate)])
    ].sort();
    let failed = false;
    console.log(`Baseline:  ${baselinePath}`);
    console.log(`Candidate: ${candidatePath}\n`);
    for (const part of partNames) {
        const left = baseline[part];
        const right = candidate[part];
        const match = left !== undefined && left === right;
        if (!match) {
            failed = true;
        }
        console.log(
            `${match ? 'PASS' : 'DIFF'}  ${part.padEnd(24)} ${(
                left ?? '(missing)'
            ).slice(0, 12)}  ${(right ?? '(missing)').slice(0, 12)}`
        );
    }
    console.log(
        failed
            ? '\nRESULT: PARITY FAILURE — parts marked DIFF above do not match.'
            : '\nRESULT: PARITY OK — all compared parts are content-identical.'
    );
    process.exit(failed ? 1 : 0);
};

main().catch((error) => {
    console.error(`[ERROR] ${error instanceof Error ? error.message : error}`);
    process.exit(2);
});
```

- [ ] **Step 3: Red/green check the tool against real artifacts**

The runnable check for this tool is a pair of live comparisons (no unit-test
file: root loses its Vitest runner in Task 4, and the tool's correctness is
exactly "does it discriminate real artifacts").

Same file twice — must pass:

```
npm run verify-package-parity -- dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.2.0.0.0.pbiviz dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.2.0.0.0.pbiviz
```

Expected: every part `PASS`, `RESULT: PARITY OK`, exit 0.

Cert vs an alpha artifact — must fail (different content, GUID-suffixed metadata):

```
npm run verify-package-parity -- dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.2.0.0.0.pbiviz "dist/BETAdeneb7E15AEF80B9E4D4F8E12924291ECE89A.2.0.0.20260827#7b31b8d0.pbiviz"
```

Expected: `DIFF` on at least `content.js` and `metadata`, `RESULT: PARITY FAILURE`, exit 1. (Any alpha/beta file present in `dist/` works; adjust the filename to what exists.)

- [ ] **Step 4: Lint/format and commit**

Run: `npm run prettier-check` (fix with `npm run prettier-format` if needed — the new `.ts` file is under `bin/`, which the root prettier glob does not cover, but `package.json` is).

```bash
git add bin/verify-package-parity.ts package.json package-lock.json
git commit -m "chore: add content-level .pbiviz parity verification tool (#757)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Capture the pre-move baseline (no commit)

All captures below are of the **pre-move** tree (immediately after Task 1's commit).

- [ ] **Step 1: Baseline certified package**

`npm run package` runs `validate-config-for-commit`, which requires cert-safe `.env` values — swap like `ci:local` does:

```powershell
Copy-Item .env .env.backup
Copy-Item .env.ci .env
npm run package
Copy-Item .env.backup .env; Remove-Item .env.backup
Copy-Item dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.*.pbiviz dist/baseline-pre-move.pbiviz
```

(Both `dist/baseline-pre-move.pbiviz` and everything else in `dist/` are gitignored; the baseline survives the move untouched because `git mv` only moves tracked files.)

Expected: package build succeeds; `dist/baseline-pre-move.pbiviz` exists.

- [ ] **Step 2: Baseline lint file count**

```powershell
npx --no eslint . -f json | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).length))"
```

Record the number (spec expects 155 at time of writing; record whatever it actually is — this is the comparison value for Task 5 Step 7).

- [ ] **Step 3: Sanity-check the baseline against itself**

```
npm run verify-package-parity -- dist/baseline-pre-move.pbiviz dist/baseline-pre-move.pbiviz
```

Expected: `RESULT: PARITY OK`.

---

### Task 3: Pure `git mv` — commit 2

**Files:** everything listed below moves under `apps/deneb/`; no content edits in this commit (reviewable as a rename-only diff). This commit does not build — expected.

- [ ] **Step 1: Move the visual tree**

```bash
mkdir -p apps/deneb/bin/__test__
git mv src apps/deneb/src
git mv style apps/deneb/style
git mv assets apps/deneb/assets
git mv stringResources apps/deneb/stringResources
git mv config apps/deneb/config
git mv pbiviz.json apps/deneb/pbiviz.json
git mv capabilities.json apps/deneb/capabilities.json
git mv webpack.common.config.js apps/deneb/webpack.common.config.js
git mv webpack.dev.config.js apps/deneb/webpack.dev.config.js
git mv webpack.prod.config.js apps/deneb/webpack.prod.config.js
git mv tsconfig.json apps/deneb/tsconfig.json
git mv tsconfig.webpack.json apps/deneb/tsconfig.webpack.json
git mv tsconfig.build-scripts.json apps/deneb/tsconfig.build-scripts.json
git mv vitest.root.config.ts apps/deneb/vitest.config.ts
git mv bin/package-custom.ts apps/deneb/bin/package-custom.ts
git mv bin/dev-with-prime.js apps/deneb/bin/dev-with-prime.js
git mv bin/ensure-env.ts apps/deneb/bin/ensure-env.ts
git mv bin/validate-config-for-commit.ts apps/deneb/bin/validate-config-for-commit.ts
git mv bin/config-validation.ts apps/deneb/bin/config-validation.ts
git mv bin/__test__/config-validation.test.ts apps/deneb/bin/__test__/config-validation.test.ts
```

Stays at root (verify untouched afterwards): `package.json`, `turbo.json`, `eslint.config.mjs`, `.env*`, `.github/`, `bin/workspace-eslint.js`, `bin/sync-package-metadata.ts`, `bin/ci-local.js`, `bin/verify-package-parity.ts`, `.syncpackrc`, `.prettierrc`, `benchmarks/`, `docs/`, `.claude/`, and (until Task 7) the dead `webpack.config.js`.

- [ ] **Step 2: Verify the move is pure renames**

Run: `git status --short` — every line should be `R` (rename), no `M`/`A`/`D`.
Run: `git diff --cached --stat | tail -1` — insertions/deletions should be 0 apart from the rename lines (`git diff --cached -M --summary` shows `rename ... (100%)` for every file).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: relocate the visual tree to apps/deneb (pure move) (#757)

git mv only - no content changes. Path fixes, package identity, and
tooling coverage follow in separate commits; the tree does not build
at this commit by design.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Package identity + path fixes — commit 3

**Files:**
- Create: `apps/deneb/package.json`, `tsconfig.build-scripts.json` (new root replacement)
- Modify: `package.json` (root), `apps/deneb/webpack.common.config.js`, `apps/deneb/webpack.dev.config.js`, `apps/deneb/tsconfig.json`, `apps/deneb/bin/ensure-env.ts`, `apps/deneb/bin/validate-config-for-commit.ts`, `apps/deneb/bin/dev-with-prime.js`, `package-lock.json`

- [ ] **Step 1: Create `apps/deneb/package.json`**

The visual's scripts move verbatim except: (a) `test:root` is renamed `test`; (b) `build:package` is redefined via `npx --no turbo` so it works with `cwd = apps/deneb`; (c) there is deliberately **no `dev` script** — `turbo run dev` runs every workspace's `dev` task (the package watchers), so an app-level `dev` that launches `dev-with-prime` (which itself runs `turbo run dev …`) would recurse. The orchestrator keeps the name `dev-with-prime`; the root `dev` shim points at it.

```json
{
    "name": "@deneb-viz/deneb",
    "description": "Deneb - the Power BI custom visual.",
    "version": "2.0.0",
    "private": true,
    "scripts": {
        "package": "npm run ensure-env && npm run build:package && npm run validate-config-for-commit && npm run webpack:package",
        "build:package": "npx --no turbo build --filter=!@deneb-viz/web-client-sample",
        "package-standalone": "cross-env DOTENVX_ENV=.env.standalone npm run build:package && cross-env DOTENVX_ENV=.env.standalone npm run package:standalone",
        "package-alpha": "npm run ensure-env && npm run build:package && npm run package:alpha",
        "package-beta": "npm run ensure-env && npm run build:package && npm run package:beta",
        "package:standalone": "ts-node -P tsconfig.build-scripts.json bin/package-custom --mode standalone",
        "package:alpha": "ts-node -P tsconfig.build-scripts.json bin/package-custom --mode alpha",
        "package:beta": "ts-node -P tsconfig.build-scripts.json bin/package-custom --mode beta",
        "dev-with-prime": "node bin/dev-with-prime.js",
        "webpack:start": "cross-env NODE_ENV=development webpack serve --config webpack.dev.config.js",
        "webpack:build": "cross-env NODE_ENV=development webpack --config webpack.dev.config.js",
        "webpack:prime": "cross-env NODE_ENV=development webpack --config webpack.dev.config.js --env generateResources=true",
        "webpack:package": "cross-env NODE_ENV=production webpack --config webpack.prod.config.js",
        "webpack:analyze": "cross-env NODE_ENV=production webpack --config webpack.prod.config.js --profile --json > webpack-stats.json",
        "ensure-env": "ts-node -P tsconfig.build-scripts.json bin/ensure-env",
        "validate-config-for-commit": "ts-node -P tsconfig.build-scripts.json bin/validate-config-for-commit",
        "eslint": "node ../../bin/workspace-eslint.js",
        "test": "vitest run",
        "test:watch": "vitest"
    }
}
```

Then move the visual-only devDependencies from root into `apps/deneb/package.json` (`devDependencies`, keeping the exact version ranges the root had — syncpack enforces alignment):

`@babel/core, @babel/preset-env, @babel/preset-react, @babel/runtime, @babel/runtime-corejs3, @deneb-viz/app-core, @deneb-viz/configuration, @deneb-viz/data-core, @deneb-viz/json-processing, @deneb-viz/powerbi-compat, @deneb-viz/template-usermeta, @deneb-viz/utils, @deneb-viz/vega-runtime, @dotenvx/dotenvx, @fluentui/react-components, @fluentui/react-icons, @swc/core, @types/d3, @types/lodash, @types/minimist, @types/node, @types/react, @types/react-dom, @types/simple-sha1, add-px-to-style, babel-loader, buffer, cross-env, css-loader, css-minimizer-webpack-plugin, eslint, eslint-plugin-powerbi-visuals, extra-watch-webpack-plugin, fast-equals, git-last-commit, is-what, json-loader, json-stringify-pretty-compact, less, less-loader, lodash, mergician, mini-css-extract-plugin, minimist, powerbi-visuals-api, powerbi-visuals-tools, powerbi-visuals-utils-formattingutils, powerbi-visuals-webpack-plugin, prefix-style, react, react-dom, to-camel-case, ts-loader, ts-node, typescript, vega, vega-embed, vega-lite, vitest, webpack, webpack-bundle-analyzer, webpack-cli, webpack-dev-server, webpack-merge, zustand`

Root **keeps** (delete the rest from root devDependencies): `@types/node, eslint, eslint-import-resolver-typescript, eslint-plugin-import-x, eslint-plugin-powerbi-visuals, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, jszip, prettier, syncpack, ts-node, tsup, turbo, typescript, vitest, rimraf, concurrently, cross-env` — rationale: eslint/typescript/plugin satisfy the MS root-repo requirement; ts-node + typescript + jszip run the root bin scripts; vitest runs `benchmarks/vitest.config.ts`; tsup/rimraf/concurrently are workspace-package tooling hoisted from root today (leave them; removing is out of scope); cross-env stays because `.github` callers may use it transitively (harmless duplicate).

Note: `eslint`, `eslint-plugin-powerbi-visuals`, `typescript`, `ts-node`, `@types/node`, `vitest`, `cross-env` are deliberately declared in **both** manifests (MS file requirements for the visual's own package.json + genuine usage on both sides); syncpack keeps the ranges identical.

- [ ] **Step 2: Rewrite root `package.json` name + scripts**

Change `"name": "@deneb-viz/deneb"` → `"name": "@deneb-viz/monorepo"`.

Replace the root `scripts` block with (workspace scripts kept, visual scripts become delegating shims — `npm run <script> -w @deneb-viz/deneb` runs with `cwd = apps/deneb`, which is what makes icon/locale resolution work):

```json
    "scripts": {
        "package": "npm run package -w @deneb-viz/deneb",
        "dev": "npm run dev-with-prime -w @deneb-viz/deneb",
        "build": "turbo build",
        "eslint": "turbo run eslint -- && npm run -s eslint:root",
        "clean": "turbo run clean",
        "test": "turbo run test",
        "test:watch": "turbo run test:watch",
        "bench": "turbo run bench",
        "bench:compare": "node benchmarks/compare.mjs --results packages/data-core/benchmarks/results/data-core.json --baseline benchmarks/baselines/data-core.json",
        "bench:update-baseline": "node benchmarks/compare.mjs --results packages/data-core/benchmarks/results/data-core.json --baseline benchmarks/baselines/data-core.json --update",
        "test:benchmarks": "vitest run --config benchmarks/vitest.config.ts",
        "build:package": "turbo build --filter=!@deneb-viz/web-client-sample",
        "package-standalone": "npm run package-standalone -w @deneb-viz/deneb",
        "package-alpha": "npm run package-alpha -w @deneb-viz/deneb",
        "package-beta": "npm run package-beta -w @deneb-viz/deneb",
        "eslint:root": "node bin/workspace-eslint.js",
        "webpack:build": "npm run webpack:build -w @deneb-viz/deneb",
        "webpack:package": "npm run webpack:package -w @deneb-viz/deneb",
        "webpack:analyze": "npm run webpack:analyze -w @deneb-viz/deneb",
        "prettier-check": "prettier --config .prettierrc \"apps/deneb/{src,style}/**/{*.ts*,*.css,*.less}\" \"*.{json,md}\" \"apps/deneb/*.{json,md}\" --check",
        "prettier-format": "prettier --config .prettierrc \"apps/deneb/{src,style}/**/{*.ts*,*.css,*.less}\" \"*.{json,md}\" \"apps/deneb/*.{json,md}\" --write",
        "sync-packages": "syncpack fix && npm i",
        "validate-config-for-commit": "npm run validate-config-for-commit -w @deneb-viz/deneb",
        "validate-packages-sync": "syncpack lint",
        "sync:metadata": "ts-node -P tsconfig.build-scripts.json bin/sync-package-metadata.ts",
        "verify-package-parity": "ts-node -P tsconfig.build-scripts.json bin/verify-package-parity.ts",
        "ci:local": "node bin/ci-local.js"
    }
```

Notes: `dev-with-prime` and `test:root` disappear from root (`dev` shim and `turbo run test` cover them). Prettier stays a **single root invocation** with rebased globs rather than moving to the app — `ci:local` passes `-- --end-of-line auto`, and npm appends passthrough args only to the end of a compound script line, so a split root+app prettier would silently drop the flag from one half. The pre-move glob's `spec/` member matched no directory (verified) and is dropped; `bin/` was never in the glob, so coverage is unchanged. `bin/ci-local.js` itself needs **no changes** — every step it runs is a root script name that still exists.

- [ ] **Step 3: Create the new root `tsconfig.build-scripts.json`**

The original moved with the app (it extends the app's `tsconfig.json`). The root's two ts-node consumers (`sync:metadata`, `verify-package-parity`) get a standalone replacement — create `tsconfig.build-scripts.json` at root:

```json
{
    "compilerOptions": {
        "module": "commonjs",
        "moduleResolution": "node",
        "target": "es2021",
        "esModuleInterop": true,
        "skipLibCheck": true,
        "types": ["node"]
    }
}
```

Run: `npm run sync:metadata -- --meta-dry`
Expected: exits 0 (proves root ts-node still resolves; output listing pending metadata sync is fine).

- [ ] **Step 4: Fix `apps/deneb/webpack.common.config.js`**

Add near the top (after the existing `path` require) — and add `fs` if not already required:

```js
const fs = require('fs');
// The app lives at apps/deneb; the shared .env* files and the workspace
// packages/ tree stay at the monorepo root.
const REPO_ROOT = path.resolve(__dirname, '..', '..');
```

Change the dotenv block (lines ~14-16):

```js
        const envPath = process.env.DOTENVX_ENV
            ? path.resolve(REPO_ROOT, process.env.DOTENVX_ENV)
            : path.join(REPO_ROOT, '.env');
```

Change the `ajv` alias (lines ~126-135) to resolve via `REPO_ROOT` **and** fail loudly if the hoisting artifact it points at disappears (adding a workspace can reshuffle npm hoisting and silently swap ajv 8 for the root's ajv 6):

```js
const ajvAliasPath = path.resolve(
    REPO_ROOT,
    'packages',
    'app-core',
    'node_modules',
    'ajv'
);
if (!fs.existsSync(ajvAliasPath)) {
    throw new Error(
        `ajv alias target does not exist: ${ajvAliasPath}. npm hoisting has ` +
            'changed shape - the build would silently bundle the wrong ajv. ' +
            'Investigate before packaging.'
    );
}
```

(place the constant + check at module top level near `REPO_ROOT`, then use `ajv: ajvAliasPath` in the alias object).

Change `resolve.modules` (lines ~111-115) so the workspace root's hoisted modules are explicit:

```js
            modules: [
                'node_modules',
                path.resolve(REPO_ROOT, 'node_modules'),
                path.resolve(__dirname, 'src')
            ],
```

Leave unchanged (all correctly re-anchor to `apps/deneb` via `__dirname`, or are in-package literals): `context`, `tsBuildInfoFile`, output `path` (`.tmp/drop`), `packageOutPath` (`dist`), `pluginLocation`, `configFile: 'tsconfig.webpack.json'`, `pbivizPath`/`capabilitiesPath` literal requires, and `visualSourceLocation = '../../src'` (a metadata string inside the produced package, not a filesystem path — the parity tool proves it in Task 8).

- [ ] **Step 5: Fix `apps/deneb/webpack.dev.config.js` watch paths**

`watchFiles.paths` resolve against the dev server's cwd, which is now `apps/deneb` — rebase the two monorepo-level globs (lines ~74-80):

```js
                paths: [
                    'src/**/*',
                    'style/**/*',
                    'config/**/*',
                    '../../packages/**/dist/**/*',
                    '../../node_modules/@deneb-viz/**/dist/**/*'
                ],
```

- [ ] **Step 6: Fix `apps/deneb/tsconfig.json` extends**

Line 2: `"extends": "./packages/typescript-config/deneb-pbi.json"` → `"extends": "../../packages/typescript-config/deneb-pbi.json"`.
(`tsconfig.webpack.json` and the app's `tsconfig.build-scripts.json` extend `./tsconfig.json` — siblings that moved together; no change.)

- [ ] **Step 7: Fix `apps/deneb/bin/ensure-env.ts`**

`.env` stays at the monorepo root; `__dirname` is now `apps/deneb/bin`, three levels down. Lines 9-11:

```ts
// .env lives at the monorepo root (shared by all apps), three levels up
// from apps/deneb/bin.
const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const ENV_FILE = resolve(ROOT_DIR, '.env');
const ENV_CI_FILE = resolve(ROOT_DIR, '.env.ci');
```

- [ ] **Step 8: Fix `apps/deneb/bin/validate-config-for-commit.ts`**

`import '@dotenvx/dotenvx/config'` loads `.env` from `process.cwd()` — which is now `apps/deneb`, where no `.env` exists. This is the nastiest silent trap: the validator would see an empty env. (It happens to fail loud today only because `LOG_LEVEL` absence is itself an error — do not rely on that.) Replace line 1:

```ts
import { config as dotenvx } from '@dotenvx/dotenvx';
import { resolve } from 'path';
// .env lives at the monorepo root, three levels up from apps/deneb/bin.
dotenvx({ path: resolve(__dirname, '..', '..', '..', '.env'), quiet: true });
```

(rest of the file unchanged; `config-validation.ts` is pure and needs no changes; `package-custom.ts` needs **no changes** — every path in it is relative to `apps/deneb/bin` or to `cwd = apps/deneb`, both of which moved with it.)

- [ ] **Step 9: Fix `apps/deneb/bin/dev-with-prime.js`**

Only the root constant changes meaning — the app root is one level up from `bin/`, exactly as before, and every command it runs (`npm run build:package`, `npm run webpack:prime`, `npx --no turbo run dev webpack:start …`) now exists in the app's own `package.json` (or, for turbo, is found by walking up to the repo root). Rename for clarity, lines 25-26:

```js
const appRoot = path.join(__dirname, '..');
const tmpDir = path.join(appRoot, '.tmp');
```

and replace both `cwd: repoRoot` occurrences (lines ~41 and ~80) with `cwd: appRoot`. Keep the `npx --no turbo` invocation text intact — the certification-and-build invariant test asserts on it.

- [ ] **Step 10: Install and verify a dev build end-to-end**

```
npm install
npm run build:package
npm run webpack:build
```

Expected: install exit 0 (workspace `@deneb-viz/deneb` appears in lockfile); packages build; webpack dev build compiles with `apps/deneb/.tmp/drop/visual.js` produced. If webpack fails on the ajv existence check, that is the check working — inspect hoisting before proceeding.

Also: `npm run validate-config-for-commit` — expected: reads the ROOT `.env` (with dev values it should report the dev flags as errors and exit 1 — that proves it found the file; with `.env.ci` values it exits 0).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: apps/deneb package identity, root shims, and path fixes (#757)

- apps/deneb/package.json owns the visual's scripts (cwd=apps/deneb is
  load-bearing: the packaging plugin resolves stringResources/ and
  assets/icon.png from process.cwd())
- root package.json renamed @deneb-viz/monorepo with delegating shims
  for every externally-used entry point
- .env* stays at the monorepo root; moved configs resolve it via an
  explicit repo-root constant
- ajv hoisting alias now fails the build loudly if its target vanishes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Tooling coverage — commit 4

**Files:**
- Create: `apps/deneb/eslint.config.js`
- Modify: `turbo.json`, `.syncpackrc`, `bin/sync-package-metadata.ts`, `apps/deneb/src/__test__/invariants/_packages.ts`, `apps/deneb/src/__test__/invariants/certification-and-build-invariants.test.ts`, `apps/deneb/src/__test__/invariants/settings-resource-keys.test.ts`, `apps/deneb/src/__test__/invariants/package-lint-coverage.test.ts`

- [ ] **Step 1: `apps/deneb/eslint.config.js`**

CommonJS (the app's package.json has no `"type": "module"`), mirroring the root config's coverage for the moved files — including keeping `bin/**` ignored, because the root config ignored `bin/**` pre-move and this PR must not change lint scope:

```js
const powerbiVisualsConfigs = require('eslint-plugin-powerbi-visuals');

module.exports = [
    powerbiVisualsConfigs.configs.recommended,
    {
        ignores: ['node_modules/**', 'dist/**', '.tmp/**', 'bin/**']
    }
];
```

The app's `eslint` script (`node ../../bin/workspace-eslint.js`) already exists from Task 4 — same pattern as `apps/web-client-sample`. Root `eslint.config.mjs` is **unchanged**: it already ignores `apps/**` and `packages/**`, keeps the powerbi plugin registered at root (MS requirement), and still covers any remaining root-level lintables.

Run (from `apps/deneb`): `node ../../bin/workspace-eslint.js`
Expected: exit 0, no errors.

- [ ] **Step 2: Rewire `turbo.json`**

The `//#`-prefixed root tasks describe scripts that no longer exist on the root package — without this step, `turbo run test` silently stops running the visual's tests. Replace the `tasks` object:

```json
    "tasks": {
        "clean": {
            "cache": false
        },
        "build": {
            "dependsOn": ["^build"],
            "outputs": [".next/**", "!.next/cache/**", "dist/**"]
        },
        "dev": {
            "cache": false,
            "persistent": true,
            "outputs": ["dist/**"]
        },
        "eslint": {
            "dependsOn": ["^eslint"]
        },
        "test": {
            "outputs": ["coverage/**"]
        },
        "bench": {
            "cache": false
        },
        "test:ci": {},
        "test:watch": {
            "outputs": ["coverage/**"],
            "cache": false
        },
        "webpack:start": {
            "cache": false,
            "persistent": true,
            "dependsOn": ["^build"]
        },
        "webpack:build": {
            "cache": false,
            "dependsOn": ["^build"],
            "outputs": [".tmp/**"]
        },
        "webpack:package": {
            "dependsOn": ["^build"],
            "outputs": ["dist/**", ".tmp/**"]
        }
    }
```

(`//#test:root` is gone — the app's `test` script is picked up by the plain `test` task, which loses its `dependsOn` on the deleted root task. The three `webpack:*` defs become plain package tasks so `turbo run dev webpack:start` inside `dev-with-prime` still resolves `webpack:start` — now in `apps/deneb` instead of the root.)

Run: `npx --no turbo run test --dry-run=text | grep -i deneb` (bash) — expected: `@deneb-viz/deneb#test` appears in the task list.

- [ ] **Step 3: Extend syncpack coverage**

`.syncpackrc` `source` (lines 3-6) — the visual's manifest moved out of the literal `"package.json"` entry's reach, and `apps/*` was never covered:

```json
    "source": [
        "package.json",
        "packages/*/package.json",
        "apps/*/package.json"
    ],
```

Run: `npm run validate-packages-sync`
Expected: exit 0. If it reports mismatches in `apps/*` manifests (now visible for the first time — including `apps/web-client-sample`), align versions to the root's ranges in the app manifests; do not change any `packages/*` range in this PR.

- [ ] **Step 4: Extend `bin/sync-package-metadata.ts` to apps**

After line 27 (`const PACKAGES_DIR = …`) add:

```ts
const APPS_DIR = path.join(ROOT, 'apps');
```

and in `main()`, replace the single-directory listing (lines 60-63) with both directories:

```ts
    const packageDirs: string[] = [];
    for (const parent of [PACKAGES_DIR, APPS_DIR]) {
        const entries = await fs.readdir(parent, { withFileTypes: true });
        packageDirs.push(
            ...entries
                .filter((e) => e.isDirectory())
                .map((e) => path.join(parent, e.name))
        );
    }
```

Run: `npm run sync:metadata -- --meta-dry`
Expected: exit 0; it may list `@deneb-viz/deneb` / `@deneb-viz/web-client-sample` as would-update (metadata fields like `author`/`license` now syncable) — apply with `npm run sync:metadata` if so.

- [ ] **Step 5: Re-anchor the invariant helpers and tests**

`apps/deneb/src/__test__/invariants/_packages.ts` — the file now lives five levels below the monorepo root; add an app-root constant beside it (lines 10-14 become):

```ts
/** Absolute path to the monorepo root (this file lives at apps/deneb/src/__test__/invariants). */
export const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');

/** Absolute path to the visual app's root (apps/deneb). */
export const APP_ROOT = join(__dirname, '..', '..', '..');

/** Absolute path to the workspace `packages/` directory. */
export const PACKAGES_DIR = join(REPO_ROOT, 'packages');

/** Absolute path to the workspace `apps/` directory. */
export const APPS_DIR = join(REPO_ROOT, 'apps');
```

and add below `listWorkspacePackages` (same shape, apps dir):

```ts
/** Every immediate `apps/*` directory that contains a package.json. */
export const listWorkspaceApps = (): WorkspacePackage[] =>
    readdirSync(APPS_DIR)
        .map((dir) => ({ dir, path: join(APPS_DIR, dir) }))
        .filter(({ path }) => existsSync(join(path, 'package.json')))
        .map(({ dir, path }) => ({
            dir,
            path,
            manifest: JSON.parse(
                readFileSync(join(path, 'package.json'), 'utf8')
            ) as Manifest
        }));
```

`certification-and-build-invariants.test.ts` — the three reads split between the two roots. The `scripts.package` ordering assertion now targets the **app's** package.json (that is where the pipeline script lives):

```ts
import { APP_ROOT } from './_packages';
```
- line 15: `join(REPO_ROOT, 'src', 'index.ts')` → `join(APP_ROOT, 'src', 'index.ts')`
- line 28: `join(REPO_ROOT, 'package.json')` → `join(APP_ROOT, 'package.json')`
- line 56: `join(REPO_ROOT, 'bin', 'dev-with-prime.js')` → `join(APP_ROOT, 'bin', 'dev-with-prime.js')`
(remove the now-unused `REPO_ROOT` import if nothing else in the file uses it.)

`settings-resource-keys.test.ts` — spans both roots; import `APP_ROOT` alongside `REPO_ROOT`:
- lines 34-40: `SETTINGS_MODEL_DIR = join(APP_ROOT, 'src', 'lib', 'persistence', 'model')`
- lines 48-51: unchanged (`REPO_ROOT/packages/configuration/src/index.ts` — the package did not move)
- lines 59-64: `join(APP_ROOT, 'stringResources', 'en-US', 'resources.resjson')`

`package-lint-coverage.test.ts` — extend to apps. Every app is expected to carry its own lint entry (both current apps do after Step 1); apps are not gated on `isCodePackage` because the visual app has no `build` script by design:

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    isCodePackage,
    listWorkspaceApps,
    listWorkspacePackages
} from './_packages';

const codePackages = listWorkspacePackages().filter(isCodePackage);
const apps = listWorkspaceApps();

describe('lint coverage', () => {
    it('finds code packages (guards against a vacuous canary)', () => {
        expect(codePackages.length).toBeGreaterThan(0);
        expect(apps.length).toBeGreaterThan(0);
    });

    it.each([...codePackages, ...apps])('$dir has an eslint script', (pkg) => {
        expect(pkg.manifest.scripts?.eslint).toBeDefined();
    });

    it.each([...codePackages, ...apps])(
        '$dir has an eslint.config.js',
        (pkg) => {
            expect(existsSync(join(pkg.path, 'eslint.config.js'))).toBe(true);
        }
    );
});
```

(`package-singleton-contract.test.ts` uses only `PACKAGES_DIR`-based helpers — no change; the test run in Step 6 proves it.)

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all packages pass AND `@deneb-viz/deneb#test` runs the moved suites (invariants + src + bin tests) green. A failure in `settings-resource-keys` or `certification-and-build-invariants` means a path in Step 5 is wrong — fix there, not in the assertions.

- [ ] **Step 7: Lint-count acceptance check**

From `apps/deneb` (PowerShell):

```powershell
npx --no eslint . -f json | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).length))"
```

Expected: the number recorded in Task 2 Step 2 (155 at spec time). A lower count means files fell out of the lint gate — stop and reconcile before committing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: tooling coverage for apps/deneb (#757)

- app-level eslint config (powerbi plugin recommended, scope unchanged)
- turbo root-package tasks replaced with app tasks; test graph rewired
- syncpack + metadata sync now cover apps/*
- invariant canaries re-anchored (APP_ROOT beside REPO_ROOT) and lint
  coverage extended to apps

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: CI + docs — commit 5

**Files:**
- Modify: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `CLAUDE.md`, `docs/DEVELOPMENT.md`, `docs/WEBPACK-OPTIMIZATIONS.md`, `CONTRIBUTING.md`

- [ ] **Step 1: CI workflow paths**

Every `npm run <script>` step and the `cp .env.ci .env` steps stay as-is (root shims delegate; `.env` stays at root). Only the literal artifact paths change:

`ci.yml`:
- line ~244: `mv dist/${{ steps.channel.outputs.prefix }}*.pbiviz …` → `mv apps/deneb/dist/${{ steps.channel.outputs.prefix }}*.pbiviz …` (destination `"dist/deneb.…"` → `"apps/deneb/dist/deneb.…"`, and any later step consuming that destination path updated to match)
- line ~330: `require('./pbiviz.json')` → `require('./apps/deneb/pbiviz.json')`
- line ~357: `mv dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A*.pbiviz "dist/…"` → both sides prefixed `apps/deneb/dist/`
- line ~361: `path: dist/deneb.…` → `path: apps/deneb/dist/deneb.…`

`release.yml`:
- line ~70: `require('./pbiviz.json')` → `require('./apps/deneb/pbiviz.json')`
- line ~140: `mv dist/deneb…*.pbiviz` → `mv apps/deneb/dist/deneb…*.pbiviz`
- line ~144: `mv dist/STANDALONE*.pbiviz` → `mv apps/deneb/dist/STANDALONE*.pbiviz`

(`bench-update-baseline.yml` touches nothing that moved — verified; leave it.)

- [ ] **Step 2: Dry-run the release-only globs locally**

These paths only execute on tag pushes, so exercise them now (bash):

```bash
npm run package-alpha
ls apps/deneb/dist/ALPHA*.pbiviz
node -p "require('./apps/deneb/pbiviz.json').visual.version"
```

Expected: an ALPHA artifact exists at the new path and the version prints — the exact expressions CI will run.

- [ ] **Step 3: Update docs**

Grep-driven, same PR (bash):

```bash
grep -n -E "src/index\.ts|webpack\.(common|dev|prod)\.config|pbiviz\.json|capabilities\.json|vitest\.root\.config|bin/(package-custom|dev-with-prime|ensure-env|validate-config|config-validation)|config/features\.json|stringResources|\.tmp/drop" CLAUDE.md docs/DEVELOPMENT.md docs/WEBPACK-OPTIMIZATIONS.md CONTRIBUTING.md
```

For each hit, prefix the moved path with `apps/deneb/` (keep link syntax working). In `CLAUDE.md` also update: the "Root Package (`@deneb-viz/deneb`)" heading (now the app at `apps/deneb`, with root renamed `@deneb-viz/monorepo`), the Monorepo Structure section, and the Troubleshooting mention of `webpack.common.config.js`. In `docs/DEVELOPMENT.md`, sweep the webpack/architecture sections for root-relative paths of moved files. No content rewrites beyond paths and the name change — this PR is a move.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: CI artifact paths and doc references for apps/deneb (#757)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Delete the dead `webpack.config.js` — commit 6

- [ ] **Step 1: Confirm it is dead, then delete**

```bash
grep -rn "webpack.config.js" package.json apps/deneb/package.json .github/ bin/ apps/deneb/bin/ turbo.json
git rm webpack.config.js
```

Expected: the grep finds no functional references (it requires `./webpack.unified.config`, which does not exist anywhere — verified during planning; only ESLint ever touched the file).

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove dead webpack.config.js (#757)

It required ./webpack.unified.config, which does not exist; nothing
invokes it.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Parity proof, full CI, PR

- [ ] **Step 1: Post-move certified build**

Same env swap as Task 2 (PowerShell):

```powershell
Copy-Item .env .env.backup
Copy-Item .env.ci .env
npm run package
Copy-Item .env.backup .env; Remove-Item .env.backup
```

Expected: build succeeds; artifact lands at `apps/deneb/dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.*.pbiviz`.

- [ ] **Step 2: Run the parity tool — the acceptance criterion**

```powershell
npm run verify-package-parity -- dist/baseline-pre-move.pbiviz (Get-Item apps/deneb/dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.*.pbiviz).FullName
```

Expected: **every part PASS, `RESULT: PARITY OK`, exit 0.** Save the full output — it goes in the PR body. Any `DIFF` is a real regression: `content.iconBase64`/`locale.*` → a cwd trap survived; `content.js` → dependency-resolution drift (check the ajv guard); `metadata` → pbiviz/capabilities content changed. Fix the cause; never adjust the tool to pass.

- [ ] **Step 3: Full local CI**

Run: `npm run ci:local`
Expected: ALL CHECKS PASSED (this also satisfies the pre-PR hook, which runs the same gate).

- [ ] **Step 4: Push and raise the PR**

```bash
git push -u origin chore/757-apps-deneb
gh pr create --base main --title "chore: move the visual into apps/deneb (#757)" --body "<body>"
```

PR body: link #757 and the spec doc; state the no-behaviour-change contract; paste the Task 8 Step 2 parity report verbatim; note the follow-up (root script rationalization) is a separate PR; end with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Deliberate simplifications

- No unit-test file for the parity tool: root has no test runner post-move, and the tool's runnable check is the Task 1 Step 3 red/green pair against real artifacts plus its load-bearing use in Task 8.
- Prettier stays one root invocation with rebased globs (not moved to the app) to preserve `ci:local`'s `-- --end-of-line auto` passthrough; coverage is byte-for-byte equivalent to pre-move.
- Root keeps a standalone `tsconfig.build-scripts.json` (8 lines, duplicated in spirit with the app's) rather than inventing shared config plumbing for two scripts.
- Dependency split errs toward "declare in both" for the MS-required toolchain; npm hoisting makes a misplaced devDependency non-fatal, and the parity tool + CI are the backstop.

## Risks → where caught

| Silent regression | Caught by |
|---|---|
| Icon/locales dropped by root-cwd invocation | Parity tool (`content.iconBase64`, `locale.*`) — Task 8 |
| `.env` split from the build | ajv/webpack build failure or `validate-config-for-commit` behaviour — Task 4 Step 10 |
| `src/` out of the cert lint gate | Lint-count check — Task 5 Step 7; `package-lint-coverage` extension |
| ajv hoisting swap | Loud build error (Task 4 Step 4) + `content.js` hash — Task 8 |
| Release-only CI path breakage | Local dry-run — Task 6 Step 2 |
| Invariant tests asserting on moved paths | Full suite — Task 5 Step 6 |
| Turbo root tasks becoming vacuous | `--dry-run` task-graph check — Task 5 Step 2 |
| Prettier/syncpack coverage shrinking | Rebased globs + `validate-packages-sync` — Task 4 Step 2, Task 5 Step 3 |
