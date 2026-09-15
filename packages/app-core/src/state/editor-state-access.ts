import { useDenebState, type StoreState } from './state';
import { isEditorStateInstalled } from './install-editor-state';

/**
 * Guards an editor-side state read. Throws a clear, actionable error
 * when the editor slices have not been merged into the store yet,
 * instead of letting the read silently return `undefined` for a
 * missing slice (or, worse, throw a confusing "cannot read property of
 * undefined" a few frames later inside a component). Callers that only
 * ever run after `installEditorState()` — every editor component — can
 * treat the return value as the full `StoreState`.
 */
export const requireEditorState = (state: StoreState): StoreState => {
    if (!isEditorStateInstalled(state)) {
        throw new Error(
            'Editor state is not installed: call installEditorState() before mounting editor components.'
        );
    }
    return state;
};

/**
 * `useDenebState`, guarded for editor-only reads. Behaves exactly like
 * `useDenebState` (same optional equality-fn parameter, same default
 * equality behaviour from `createWithEqualityFn`) except the selector
 * runs against a state object that is guaranteed — or the accessor has
 * already thrown — to have every editor slice installed. Editor
 * components should read editor-only slices through this hook rather
 * than `useDenebState` directly, so a missed or mis-sequenced
 * `installEditorState()` call fails loudly at the first render instead
 * of surfacing later as a silent `undefined`.
 */
export const useEditorState = <T>(
    selector: (state: StoreState) => T,
    equalityFn?: (a: T, b: T) => boolean
): T =>
    useDenebState((state) => selector(requireEditorState(state)), equalityFn);
