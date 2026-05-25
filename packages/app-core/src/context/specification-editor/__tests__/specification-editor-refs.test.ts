import { describe, expect, it } from 'vitest';

import { specificationEditorRefs } from '../specification-editor-context';

/**
 * Locks in the direct-import contract for `specificationEditorRefs` —
 * the module-level singleton that exists so platform-level surfaces
 * mounted outside the `SpecificationEditorProvider` subtree (notably
 * the unapplied-changes toast on the App shell) can read the Monaco
 * refs without calling `useSpecificationEditor()` and tripping its
 * provider-missing guard.
 *
 * The hook + guard remain in place for editor-tree consumers — see
 * `use-specification-editor.test.ts` for the guard contract — but
 * structurally-outside callers consume this export instead.
 *
 * Background: a previous truthy-sentinel default
 * (`{} as SpecificationEditorRefs`) silently masked an out-of-provider
 * caller. The post-fix nullable default made that caller throw and
 * unmount the entire App tree on cold viewer loads. The escape hatch
 * documented here is the deliberate, narrow fix — callers that cannot
 * structurally live under the provider read the module-level singleton
 * directly.
 */
describe('specificationEditorRefs', () => {
    it('exposes both `spec` and `config` ref handles', () => {
        expect(specificationEditorRefs).toBeDefined();
        expect(specificationEditorRefs.spec).toBeDefined();
        expect(specificationEditorRefs.config).toBeDefined();
    });

    it('each handle is a React-shaped ref object with a `current` property', () => {
        // We assert the shape rather than `instanceof` — `createRef`
        // returns a plain object with a `current` accessor and React
        // does not export a public ref class.
        expect(specificationEditorRefs.spec).toHaveProperty('current');
        expect(specificationEditorRefs.config).toHaveProperty('current');
    });

    it('starts with `current === null` before any Monaco instance mounts', () => {
        // Cold-load expectation: no editor has populated the refs yet.
        // The toast's click handlers must tolerate this state — the
        // pre-#669 silent-empty behaviour relied on the same thing,
        // and the post-fix direct-import path preserves it.
        expect(specificationEditorRefs.spec.current).toBeNull();
        expect(specificationEditorRefs.config.current).toBeNull();
    });

    it('is a stable module-level singleton across imports', async () => {
        // Re-importing the module must yield the same object identity
        // — otherwise the provider and the direct-import callers would
        // see different ref instances and the toast's apply handler
        // would read a stale `.current`.
        const reimported = await import('../specification-editor-context');
        expect(reimported.specificationEditorRefs).toBe(
            specificationEditorRefs
        );
    });
});
