# Byte-Faithful Packaging Revert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/deneb/bin/package-custom.ts`'s cleanup restore `pbiviz.json`, `config/features.json` and `capabilities.json` byte-for-byte, so alpha/beta/standalone builds no longer leave the three files cosmetically modified.

**Architecture:** Capture each file's raw string content at startup alongside the parsed copies (which the patching logic keeps using); `cleanup()` writes those exact strings back via a new `restoreFile` helper instead of `JSON.stringify(parsed, null, 4)`. Transient patched writes keep using `writeFile`/`JSON.stringify` — only the revert path changes.

**Tech Stack:** Node `fs`, ts-node script (runs with `cwd = apps/deneb`).

**Spec:** [docs/brainstorms/2026-09-14-tsup-migration-and-package-revert-requirements.md](../brainstorms/2026-09-14-tsup-migration-and-package-revert-requirements.md) (PR A section)

---

## Preconditions

- Branch `fix/package-custom-revert-bytes` off `main` (spec committed at 50507ae8). Clean tree; `npm install` current.
- All paths in `package-custom.ts` are relative to `cwd = apps/deneb` (npm workspace invocation guarantees this).

### Task 1: Open the public issue

- [ ] **Step 1: Create it**

```bash
gh issue create --title "Custom packaging builds leave pbiviz.json / capabilities.json / features.json reformatted" --body "Running \`npm run package-alpha\` (or \`-beta\` / \`-standalone\`) leaves \`apps/deneb/pbiviz.json\`, \`apps/deneb/capabilities.json\` and \`apps/deneb/config/features.json\` showing as modified in \`git status\`, even though the build \"reverts\" them.

Cause: \`apps/deneb/bin/package-custom.ts\` restores the files by re-serializing the parsed originals with \`JSON.stringify(original, null, 4)\`, which expands inline-formatted objects and drops the trailing newline — the content is identical, the bytes are not.

Fix: capture the raw file contents at startup and have cleanup write those exact bytes back."
```

Record the issue number as `<N>` — the commit and PR reference it.

---

### Task 2: The fix

**Files:**
- Modify: `apps/deneb/bin/package-custom.ts` (constants block ~lines 9–17; `cleanup` ~lines 46–55; helper added beside `writeFile` ~lines 57–62)

- [ ] **Step 1: Reproduce the defect (red)**

```powershell
npm run package-alpha
git status --short
```

Expected: build succeeds and `git status` shows `apps/deneb/pbiviz.json`, `apps/deneb/capabilities.json`, `apps/deneb/config/features.json` as modified (`git diff` shows formatting-only churn: expanded inline objects / missing trailing newline). Restore before continuing: `git checkout -- apps/deneb/pbiviz.json apps/deneb/capabilities.json apps/deneb/config/features.json`.

- [ ] **Step 2: Capture raw originals at startup**

In `apps/deneb/bin/package-custom.ts`, directly after the existing originals block —

old:

```ts
const pbivizOriginal = require(`../${pbivizFile}`);
const featuresOriginal = require(`../config/${featuresFile}`);
const capabilitiesOriginal = require(`../${capabilitiesFile}`);
```

new:

```ts
const pbivizOriginal = require(`../${pbivizFile}`);
const featuresOriginal = require(`../config/${featuresFile}`);
const capabilitiesOriginal = require(`../${capabilitiesFile}`);
// Raw file contents, captured before any patching so cleanup can restore
// them byte-for-byte. Re-serializing the parsed originals would expand
// inline-formatted objects and drop the trailing newline, leaving the
// files cosmetically modified after every custom package build.
const pbivizOriginalRaw = fs.readFileSync(
    `${pbivizFilePath}/${pbivizFile}`,
    'utf8'
);
const featuresOriginalRaw = fs.readFileSync(
    `${featuresFilePath}/${featuresFile}`,
    'utf8'
);
const capabilitiesOriginalRaw = fs.readFileSync(
    `${capabilitiesFilePath}/${capabilitiesFile}`,
    'utf8'
);
```

- [ ] **Step 3: Restore raw bytes in cleanup**

