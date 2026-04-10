# $schema Property Warning + Quick Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Monaco warning marker + quick fix code action for `$schema` properties in both Spec and Config editors, guiding users to remove the property since Deneb manages schemas internally.

**Architecture:** A new module registers a `CodeActionProvider` with Monaco and exports a function that sets/clears model markers based on JSONC parsing of the editor content. The spec editor component calls this function on mount and content changes. The code action uses `jsonc-parser`'s `modify` + `applyEdits` to cleanly remove the `$schema` property.

**Tech Stack:** Monaco Editor API (`setModelMarkers`, `registerCodeActionProvider`, `WorkspaceEdit`), `jsonc-parser` (`parseTree`, `findNodeAtLocation`, `modify`, `applyEdits`)

---

### Task 1: Add codeAction feature to Monaco bundle

**Files:**
- Modify: `packages/app-core/src/components/code-editor/monaco-integration.ts:42-43`

- [ ] **Step 1: Add the import**

In `packages/app-core/src/components/code-editor/monaco-integration.ts`, after the `/* go to error */` import (line 44), add:

```typescript
/* code actions (quick fixes) */
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionContributions';
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile. The code action lightbulb feature is now available in Monaco.

- [ ] **Step 3: Commit**

```
feat(app-core): include codeAction feature in Monaco bundle
```

---

### Task 2: Add i18n keys

**Files:**
- Modify: `packages/app-core/src/i18n/en-US.json`

- [ ] **Step 1: Add the translation keys**

Add to `packages/app-core/src/i18n/en-US.json`:

```json
"Text_Diagnostic_SchemaProperty_Warning": "The $schema property is not needed in Deneb. Deneb manages Vega and Vega-Lite schemas internally for auto-completion and validation. Including $schema can cause issues in environments where external requests are blocked. Use the quick fix to remove it. The export process will add it back automatically for compatibility.",
"Text_Diagnostic_SchemaProperty_QuickFix": "Remove $schema (Deneb manages schemas internally)"
```

- [ ] **Step 2: Commit**

```
feat(i18n): add $schema diagnostic warning and quick fix messages
```

---

### Task 3: Create the $schema diagnostic + code action module

**Files:**
- Create: `packages/app-core/src/lib/editor/schema-property-diagnostic.ts`

- [ ] **Step 1: Create the module**

Create `packages/app-core/src/lib/editor/schema-property-diagnostic.ts`:

```typescript
import { parseTree, findNodeAtLocation, modify, applyEdits } from 'jsonc-parser';
import { monaco } from '../../components/code-editor/monaco-integration';
import { getDenebState } from '../../state';

const DIAGNOSTIC_SOURCE = 'deneb';
const SCHEMA_DIAGNOSTIC_CODE = 'deneb.schema-property';

/**
 * Check the editor model for a root-level $schema property and set/clear
 * a warning marker accordingly. Call on mount and on content change.
 */
export const updateSchemaPropertyMarkers = (
    model: monaco.editor.ITextModel
): void => {
    const content = model.getValue();
    const tree = parseTree(content);
    if (!tree) {
        monaco.editor.setModelMarkers(model, DIAGNOSTIC_SOURCE, []);
        return;
    }
    const schemaNode = findNodeAtLocation(tree, ['$schema']);
    if (!schemaNode) {
        monaco.editor.setModelMarkers(model, DIAGNOSTIC_SOURCE, []);
        return;
    }
    // The schemaNode is the value node. Its parent is the property node
    // which includes the key. Use the parent's offset/length for the
    // full property range (key + colon + value).
    const propertyNode = schemaNode.parent;
    const node = propertyNode ?? schemaNode;
    const startPos = model.getPositionAt(node.offset);
    const endPos = model.getPositionAt(node.offset + node.length);
    const { translate } = getDenebState().i18n;
    monaco.editor.setModelMarkers(model, DIAGNOSTIC_SOURCE, [
        {
            severity: monaco.MarkerSeverity.Warning,
            message: translate('Text_Diagnostic_SchemaProperty_Warning'),
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
            code: SCHEMA_DIAGNOSTIC_CODE,
            source: DIAGNOSTIC_SOURCE
        }
    ]);
};

/**
 * Register a CodeActionProvider for JSON models that offers a quick fix
 * to remove the $schema property. Call once during editor initialization.
 */
