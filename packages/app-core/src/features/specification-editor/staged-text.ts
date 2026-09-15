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
 * Pure: no store reads or side effects of its own — callers pass in the
 * state to resolve against.
 */
export const resolveStagedTextForRole = (
    role: 'Spec' | 'Config',
    state: StagedTextSource
): string => {
    switch (role) {
        case 'Spec':
            return state.editor.stagedSpec ?? state.project.spec;
        case 'Config':
            return state.editor.stagedConfig ?? state.project.config;
    }
};
