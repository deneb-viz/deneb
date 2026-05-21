# app-core Architecture Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `packages/app-core` into alignment with bulletproof-react layering — `app/` is thin composition, `features/` are self-contained and never cross-import, `shared/` (currently split as `components/` + `lib/`) is the only place primitives live — and lock the layering in with automated enforcement so it cannot regress.

**Architecture:** Six independent phases, each shippable and revertible on its own.
**Phase A** removes dead code. **Phase B** fixes existing layering violations.
**Phase C** promotes feature-weight code out of `app/` and `components/` into `features/`.
**Phase D** tidies `lib/` boundaries. **Phase E** adds ESLint enforcement so future violations fail CI.
**Phase F** documents the model.

**Tech Stack:** TypeScript 5.6, React 19, Vitest, ESLint (root config at `packages/eslint-config`), tsup build. No new runtime dependencies; one dev-dep addition (`eslint-plugin-boundaries`) in Phase E.

---

## Findings: Why This Plan Exists

Confirmed by grep + file inspection on branch `refactor/app-core-normalization`:

| # | Issue | Evidence |
|---|---|---|
| 1 | **Dead duplicate file** | `app/editor/editor-content.tsx` (82 lines) has zero importers; `app/editor/components/editor-content.tsx` (107 lines) is the live copy |
| 2 | **Cross-feature import (1)** | `features/command-bar/components/command-bar.tsx:18` imports `useSpecificationEditor` from `../../specification-editor` |
| 3 | **`lib/` → `features/` wrong-direction** | `lib/commands/actions.ts:10` imports the `SpecificationEditorRefs` type from `features/specification-editor` |
| 4 | **`lib/` → `components/code-editor` typed leak** | `lib/commands/actions.ts:11` imports the `monaco` namespace type from `components/code-editor/monaco-integration` |
| 5 | **`app/editor/` is feature-weight** | `app/editor/hooks/use-editor-pane-layout.ts` is 540 lines (hydration, resize-observer, debounced commits); `editor-pane-layout.tsx` is the layout component itself |
| 6 | **Feature-shaped component in `components/`** | `components/visual-viewer/visual-viewer.tsx` (550 lines) reads Zustand state, manages DPR, throttles updates — feature behavior, not a primitive |
| 7 | **`lib/` is unbounded** | 39 files / 2188 lines across 14 unrelated subfolders (`commands`, `editor-init`, `schema`, `vega`, `i18n`, `perf`, `scrollbars`, …); no rule prevents `lib/` from being a dumping ground |
| 8 | **No automated enforcement** | All layering rules above are convention; nothing in ESLint catches a regression |

**What's already good** (do not change in this plan):
- `app/` top-level (`deneb-editor.tsx`, `deneb-viewer.tsx`, `deneb-provider.tsx`, `gated-deneb-viewer.tsx`, `retained-deneb-editor.tsx`) is correctly thin composition.
- The editor/viewer tree-shaking split via two entry points (`src/index.ts`, `src/editor.ts`) is correct and must be preserved through every move.
- Most features (`debug-area`, `settings-pane`, `editor-area`, `preview-area`, `compiled-vega`, `project-create`, `project-export`, `remap-fields`) have zero cross-feature imports.
- `components/deneb-platform/`, `components/ui/`, `components/template-metadata/`, `components/code-editor/` are correctly shaped as cross-feature primitives.

---

## Architecture Rules (target state)

Dependency direction is strict and single-direction:

```
shared (= components/ + lib/)  ←  features/  ←  app/
            ↑                       ↑              ↑
       no upward            no sideways         entry only
```

Concretely:

| Layer | May import from | May NOT import from |
|---|---|---|
| `app/**` | `features/**`, `components/**`, `lib/**`, `state/**`, `context/**`, `i18n/**`, `catalog/**` | — (top of stack) |
| `features/X/**` | `components/**`, `lib/**`, `state/**`, `context/**`, `i18n/**`, `catalog/**`, sibling files within `features/X/**` | `features/Y/**` (any other feature), `app/**` |
| `components/**` | `lib/**`, `state/**`, `context/**`, `i18n/**`, `catalog/**` | `features/**`, `app/**` |
| `lib/**` | `state/**` (read-only via selectors), `context/**`, `i18n/**`, `catalog/**` | `features/**`, `components/**`, `app/**` |
| `state/**`, `context/**`, `i18n/**`, `catalog/**` | each other, sibling files | `features/**`, `components/**`, `lib/**`, `app/**` |

Two exceptions documented and confined:
1. The root barrel (`src/index.ts`) re-exports some feature primitives as a **transitional API** (already marked `// TEMPORARY API WHILE WE HOIST APP OUT OF POWER BI`). Acceptable; tracked but not removed in this plan.
2. `state/` may import shape types from features only via the `types.ts` of that feature (no UI, no runtime code).

---

## File Structure (target)

Only files that move, are created, or are deleted are listed. Untouched files keep their current paths.

