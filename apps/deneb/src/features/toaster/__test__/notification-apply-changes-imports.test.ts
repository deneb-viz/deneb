import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression canary for the cold-viewer-load crash fixed by
 * 7c35be4f / ba63f0cf (see docs/solutions/design-patterns/
 * module-level-singleton-escape-hatch-for-context-refs-2026-05-27.md).
 *
 * `NotificationApplyChanges` is mounted on the App shell as a sibling
 * of `RetainedDenebEditor`, so the `SpecificationEditorProvider` is not
 * in its ancestor chain on a cold viewer load. Calling
 * `useSpecificationEditor()` at render time would trip the
 * post-#669 nullable-context guard, throw, and unmount the entire App
 * tree (empty `#deneb-application-wrapper`).
 *
 * The fix swapped the hook for a direct import of
 * `specificationEditorRefs` — the module-level singleton co-located with
 * the provider. This canary locks in the structural invariant so a
 * future refactor that reverts to the hook is caught at CI time,
 * before reaching Power BI Desktop.
 *
 * The workspace lacks `@testing-library/react` in the node test env (see
 * `packages/app-core/src/features/debug-area/components/__tests__/no-data-message.test.tsx`
 * for the established "defer component-tree tests" convention), so this
 * is a static-source check rather than a render test.
 */
describe('NotificationApplyChanges import contract', () => {
    const source = readFileSync(
        resolve(
            __dirname,
            '..',
            'components',
            'notification-apply-changes.tsx'
        ),
        'utf8'
    );

    it('imports `specificationEditorRefs` from `@deneb-viz/app-core`', () => {
        // The module-level singleton is the correct access path for this
        // App-shell consumer — it cannot structurally live under the
        // SpecificationEditorProvider subtree. Asserting the import is
        // present (rather than absent) makes the failure message
        // self-explanatory when someone deletes it by accident.
        expect(source).toMatch(
            /import\s*\{[^}]*\bspecificationEditorRefs\b[^}]*\}\s*from\s*['"]@deneb-viz\/app-core['"]/s
        );
    });

    it('does NOT import `useSpecificationEditor` — that would re-introduce the cold-viewer-load crash', () => {
        // The hook reads `useContext(SpecificationEditorContext)` and
        // throws when the provider is absent (post-#669 the context
        // correctly defaults to `null` and the guard fires). Because
        // this component is mounted outside the provider's subtree, any
        // import of the hook will throw at render time and unmount the
        // App tree. The matcher is anchored on the import statement so
        // string occurrences inside comments do not register.
        expect(source).not.toMatch(
            /import\s*\{[^}]*\buseSpecificationEditor\b[^}]*\}/s
        );
    });
});