export const registerSchemaPropertyCodeActionProvider = (): void => {
    monaco.languages.registerCodeActionProvider('json', {
        provideCodeActions(model, _range, context) {
            const marker = context.markers.find(
                (m) => m.code === SCHEMA_DIAGNOSTIC_CODE
            );
            if (!marker) return { actions: [], dispose() {} };

            const content = model.getValue();
            const edits = modify(content, ['$schema'], undefined, {});
            const newContent = applyEdits(content, edits);

            const { translate } = getDenebState().i18n;
            const fullRange = model.getFullModelRange();
            const action: monaco.languages.CodeAction = {
                title: translate('Text_Diagnostic_SchemaProperty_QuickFix'),
                diagnostics: [marker],
                kind: 'quickfix',
                edit: {
                    edits: [
                        {
                            resource: model.uri,
                            textEdit: {
                                range: fullRange,
                                text: newContent
                            },
                            versionId: model.getVersionId()
                        }
                    ]
                },
                isPreferred: true
            };
            return { actions: [action], dispose() {} };
        }
    });
};
```

Key design decisions:
- `updateSchemaPropertyMarkers` is a standalone function (not a class) — called from the editor component
- `registerSchemaPropertyCodeActionProvider` is called once at init — registers globally for all JSON models
- The code action replaces the entire model content with the JSONC-edited result (using `modify` + `applyEdits`), which handles comma cleanup
- `isPreferred: true` makes it the default quick fix (Ctrl+. selects it immediately)
- The marker covers the full property node (key + value), not just the value

- [ ] **Step 2: Verify the module compiles**

Run: `npm run webpack:build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```
feat(app-core): add $schema property diagnostic and quick fix module
```

---

### Task 4: Wire up the diagnostic in the spec editor

**Files:**
- Modify: `packages/app-core/src/features/specification-editor/components/specification-json-editor.tsx:8,92-117,120-149`

- [ ] **Step 1: Add imports**

In `specification-json-editor.tsx`, add after the existing imports (line 13):

```typescript
import {
    updateSchemaPropertyMarkers,
    registerSchemaPropertyCodeActionProvider
} from '../../../lib/editor/schema-property-diagnostic';
```

- [ ] **Step 2: Register the code action provider on mount**

In the `handleOnMount` callback (line 92), add after `ref.current = editor;` (line 93):

```typescript
        // Register $schema quick fix provider (idempotent — Monaco deduplicates)
        registerSchemaPropertyCodeActionProvider();
        // Check for $schema on initial load
        const model = editor.getModel();
        if (model) {
            updateSchemaPropertyMarkers(model);
        }
```

- [ ] **Step 3: Update markers on content change**

In the `handleOnChange` callback (line 120), update it to also refresh markers:

```typescript
    const handleOnChange = useCallback<OnChange>((value, event) => {
        setEditorText(() => value);
        // Refresh $schema markers on every content change
        const model = ref.current?.getModel();
        if (model) {
            updateSchemaPropertyMarkers(model);
        }
    }, []);
```

Note: the `OnChange` type from `@monaco-editor/react` provides `(value: string | undefined, event: monaco.editor.IModelContentChangedEvent)`. We add `event` to the signature but only use the model from `ref.current`.

- [ ] **Step 4: Verify build and test manually**

Run: `npm run webpack:build`
Expected: Clean compile.

Manual test: Open Deneb editor, paste a spec with `"$schema": "https://vega.github.io/schema/vega-lite/v5.json"` — should see a yellow squiggle on the `$schema` line. Click the lightbulb (or Ctrl+.) → "Remove $schema" quick fix removes the property cleanly.

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: All pass.

- [ ] **Step 6: Commit**

```
feat(app-core): wire $schema diagnostic into Spec and Config editors
```

---

## Verification

1. **Spec editor with $schema**: Paste a Vega-Lite spec containing `$schema` → yellow squiggle appears on the property line
2. **Config editor with $schema**: Paste `{"$schema": "...", "background": "white"}` into config → same warning
3. **Quick fix**: Click lightbulb or Ctrl+. on the warning → "Remove $schema" action appears → applying it removes the property cleanly (no trailing comma, no blank line)
4. **No $schema**: Editor with no `$schema` property → no markers, no lightbulb
5. **Auto-clear**: Remove `$schema` manually → warning disappears immediately
6. **Dark mode**: Warning squiggle and lightbulb render correctly in dark theme
7. **Template import**: Import a template → `$schema` is stripped during import → no warning in editor
8. **Template export**: Export → `$schema` is added back to the exported file