**Phase A — Cleanup**
- Delete: `packages/app-core/src/app/editor/editor-content.tsx`

**Phase B — Fix existing violations**
- Modify: `packages/app-core/src/features/command-bar/components/command-bar.tsx`
- Modify: `packages/app-core/src/features/specification-editor/index.ts` (add `SpecificationEditorRefs` to public types if not already exported)
- Create:  `packages/app-core/src/lib/editor/monaco-types.ts` (re-exports of monaco namespace type for `lib/` consumers)
- Modify: `packages/app-core/src/lib/commands/actions.ts`

**Phase C — Promote to features**
- Move:   `packages/app-core/src/components/visual-viewer/**` → `packages/app-core/src/features/visual-viewer/**`
- Move:   `packages/app-core/src/app/editor/components/editor-pane-layout.tsx` → `packages/app-core/src/features/editor-pane-layout/components/editor-pane-layout.tsx`
- Move:   `packages/app-core/src/app/editor/hooks/use-editor-pane-layout.ts` → `packages/app-core/src/features/editor-pane-layout/hooks/use-editor-pane-layout.ts`
- Move:   `packages/app-core/src/app/editor/hooks/__tests__/use-editor-pane-layout-scaling.test.ts` → `packages/app-core/src/features/editor-pane-layout/hooks/__tests__/use-editor-pane-layout-scaling.test.ts`
- Create:  `packages/app-core/src/features/editor-pane-layout/index.ts`
- Modify: `packages/app-core/src/app/editor/components/editor-content.tsx` (use the moved feature)
- Modify: `packages/app-core/src/app/viewer.tsx` and `packages/app-core/src/features/preview-area/components/preview-area.tsx` (update visual-viewer import paths)
- Modify: `packages/app-core/src/components/visual-viewer/index.ts` (delete after move)

**Phase D — Tidy `lib/`**
- Move:   `packages/app-core/src/lib/editor-init/**` → `packages/app-core/src/lib/monaco/**` (rename only — `editor-init` is Monaco-specific bootstrap)
- Inline + delete: `packages/app-core/src/lib/interface/state.ts` (15 lines) — merge into `packages/app-core/src/lib/interface/constants.ts`
- Modify: all importers of `lib/editor-init` and `lib/interface/state` (codemod-style sweep)

**Phase E — Lint enforcement**
- Modify: `packages/eslint-config/package.json` — add `eslint-plugin-boundaries`
- Modify: `packages/eslint-config/index.js` (or relevant ESLint flat-config file) — add `boundaries/element-types` rule
- Create:  `packages/app-core/.eslintrc.boundaries.cjs` or equivalent override if needed
- Modify: `package.json` root script `eslint` already runs across packages — no change

**Phase F — Documentation**
- Create:  `packages/app-core/ARCHITECTURE.md`
- Modify: `CLAUDE.md` — add a 5-line "Layering" subsection pointing to the new doc

---

## Phase A — Cleanup (1 task, ~5 min)

### Task A1: Delete the dead duplicate `editor-content.tsx`

**Files:**
- Delete: `packages/app-core/src/app/editor/editor-content.tsx`

- [ ] **Step 1: Confirm zero importers**

Run:
```bash
grep -rn "editor/editor-content'" packages/app-core/src --include='*.ts' --include='*.tsx'
grep -rn "from '../editor-content'" packages/app-core/src --include='*.ts' --include='*.tsx'
```
Expected: no output (the live file is at `editor/components/editor-content.tsx`; nothing imports the bare one).

- [ ] **Step 2: Delete the file**

Run:
```bash
rm packages/app-core/src/app/editor/editor-content.tsx
```

- [ ] **Step 3: Build + typecheck + test**

Run:
```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
```
Expected: PASS on both.

- [ ] **Step 4: Commit**

```bash
git add packages/app-core/src/app/editor/editor-content.tsx
git commit -m "chore(app-core): remove dead duplicate editor-content.tsx

The bare file at app/editor/editor-content.tsx had no importers — the
live component is at app/editor/components/editor-content.tsx. Stale
orphan from an earlier refactor."
```

---

## Phase B — Fix Existing Layering Violations (3 tasks)

### Task B1: Eliminate the `command-bar → specification-editor` cross-feature import

**Files:**
- Modify: `packages/app-core/src/features/command-bar/components/command-bar.tsx`
- Modify: `packages/app-core/src/app/editor/components/editor-content.tsx`

**Approach:** The command bar uses `useSpecificationEditor()` to get the editor refs and pass them to command actions. Lift that dependency: the editor refs already live in the `SpecificationEditorProvider` context — pass them down to `<CommandBar>` as a prop from the composing `EditorContent`, which already holds them. This makes the command bar a pure presentation feature receiving refs, not a feature reaching sideways for them.

- [ ] **Step 1: Inspect current usage**