Old `cleanup` (uses `writeFile`, which stringifies):

```ts
const cleanup = () => {
    console.log('Performing cleanup...');
    writeFile(pbivizFile, pbivizFilePath, pbivizOriginal);
    console.log(`${pbivizFile} reverted`);
    writeFile(featuresFile, featuresFilePath, featuresOriginal);
    console.log(`${featuresFile} reverted`);
    writeFile(capabilitiesFile, capabilitiesFilePath, capabilitiesOriginal);
    console.log(`${capabilitiesFile} reverted`);
};
```

new:

```ts
const cleanup = () => {
    console.log('Performing cleanup...');
    restoreFile(pbivizFile, pbivizFilePath, pbivizOriginalRaw);
    console.log(`${pbivizFile} reverted`);
    restoreFile(featuresFile, featuresFilePath, featuresOriginalRaw);
    console.log(`${featuresFile} reverted`);
    restoreFile(capabilitiesFile, capabilitiesFilePath, capabilitiesOriginalRaw);
    console.log(`${capabilitiesFile} reverted`);
};

// Restore a file's original bytes exactly as captured at startup.
const restoreFile = (name: string, path: string, rawContent: string) => {
    fs.writeFileSync(`${path}/${name}`, rawContent);
};
```

(`writeFile` stays as-is — the transient patched writes still use it. Note `cleanup` references `restoreFile` before its declaration; that matches the file's existing style, where `cleanup` already references `writeFile` declared below it — `const` hoisting is safe here because nothing runs until the try block at the bottom.)

- [ ] **Step 4: Verify the fix (green)**

```powershell
npm run package-alpha
git status --short
```

Expected: build succeeds; `git status` shows NO modifications to the three files (only the untracked build outputs). Also spot-check the trailing newline survived: `git diff --stat` empty for the three files.

- [ ] **Step 5: Suite, lint, format**

Run: `npm run test` — expected all green (the app suite includes `bin/__test__`; nothing asserts on `package-custom.ts` internals, so this is a regression sweep).
Run: `npx prettier --check apps/deneb/bin/package-custom.ts` — expected clean (`--write` that one file if not; `bin/` is outside the enforced glob but keep it clean).

- [ ] **Step 6: Commit**

```bash
git add apps/deneb/bin/package-custom.ts
git commit -m "fix: restore original bytes when reverting packaging patches (#<N>)

package-custom.ts reverted pbiviz.json, capabilities.json and
config/features.json by re-serializing the parsed originals, which
expanded inline-formatted objects and dropped the trailing newline -
leaving the files cosmetically modified after every alpha/beta/
standalone build. Cleanup now writes back the raw bytes captured at
startup; the transient patched writes are unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Substitute `<N>` with the Task 1 issue number.)

---

### Task 3: CI gate and PR

- [ ] **Step 1: Full local CI**

Run: `npm run ci:local`
Expected: ALL CHECKS PASSED.

- [ ] **Step 2: Push and raise the PR**

```bash
git push -u origin fix/package-custom-revert-bytes
gh pr create --base main --title "fix: byte-faithful revert of packaging-patched JSON files (#<N>)" --body "<body>"
```

PR body: closes #\<N\>; the defect/cause/fix summary from the issue; before/after evidence (`git status` dirty → clean after `package-alpha`); note the spec doc covers this and the upcoming #750 work; end with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Deliberate simplifications

- No unit test: the acceptance check is the exact user-visible symptom (`package-alpha` then clean `git status`), run red before and green after; extracting a testable helper for a three-line byte-restore would be scaffolding for its own sake.
- `writeFile`'s misleading `content: string` typing (it receives objects) is left alone — pre-existing, out of scope, and disappears from the revert path anyway.

## Risks → where caught

| Risk | Caught by |
|---|---|
| Raw capture happens after a patch write (stale "originals") | Capture sits in the module-top constants block, before `getLastCommit`'s callback runs any write |
| Revert path misses a file | Red/green check covers all three files via the real build |
| Behavior change in patched output | Patched writes untouched; `ci:local` packages end-to-end |
