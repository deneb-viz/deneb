import { useHotkeys } from 'react-hotkeys-hook';
import { type RefObject } from 'react';

import type { SettingsSearchBoxHandle } from '../components/settings-search-box';

/**
 * Inspect the given element and decide whether the `/` shortcut should
 * bail out (leave focus alone and keep `/` typeable).
 *
 * Returns `true` when the element is a text-entry surface — an `input`,
 * `textarea`, a `[contenteditable='true']` node, or anywhere inside a
 * Monaco editor subtree.
 *
 * Exported for unit-testing without wiring up a React tree.
 */
export const isTextEntrySurface = (element: Element | null): boolean => {
    if (!element) return false;
    const tag = element.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    // `isContentEditable` is only reliable on HTMLElement; fall back to
    // the attribute check so we don't miss a plain Element that still
    // carries the attribute.
    if (
        (element as HTMLElement).isContentEditable === true ||
        element.getAttribute('contenteditable') === 'true'
    ) {
        return true;
    }
    // Monaco places its editor inside a `.monaco-editor` container — if
    // the active element is inside that subtree we treat it as a
    // text-entry surface so `/` types normally in the editor.
    if (
        typeof (element as Element).closest === 'function' &&
        element.closest('.monaco-editor') !== null
    ) {
        return true;
    }
    return false;
};

/**
 * Register the `/` keyboard shortcut that focuses the settings-pane
 * SearchBox.
 *
 * Uses dedicated `useHotkeys` options that DO NOT include the shared
 * `HOTKEY_OPTIONS.enableOnFormTags` list — we want the shortcut to
 * bail inside any text-entry surface so `/` remains typeable.
 *
 * `preventDefault` is only invoked when the guard passes (focus
 * actually moves to the SearchBox). On the bail-out path the event
 * flows through normally.
 */
export const useFocusSearchShortcut = (
    searchBoxRef: RefObject<SettingsSearchBoxHandle | null>,
    enabled: boolean
) => {
    useHotkeys(
        '/',
        (event) => {
            const active =
                typeof document !== 'undefined' ? document.activeElement : null;
            if (isTextEntrySurface(active)) return;
            searchBoxRef.current?.focus();
            event.preventDefault();
        },
        {
            enabled,
            enableOnFormTags: false,
            enableOnContentEditable: false,
            preventDefault: false
        }
    );
};