Read `packages/app-core/src/features/command-bar/components/command-bar.tsx` and note exactly where `useSpecificationEditor` is called and what fields it consumes. Expected: a single `editorRefs` call near the top of the component.

- [ ] **Step 2: Add a prop to `<CommandBar>`**

Modify `packages/app-core/src/features/command-bar/components/command-bar.tsx`:

```tsx
// at top, remove the cross-feature import:
- import { useSpecificationEditor } from '../../specification-editor';
+ import type { SpecificationEditorRefs } from '@deneb-viz/app-core/specification-editor-types';
```

Wait — we want to avoid a deep import. Instead:

Modify `packages/app-core/src/features/command-bar/types.ts` (create if absent):

```ts
import type { SpecificationEditorRefs } from '../specification-editor/types';
// no — that's still cross-feature.
```

Correct approach: move the **type** `SpecificationEditorRefs` into a shared location since both `command-bar` and `lib/commands` need it.

Skip ahead to **Task B2** which establishes the shared type, then return here.

- [ ] **Step 3: After B2 lands, update `command-bar.tsx`**

```tsx
// packages/app-core/src/features/command-bar/components/command-bar.tsx
import type { SpecificationEditorRefs } from '../../../lib/editor/specification-editor-refs';

interface CommandBarProps {
    editorRefs: SpecificationEditorRefs;
}

export const CommandBar = ({ editorRefs }: CommandBarProps) => {
    // ... existing body, with the previous `const editorRefs = useSpecificationEditor();` line REMOVED
};
```

- [ ] **Step 4: Update the call site in `EditorContent`**

`packages/app-core/src/app/editor/components/editor-content.tsx`:

```tsx
const editorRefs = useSpecificationEditor();
// ...
<CommandBar editorRefs={editorRefs} />
```

- [ ] **Step 5: Verify no remaining cross-feature imports from command-bar**

Run:
```bash
grep -rEn "from '(\.\./)+(features|specification-editor|debug-area|settings-pane|preview-area|editor-area|compiled-vega|project-create|project-export|remap-fields)/" packages/app-core/src/features/command-bar
```
Expected: no output.

- [ ] **Step 6: Build + test**

```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/app-core/src/features/command-bar/components/command-bar.tsx \
        packages/app-core/src/app/editor/components/editor-content.tsx
git commit -m "refactor(app-core): lift editorRefs to a CommandBar prop

Removes command-bar -> specification-editor cross-feature import. The
editor refs already live in the SpecificationEditorProvider context
held by EditorContent; pass them down as a prop instead of reaching
sideways into another feature."
```

### Task B2: Move `SpecificationEditorRefs` type to a shared location

**Files:**
- Create: `packages/app-core/src/lib/editor/specification-editor-refs.ts`
- Modify: `packages/app-core/src/features/specification-editor/types.ts` (re-export the type from the shared location)
- Modify: `packages/app-core/src/lib/commands/actions.ts` (import from the new shared location)

**Rationale:** The `SpecificationEditorRefs` type describes a contract — the shape of what the specification-editor feature exposes — that two non-feature consumers need (`lib/commands/actions.ts`, `features/command-bar`). A type contract belongs in `lib/`, not in a feature.

- [ ] **Step 1: Read the existing type definition**

Read `packages/app-core/src/features/specification-editor/types.ts` to capture the exact `SpecificationEditorRefs` shape.

- [ ] **Step 2: Create the shared type file**

`packages/app-core/src/lib/editor/specification-editor-refs.ts`:

```ts
/**
 * Contract describing the imperative handles exposed by the
 * specification-editor feature. Lives in lib/ so non-feature consumers
 * (command actions, the command bar) can depend on the shape without
 * importing into a feature module.
 *
 * The specification-editor feature is the authoritative implementer.
 */
import type { editor as MonacoEditor } from 'monaco-editor';

export interface SpecificationEditorRefs {
    // copy exact shape from features/specification-editor/types.ts
    // (see Step 1 — paste fields verbatim, do not paraphrase)
}
```

- [ ] **Step 3: Re-export from the feature to preserve the public surface**

`packages/app-core/src/features/specification-editor/types.ts`:

```ts
export type { SpecificationEditorRefs } from '../../lib/editor/specification-editor-refs';
// remove the original `export interface SpecificationEditorRefs { ... }` block
```

- [ ] **Step 4: Update `lib/commands/actions.ts`**

`packages/app-core/src/lib/commands/actions.ts:10`:

```ts
- import { type SpecificationEditorRefs } from '../../features/specification-editor';
+ import { type SpecificationEditorRefs } from '../editor/specification-editor-refs';
```

- [ ] **Step 5: Verify no `lib/` → `features/` imports remain**

Run:
```bash
grep -rEn "from '(\.\./)+features/" packages/app-core/src/lib
```
Expected: no output.

- [ ] **Step 6: Build + test**

