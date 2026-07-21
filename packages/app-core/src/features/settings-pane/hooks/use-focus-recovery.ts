import { useLayoutEffect, type RefObject } from 'react';

import type { MatchView } from '../search/types';
import type { SettingsSearchBoxHandle } from '../components/settings-search-box';
import { useSettingsPaneTooltip } from '../components/settings-pane-tooltip-context';

/** Data attribute used to tag focusable settings rows in the DOM. */
export const SETTINGS_ROW_DATA_ATTR = 'data-settings-row-id';

/** Data attribute used to tag the settings section a row belongs to. */
export const SETTINGS_SECTION_DATA_ATTR = 'data-settings-section-id';

/**
 * Collect the set of `{sectionId}/{rowId}` keys currently visible
 * inside the provided {@link MatchView}.
 *
 * Exported so tests can assert the set-building logic without
 * re-rendering a real tree.
 */
export const collectVisibleRowKeys = (view: MatchView): Set<string> => {
    const keys = new Set<string>();
    for (const [sectionId, section] of view.sections) {
        for (const [rowId, match] of section.rows) {
            if (match.visible) keys.add(`${sectionId}/${rowId}`);
        }
    }
    // Dataset tree — surface every visible flag so focus recovery
    // respects flag-level visibility as well.
    if (view.datasetTree) {
        for (const [fieldName, field] of view.datasetTree.matchedFields) {
            for (const flagKey of field.visibleFlags) {
                keys.add(`dataset/${fieldName}/${flagKey}`);
            }
        }
    }
    return keys;
};

/**
 * Inspect `document.activeElement` and derive the row key it belongs
 * to (via the `data-settings-row-id` / `data-settings-section-id`
 * attributes). Returns `null` when the focused element is outside any
 * tagged row.
 */
const currentFocusedRowKey = (): string | null => {
    if (typeof document === 'undefined') return null;
    const active = document.activeElement;
    if (!active || typeof (active as Element).closest !== 'function') {
        return null;
    }
    const row = (active as Element).closest(
        `[${SETTINGS_ROW_DATA_ATTR}]`
    ) as HTMLElement | null;
    if (!row) return null;
    const rowId = row.getAttribute(SETTINGS_ROW_DATA_ATTR);
    const section = row.closest(`[${SETTINGS_SECTION_DATA_ATTR}]`) ?? row;
    const sectionId =
        (section as HTMLElement).getAttribute(SETTINGS_SECTION_DATA_ATTR) ?? '';
    if (!rowId) return null;
    return `${sectionId}/${rowId}`;
};

/**
 * When the currently-focused row disappears under a new keystroke
 * (its section collapses or the row itself gets filtered out), move
 * focus back to the SearchBox so keyboard users stay oriented.
 *
 * Runs inside `useLayoutEffect` so the focus shift happens before the
 * browser paints the next frame.
 */
export const useFocusRecovery = (
    matchView: MatchView,
    searchBoxRef: RefObject<SettingsSearchBoxHandle | null>
) => {
    const tooltipMountNode = useSettingsPaneTooltip();
    useLayoutEffect(() => {
        if (typeof document === 'undefined') return;
        const active = document.activeElement;
        // When a Fluent `InfoLabel` / `Tooltip` popover owns focus, its
        // content is portaled into `tooltipMountNode` — outside the
        // pane's DOM subtree. Skip recovery so a matchView commit that
        // lands while the user is reading the popover does not yank
        // focus away and close it.
        if (active && tooltipMountNode && tooltipMountNode.contains(active)) {
            return;
        }
        const focusedKey = currentFocusedRowKey();
        if (focusedKey === null) return;
        const visible = collectVisibleRowKeys(matchView);
        // A flag key is `dataset/<field>/<flag>` — a section/row
        // dataset descendant. If the currently-focused key is still
        // present (or one of its descendant-prefixed keys is) we keep
        // focus where it is. Otherwise we return focus to the
        // SearchBox.
        if (visible.has(focusedKey)) return;
        // Also treat the focused row as visible when any descendant
        // row starts with `${focusedKey}/` — handles dataset field
        // rows that wrap multiple flag sub-rows.
        for (const key of visible) {
            if (key.startsWith(`${focusedKey}/`)) return;
        }
        searchBoxRef.current?.focus();
    }, [matchView, searchBoxRef, tooltipMountNode]);
};
