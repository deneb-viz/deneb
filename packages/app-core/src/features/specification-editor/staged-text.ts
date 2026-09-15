import { type EditorPaneRole } from '../../lib';
import { type StoreState } from '../../state/state';

/**
 * The slice of store state {@link resolveStagedTextForRole} needs: the
 * staged spec/config text (`editor.stagedSpec`/`stagedConfig`, set by the
 * staged-text subscription registered in `state/install-editor-state.ts`
 * whenever `initializeFromTemplate`/`setContent` run) and the persisted
 * spec/config (`project.spec`/`config`) to fall back to when nothing is
 * staged. A `Pick` rather than the full `StoreState` so callers can pass
 * either the whole store snapshot or a narrower object with just these two
 * slices.
 */
type StagedTextSource = Pick<StoreState, 'editor' | 'project'>;

/**
 * Resolves the text that should be shown for a given editor role: the
 * staged spec/config if one has been staged, otherwise the persisted
 * project spec/config.
 *
 * Extracted from `specification-json-editor.tsx`, where it was duplicated
 * between the `project.initializationCount` sync effect (a ternary) and
 * `getDefaultValue` (a switch) — both computed the same "staged, falling
 * back to persisted" resolution for the same two roles, just with
 * different syntax and, for the unused `Settings` role, different
 * fallback behaviour. This is now the single source of truth for both
 * call sites; `Settings` explicitly resolves to `undefined` (matching
 * `getDefaultValue`'s prior behaviour) since `SpecificationJsonEditor` is
 * only ever mounted with `thisEditorRole='Spec'` or `'Config'`
 * (`app/editor/components/active-editor-pane-router.tsx`).
 *
 * Pure: no store reads or side effects of its own — callers pass in the
 * state to resolve against.
 */
export const resolveStagedTextForRole = (
    role: EditorPaneRole,
    state: StagedTextSource
): string | undefined => {
    switch (role) {
        case 'Spec':
            return state.editor.stagedSpec ?? state.project.spec;
        case 'Config':
            return state.editor.stagedConfig ?? state.project.config;
        default:
            return undefined;
    }
};