```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/app-core/src/lib/editor/specification-editor-refs.ts \
        packages/app-core/src/features/specification-editor/types.ts \
        packages/app-core/src/lib/commands/actions.ts
git commit -m "refactor(app-core): hoist SpecificationEditorRefs to lib/editor

The contract shape lives in lib/ where both lib/commands and
features/command-bar can depend on it. The specification-editor
feature remains the authoritative implementer and re-exports the
type from its public surface for back-compat."
```

### Task B3: Move the `monaco` namespace re-export out of `components/code-editor`

**Files:**
- Create: `packages/app-core/src/lib/editor/monaco-types.ts`
- Modify: `packages/app-core/src/lib/commands/actions.ts`
- Keep: `packages/app-core/src/components/code-editor/monaco-integration.ts` (no API change — it can still re-export, but `lib/` no longer reaches into `components/`)

**Rationale:** `lib/commands/actions.ts:11` does `import type { monaco } from '../../components/code-editor/monaco-integration'`. `components/` is a sibling layer; `lib/` should not reach sideways. The fix is to have `lib/` own its own monaco type alias.

- [ ] **Step 1: Create the shared types file**

`packages/app-core/src/lib/editor/monaco-types.ts`:

```ts
/**
 * Type-only re-export of the monaco-editor namespace.
 * Imported by lib/ modules that need monaco shapes without pulling
 * in the runtime bootstrap from components/code-editor.
 */
import type * as monaco from 'monaco-editor';

export type { monaco };
```

- [ ] **Step 2: Update `actions.ts`**

`packages/app-core/src/lib/commands/actions.ts`:

```ts
- import type { monaco } from '../../components/code-editor/monaco-integration';
+ import type { monaco } from '../editor/monaco-types';
```

- [ ] **Step 3: Verify no other `lib/` → `components/` imports**

Run:
```bash
grep -rEn "from '(\.\./)+components/" packages/app-core/src/lib
```
Expected: no output.

- [ ] **Step 4: Build + test**

```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/lib/editor/monaco-types.ts \
        packages/app-core/src/lib/commands/actions.ts
git commit -m "refactor(app-core): break lib -> components monaco type leak

lib/commands/actions.ts no longer imports through components/.
lib/editor/monaco-types.ts owns the monaco namespace type alias for
lib/ consumers."
```

---

## Phase C — Promote Feature-Weight Code Out of `app/` and `components/` (2 tasks)

### Task C1: Promote `components/visual-viewer/` → `features/visual-viewer/`

**Files:**
- Move directory: `packages/app-core/src/components/visual-viewer/` → `packages/app-core/src/features/visual-viewer/`
- Modify: `packages/app-core/src/app/viewer.tsx`
- Modify: `packages/app-core/src/features/preview-area/components/preview-area.tsx`
- Modify: any internal imports within the moved tree that used `../../../lib/...` (depth changes by one).

**Rationale:** `components/visual-viewer/visual-viewer.tsx` is 550 lines and reads Zustand state, manipulates `window.devicePixelRatio`, throttles updates, integrates vega-runtime services, and owns scrollbar coordination. That is unambiguously feature behavior. Only two callers (`app/viewer.tsx`, `features/preview-area`), and the previewing-area caller crossing into `components/` is itself a smell that disappears once visual-viewer is a peer feature.

Two callers means **both** end up with a `features/X → features/visual-viewer` import. `app/viewer.tsx` is fine (app can import any feature). `features/preview-area` importing `features/visual-viewer` is a cross-feature import — **see Step 5 below for resolution**.

- [ ] **Step 1: Move the directory**

```bash
git mv packages/app-core/src/components/visual-viewer packages/app-core/src/features/visual-viewer
```

- [ ] **Step 2: Fix import depth inside the moved tree**

Inside the moved tree, any import of the form `from '../../../lib/...'` (three levels up from `components/visual-viewer/components/foo.tsx`) is now correct depth-wise (also three levels up from `features/visual-viewer/components/foo.tsx`). Same for `../../../state`. Verify with:

```bash
grep -rn "from '\.\./\.\./\.\." packages/app-core/src/features/visual-viewer
```
Inspect each result; depth should already be correct. Fix any that aren't.

- [ ] **Step 3: Update `app/viewer.tsx`**

```tsx
- import { VisualViewer } from '../components/visual-viewer';
+ import { VisualViewer } from '../features/visual-viewer';
```
(Exact source path: read `app/viewer.tsx` first; update whatever the current import string is.)

- [ ] **Step 4: Update `features/preview-area/components/preview-area.tsx`**

```tsx
- import { VisualViewer } from '../../../components/visual-viewer';
+ import { VisualViewer } from '../../visual-viewer';
```
**This creates a feature-to-feature import**, which the new architecture rules forbid. Resolve in Step 5.

- [ ] **Step 5: Decide preview-area's relationship to visual-viewer**

Two options. **Pick the first** unless preview-area has substantial behavior of its own beyond rendering visual-viewer:

**Option A (recommended): Merge `features/preview-area` into `features/visual-viewer`.** Inspect `features/preview-area/` — if it is a thin shell around visual-viewer, fold it in. Delete `features/preview-area/`; export from `features/visual-viewer/` whatever `preview-area` was exporting.

**Option B: Have `app/` compose them.** Hoist the `<VisualViewer />` element into the app layer (or into whatever composes `<PreviewArea />`) and pass it as `children` or a render prop. `preview-area` then becomes a layout-only feature.

Run this discovery first:
```bash
wc -l packages/app-core/src/features/preview-area/components/preview-area.tsx
grep -n "VisualViewer\|return\|<" packages/app-core/src/features/preview-area/components/preview-area.tsx
```
If `preview-area.tsx` is < 50 lines and essentially `<div><VisualViewer/></div>`, pick A. Otherwise pick B.

- [ ] **Step 6: Update the root barrel if visual-viewer was exported**

Read `packages/app-core/src/index.ts` and `packages/app-core/src/editor.ts`. If either re-exports anything from `components/visual-viewer`, update the path.

```bash
grep -n "visual-viewer" packages/app-core/src/index.ts packages/app-core/src/editor.ts
```

- [ ] **Step 7: Build + test**

```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
npm run webpack:build
```
Expected: PASS on all three. The webpack build matters here because tree-shaking boundaries between the editor/viewer entries depend on visual-viewer's location.

- [ ] **Step 8: Smoke test in browser (manual)**

```bash
npm run dev
```
Open Power BI pointing at `https://localhost:8080/assets/visual.js`. Verify: visual renders, editor opens, preview pane works, no console errors. If anything's broken, fix before committing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(app-core): promote visual-viewer to a feature

visual-viewer.tsx is 550 lines of stateful behavior (Zustand reads,
DPR management, throttled updates, vega-runtime coordination) — feature
shape, not a primitive. Moves it to features/ and resolves the
preview-area dependency per option [A|B]."
```

### Task C2: Promote `editor-pane-layout` to its own feature

**Files:**
- Move: `app/editor/components/editor-pane-layout.tsx` → `features/editor-pane-layout/components/editor-pane-layout.tsx`
- Move: `app/editor/hooks/use-editor-pane-layout.ts` → `features/editor-pane-layout/hooks/use-editor-pane-layout.ts`
- Move: `app/editor/hooks/__tests__/use-editor-pane-layout-scaling.test.ts` → `features/editor-pane-layout/hooks/__tests__/use-editor-pane-layout-scaling.test.ts`
- Create: `features/editor-pane-layout/index.ts`
- Modify: `app/editor/components/editor-content.tsx`
- Modify: `app/editor/hooks/index.ts` (drop the pane-layout re-export)

**Rationale:** `use-editor-pane-layout.ts` is 540 lines of state management, hydration logic, debounced commits, and resize-observer choreography. The component it powers (`editor-pane-layout.tsx`) is feature behavior. `app/editor/` should be entry-point composition; this is a feature.

- [ ] **Step 1: Create the destination directory and move files**

```bash
mkdir -p packages/app-core/src/features/editor-pane-layout/components
mkdir -p packages/app-core/src/features/editor-pane-layout/hooks/__tests__
git mv packages/app-core/src/app/editor/components/editor-pane-layout.tsx \
       packages/app-core/src/features/editor-pane-layout/components/editor-pane-layout.tsx
git mv packages/app-core/src/app/editor/hooks/use-editor-pane-layout.ts \
       packages/app-core/src/features/editor-pane-layout/hooks/use-editor-pane-layout.ts
git mv packages/app-core/src/app/editor/hooks/__tests__/use-editor-pane-layout-scaling.test.ts \
       packages/app-core/src/features/editor-pane-layout/hooks/__tests__/use-editor-pane-layout-scaling.test.ts
```

- [ ] **Step 2: Create the feature barrel**

`packages/app-core/src/features/editor-pane-layout/index.ts`:

```ts
export { EditorPaneLayout } from './components/editor-pane-layout';
export { useEditorPaneLayout } from './hooks/use-editor-pane-layout';
```

- [ ] **Step 3: Fix imports inside the moved tree**

The hook previously imported `useDenebState` via `'../../../state'` from `app/editor/hooks/use-editor-pane-layout.ts`. At the new location `features/editor-pane-layout/hooks/use-editor-pane-layout.ts`, that path becomes `'../../../state'` — same depth, no change. Verify:

```bash
grep -n "^import" packages/app-core/src/features/editor-pane-layout/hooks/use-editor-pane-layout.ts
grep -n "^import" packages/app-core/src/features/editor-pane-layout/components/editor-pane-layout.tsx
```
Adjust any path that breaks.

- [ ] **Step 4: Update `app/editor/hooks/index.ts`**

Read the current contents. Remove the `useEditorPaneLayout` re-export if present. Keep `useEditorHotkeys`.

- [ ] **Step 5: Update `app/editor/components/editor-content.tsx`**

```tsx
- import { useEditorHotkeys, useEditorPaneLayout } from '../hooks';
- import { EditorPaneLayout } from './editor-pane-layout';
+ import { useEditorHotkeys } from '../hooks';
+ import { EditorPaneLayout, useEditorPaneLayout } from '../../../features/editor-pane-layout';
```

- [ ] **Step 6: Verify no other importers**

```bash
grep -rn "editor-pane-layout\|useEditorPaneLayout" packages/app-core/src --include='*.ts' --include='*.tsx' | grep -v 'features/editor-pane-layout'
```
Expected: only `app/editor/components/editor-content.tsx` and the barrel.

- [ ] **Step 7: Build + test**

```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
npm run webpack:build
```
Expected: PASS.

- [ ] **Step 8: Smoke test**

```bash
npm run dev
```
Open the visual. Drag the editor pane splitters horizontally and vertically. Minimize/restore the debug pane. Resize the iframe. Refresh — viewport sizes should persist. If any layout behavior regresses, fix before committing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(app-core): promote editor-pane-layout to a feature

The 540-line useEditorPaneLayout hook plus its companion component
own pane hydration, debounced size commits, and resize-observer
choreography — feature shape. app/editor/components/editor-content.tsx
now composes the feature instead of hosting it."
```

---

## Phase D — Tidy `lib/` Boundaries (2 tasks)

### Task D1: Rename `lib/editor-init/` → `lib/monaco/`

**Files:**
- Move directory: `packages/app-core/src/lib/editor-init/` → `packages/app-core/src/lib/monaco/`
- Modify: every importer of `lib/editor-init`

**Rationale:** `lib/editor-init/editor-init-service.ts` is 275 lines of Monaco loader bootstrap. The name `editor-init` is vague; `monaco` names what it actually is, which makes the layering boundary self-documenting.

- [ ] **Step 1: Find all importers**

```bash
grep -rn "lib/editor-init\|editor-init/editor-init-service" packages/app-core/src
```
Capture the list.

- [ ] **Step 2: Move the directory**

```bash
git mv packages/app-core/src/lib/editor-init packages/app-core/src/lib/monaco
```

- [ ] **Step 3: Update every importer found in Step 1**

For each path captured in Step 1, run `Edit` on that file replacing `lib/editor-init` with `lib/monaco`.

- [ ] **Step 4: Build + test**

```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(app-core): rename lib/editor-init to lib/monaco

The folder contains Monaco loader bootstrap. The new name says what
it is and tightens the lib/ taxonomy."
```

### Task D2: Inline `lib/interface/state.ts` into `lib/interface/constants.ts`

**Files:**
- Read: `packages/app-core/src/lib/interface/state.ts` (15 lines)
- Read: `packages/app-core/src/lib/interface/constants.ts` (21 lines)
- Modify: `packages/app-core/src/lib/interface/constants.ts`
- Delete: `packages/app-core/src/lib/interface/state.ts`
- Modify: `packages/app-core/src/lib/interface/index.ts` (drop the `./state` re-export)
- Modify: every importer of `lib/interface/state`

**Rationale:** A 15-line file called `state.ts` in a layer that explicitly cannot own state (it's `lib/`, not `state/`) is misleading. Its contents are constants; merge them in.

- [ ] **Step 1: Read both files**

```bash
cat packages/app-core/src/lib/interface/state.ts
cat packages/app-core/src/lib/interface/constants.ts
```
Confirm the contents are constants-shaped (no React, no hooks, no Zustand).

- [ ] **Step 2: Find importers**

```bash
grep -rn "lib/interface/state\|interface/state'" packages/app-core/src
```

- [ ] **Step 3: Append contents to `constants.ts`**

Use `Edit` to append the constants from `state.ts` to the end of `constants.ts`. Preserve existing comments.

- [ ] **Step 4: Delete `state.ts`**

```bash
rm packages/app-core/src/lib/interface/state.ts
```

- [ ] **Step 5: Update barrel**

`packages/app-core/src/lib/interface/index.ts`: remove any line that does `export * from './state'` or `export { ... } from './state'`. The constants now flow through `./constants`.

- [ ] **Step 6: Update importers found in Step 2**

Edit each importer to import from `lib/interface/constants` (or via the `lib/interface` barrel — pick whichever was being used).

- [ ] **Step 7: Build + test**

```bash
npm --workspace=@deneb-viz/app-core run typecheck
npm --workspace=@deneb-viz/app-core run test
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(app-core): inline lib/interface/state.ts into constants.ts

A 15-line state.ts inside lib/ was misleading naming — lib/ does not
own state. Contents were constants; folded into constants.ts."
```

---

## Phase E — Lock the Layering in with ESLint (1 task)

### Task E1: Add `eslint-plugin-boundaries` and enforce layer rules

**Files:**
- Modify: `packages/eslint-config/package.json`
- Modify: `packages/eslint-config/index.js` (or whichever file exports the shared config — verify in Step 1)
- Modify: `packages/app-core/package.json` (if it has its own eslint config, mirror the boundaries config; usually the shared one is enough)

**Rationale:** Conventions decay without enforcement. `eslint-plugin-boundaries` lets ESLint reject any commit that imports across a forbidden layer boundary. Cheap to add, expensive to skip.

- [ ] **Step 1: Read the existing shared ESLint config**

```bash
cat packages/eslint-config/package.json
ls packages/eslint-config
cat packages/eslint-config/index.js 2>/dev/null || cat packages/eslint-config/index.cjs 2>/dev/null
```
Note: flat config vs legacy config. The plugin supports both, but the configuration shape differs. Pick the matching style.

- [ ] **Step 2: Add the dependency**

`packages/eslint-config/package.json` — add to `dependencies` (or `peerDependencies`, matching the existing convention for `@typescript-eslint/*`):

```json
"eslint-plugin-boundaries": "^5.0.0"
```

Then:
```bash
npm install
```

- [ ] **Step 3: Add the boundaries config**

Append to the shared ESLint config — this assumes flat config; adapt to legacy if needed:

```js
// packages/eslint-config/index.js
import boundaries from 'eslint-plugin-boundaries';

export default [
    // ...existing config...
    {
        files: ['packages/app-core/src/**/*.{ts,tsx}'],
        plugins: { boundaries },
        settings: {
            'boundaries/elements': [
                { type: 'app',        pattern: 'packages/app-core/src/app/**' },
                { type: 'feature',    pattern: 'packages/app-core/src/features/*/**' },
                { type: 'components', pattern: 'packages/app-core/src/components/**' },
                { type: 'lib',        pattern: 'packages/app-core/src/lib/**' },
                { type: 'state',      pattern: 'packages/app-core/src/state/**' },
                { type: 'context',    pattern: 'packages/app-core/src/context/**' },
                { type: 'i18n',       pattern: 'packages/app-core/src/i18n/**' },
                { type: 'catalog',    pattern: 'packages/app-core/src/catalog/**' }
            ]
        },
        rules: {
            'boundaries/element-types': ['error', {
                default: 'disallow',
                rules: [
                    // app can import from anything below it
                    { from: 'app',        allow: ['feature', 'components', 'lib', 'state', 'context', 'i18n', 'catalog'] },
                    // features cannot import other features
                    { from: 'feature',    allow: ['components', 'lib', 'state', 'context', 'i18n', 'catalog'] },
                    // components is a primitive layer
                    { from: 'components', allow: ['lib', 'state', 'context', 'i18n', 'catalog'] },
                    // lib never imports up
                    { from: 'lib',        allow: ['state', 'context', 'i18n', 'catalog'] },
                    // leaf layers may import each other and self
                    { from: 'state',      allow: ['context', 'i18n', 'catalog'] },
                    { from: 'context',    allow: ['i18n', 'catalog'] },
                    { from: 'i18n',       allow: ['catalog'] },
                    { from: 'catalog',    allow: [] }
                ]
            }],
            'boundaries/no-unknown': 'off',
            'boundaries/no-unknown-files': 'off'
        }
    }
];
```

If features need a same-feature self-import allowance (sibling files within `features/X/`), the plugin's default behavior already permits that — same element instance counts as the same element, not a cross-boundary import.

- [ ] **Step 4: Run ESLint and fix any remaining violations**

```bash
npm run eslint
```
Expected: PASS. If anything fails, those are real violations missed by manual audit — fix them or document why an exception is justified.

- [ ] **Step 5: Add a regression test**

Append to `packages/app-core/__tests__/architecture-boundaries.test.ts` (create the file):

```ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('architecture boundaries', () => {
    it('app-core enforces layered dependencies via eslint-plugin-boundaries', () => {
        // Run ESLint over the app-core source tree and assert the
        // boundaries rule reports zero errors. This is the canary for
        // the layering rules established in ARCHITECTURE.md.
        const result = execSync(
            'npx eslint packages/app-core/src --rule "boundaries/element-types: error" --no-error-on-unmatched-pattern',
            { cwd: process.cwd(), encoding: 'utf8' }
        );
        expect(result).toEqual('');
    });
});
```

Adjust the command above to match the project's actual ESLint invocation pattern (check `package.json` `eslint` script for the exact form).

- [ ] **Step 6: Run the test**

```bash
npm --workspace=@deneb-viz/app-core run test -- architecture-boundaries
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build(eslint): enforce app-core layering with eslint-plugin-boundaries

Adds shared eslint-plugin-boundaries config covering app-core's six
layers: app, features, components, lib, state, context, i18n, catalog.
Dependency direction is strict and single-direction; cross-feature
imports and lib->features/components imports now fail CI. Includes a
vitest canary that reruns the boundaries rule so the layering is
covered by the existing test gate too."
```

---

## Phase F — Document the Model (1 task)

### Task F1: Add `ARCHITECTURE.md` and link from CLAUDE.md

**Files:**
- Create: `packages/app-core/ARCHITECTURE.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write `packages/app-core/ARCHITECTURE.md`**

```markdown
# app-core Architecture

`@deneb-viz/app-core` is structured as a six-layer bulletproof-react-style application.

## Layers

| Layer | Purpose | Examples |
|---|---|---|
| `app/` | Entry-point composition. Thin, mostly wiring. | `deneb-editor.tsx`, `deneb-viewer.tsx`, `editor/components/editor-content.tsx` |
| `features/X/` | Self-contained feature module. Owns its components, hooks, types. | `features/debug-area`, `features/settings-pane`, `features/visual-viewer` |
| `components/` | Cross-feature primitives. No business logic. | `components/ui`, `components/deneb-platform`, `components/code-editor` |
| `lib/` | Pure utilities and platform-agnostic services. | `lib/commands`, `lib/monaco`, `lib/schema`, `lib/perf` |
| `state/`, `context/`, `i18n/`, `catalog/` | Cross-cutting shared resources. | Zustand slices, contexts, locale strings, template catalogs |

## Dependency Direction

Imports flow strictly downward:

```
app  →  features  →  components  →  lib  →  state/context/i18n/catalog
```

- `app/` may import from any layer below it.
- `features/X/` may NOT import from `features/Y/`. To compose two features, host them in `app/`.
- `components/` and `lib/` may NOT import from `features/` or `app/`.
- `state/` exposes typed selectors; it does not import from `features/`, `components/`, `lib/`, or `app/`.

## Enforcement

`eslint-plugin-boundaries` (configured in `packages/eslint-config`) fails CI on any cross-layer or cross-feature import. A vitest canary (`packages/app-core/__tests__/architecture-boundaries.test.ts`) reruns the rule so the gate is covered by the test suite too.

## Where Does New Code Go?

- **New piece of UI that is only used in one place** — put it inside the feature that uses it.
- **New piece of UI shared by multiple features** — `components/`.
- **New pure helper / service** — `lib/`.
- **New Zustand slice** — `state/`.
- **Composition of multiple features into a screen** — `app/`.

If you are unsure, the test is "would another feature ever need this?". Yes → `components/` or `lib/`. No → keep it in the feature.

## Known Transitional Exceptions

- The root barrel `src/index.ts` re-exports some feature primitives for the Power BI host shell. These are marked `// TEMPORARY API WHILE WE HOIST APP OUT OF POWER BI` and tracked for removal.
```

- [ ] **Step 2: Link from CLAUDE.md**

Modify `CLAUDE.md` — add this subsection under "High-Level Architecture", after the "Workspace Packages" list:

```markdown
### app-core Layering

`@deneb-viz/app-core` follows a strict six-layer model: `app/ → features/ → components/ → lib/ → state/context/i18n/catalog`. Cross-feature imports and upward imports are rejected by ESLint. Full details: [packages/app-core/ARCHITECTURE.md](packages/app-core/ARCHITECTURE.md).
```

- [ ] **Step 3: Commit**

```bash
git add packages/app-core/ARCHITECTURE.md CLAUDE.md
git commit -m "docs(app-core): document the six-layer architecture

Captures the bulletproof-react layering, dependency direction,
enforcement mechanism, and a 'where does new code go?' guide so
future contributors don't have to reverse-engineer the rules."
```

---

## Self-Review

**1. Spec coverage:** Every finding (1–8) in the "Findings" table maps to a task: F1→A1, F2→B1, F3→B2, F4→B3, F5→C2, F6→C1, F7→D1+D2, F8→E1. F also adds the documentation gap (no doc explained the layering).

**2. Placeholder scan:** Three places where the exact code depends on reading current files first — flagged in steps (B2 Step 2 needs the `SpecificationEditorRefs` shape copied verbatim; D1 Step 1 needs the importer list; D2 Step 3 needs the constants from the two files). Each step states explicitly what to read and what to paste; no TBDs.

**3. Type consistency:** `SpecificationEditorRefs` is the only cross-task type. Defined in B2, consumed in B1 and B3 (and unchanged in `lib/commands/actions.ts` after B2). Phase C tasks add no new types. Phase E adds the `boundaries` element-types vocabulary used nowhere else. Consistent.

**4. Risk-ordered:** Phase A is lowest risk (delete unused). B is type-only moves (no runtime change). C is the highest-risk phase (real file moves, webpack-bundle-shape changes) — gated with both unit tests and manual smoke. D is rename + inline (low risk). E is build-only. F is docs.

**5. Independence:** Each phase ships and ships alone. Phase C can land without Phase B if Phase B is too contentious, and vice versa. Phase E should land after C/D so it doesn't reject the moves themselves.

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-05-21-app-core-architecture-normalization.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
