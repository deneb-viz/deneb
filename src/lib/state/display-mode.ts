import powerbi from 'powerbi-visuals-api';

import {
    isVisualUpdateTypeResize,
    isVisualUpdateTypeResizeEnd,
    isVisualUpdateTypeViewMode
} from '@deneb-viz/powerbi-compat/visual-host';
import { type VisualUpdateDataPayload } from '../../state/updates';
import { getParsedPropertyJsonValue } from '@deneb-viz/powerbi-compat/properties';

/**
 * Resolved display mode for the Deneb visual; will dictate what UI and processing is performed.
 */
export type DisplayMode =
    | 'initializing'
    | 'landing'
    | 'no-project'
    | 'viewer'
    | 'transition-viewer-editor'
    | 'transition-editor-viewer'
    | 'editor';

/**
 * Pertinent visual update information for display mode across multiple updates.
 */
export type DisplayHistoryRecord = {
    displayMode: DisplayMode;
    isInFocus: powerbi.extensibility.visual.VisualUpdateOptions['isInFocus'];
    type: powerbi.extensibility.visual.VisualUpdateOptions['type'];
    viewMode: powerbi.extensibility.visual.VisualUpdateOptions['viewMode'];
    viewport: powerbi.extensibility.visual.VisualUpdateOptions['viewport'];
};

/**
 * Maximum number of update history records to retain.
 */
const MAX_UPDATE_HISTORY_RETENTION = 100;

/**
 * Generate an updated display history list based on the current history and new update payload.
 */
export const getUpdatedDisplayHistoryList = (
    current: DisplayHistoryRecord[],
    payload: VisualUpdateDataPayload
): DisplayHistoryRecord[] => {
    const { isInFocus, type, viewMode, viewport } = payload.options;
    const displayMode = getDisplayModeAccordingToOptions(payload);
    const workingEntry: DisplayHistoryRecord = {
        displayMode,
        isInFocus,
        type,
        viewMode,
        viewport
    };
    const resolvedDisplayMode = getResolvedDisplayModeForHostQuirks(
        workingEntry,
        current
    );
    const resolvedEntry = {
        ...workingEntry,
        displayMode: resolvedDisplayMode
    };
    return [
        resolvedEntry,
        ...current.slice(0, MAX_UPDATE_HISTORY_RETENTION - 1)
    ];
};

/**
 * Based on the current visual state, determine the "base" display mode.
 *
 * @remarks
 * Note that due to the nature of transitions between focus mode and the regular visual view and the out of sequence
 * options from the visual, we don't always have the right viewport for the editor when the visual host thinks it is in
 * focus mode and vice versa. We're less bothered about the transition back, but we will use this "base" state to
 * determine if the visual is transitioning between modes.
 */
const getDisplayModeAccordingToOptions = (
    payload: VisualUpdateDataPayload
): DisplayMode => {
    const { dataViews, isInFocus, viewMode } = payload.options;
    const project = getParsedPropertyJsonValue(
        payload.settings.vega.output.jsonSpec.value
    );
    // Determine correct states for whether we are viewing or editing
    const isLandingPage =
        !dataViews || !dataViews[0]?.metadata?.columns?.length;
    const isViewMode = viewMode === 0 || (viewMode === 1 && !isInFocus);
    const isEditMode = viewMode === 1 && isInFocus;
    const isNoProject = !project && isViewMode;
    if (isLandingPage) {
        return 'landing';
    }
    if (isNoProject) {
        return 'no-project';
    }
    if (isViewMode) {
        return 'viewer';
    }
    if (isEditMode) {
        return 'editor';
    }
    return 'initializing';
};

/**
 * This method applies a 'mode' override due to quirks in the Power BI visual host.
 *
 * For a transition between viewer to editor, the visual host does the following order of updates:
 *
 * | #         | isInFocus | type                          | viewMode            |
 * |-----------|-----------|-------------------------------|---------------------|
 * | [initial] | `false`   | (irrelevant)                  | 1 (`ViewMode.Edit`) |
 * | 1         | `true`    | `36` (`Resize` + `ResizeEnd`) | 1 (`ViewMode.Edit`) |
 * | 2         | `true`    | `36` (`Resize` + `ResizeEnd`) | 1 (`ViewMode.Edit`) |
 * | 3         | `true`    | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
 *
 * Assuming that we have resolved the `[initial]` state of type `viewer`, it is this chain that we use to flag that the
 * visual moves to edit mode. At this point, the visible viewport is enough to make sure that the editor will display
 * its interface correctly and display panes can be resolved without causing UX issues.
 *
 * Therefore, if we catch a change from `[initial]` to #1, we can assign a display mode of 'transition-viewer-editor'
 * until we reach update #3, where as long as all conditions are satisfied (and our current mode is
 * `transition-viewer-editor`), then we can assign the `editor` mode.
 *
 * Conversely, a transition from `editor` to `viewer` will result in the following order of updates:
 *
 * | #         | isInFocus | type                          | viewMode            |
 * |-----------|-----------|-------------------------------|---------------------|
 * | [initial] | `true`    | (irrelevant)                  | 1 (`ViewMode.Edit`) |
 * | 1         | `false`   | `8` (`ViewMode`)              | 1 (`ViewMode.Edit`) |
 * | 2         | `false`   | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
 * | 3         | `false`   | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
 * | 4         | `false`   | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
 * | 5         | `false`   | `36` (`Resize` + `ResizeEnd`) | 1 (`ViewMode.Edit`) |
 *
 * In this case, we can catch a change from `isInFocus === true` to `isInFocus === false && type === 8` is the start of
 * transition from editor to viewer (assigning `transition-editor-viewer`).
 *
 * When we reach the final update (5), we can confirm the transition to viewer mode.
 *
 */
const getResolvedDisplayModeForHostQuirks = (
    working: DisplayHistoryRecord,
    history: DisplayHistoryRecord[]
) => {
    const latest = history[0];
    if (!latest) return working.displayMode;
    if (latest.displayMode === 'transition-viewer-editor') {
        if (
            working.isInFocus &&
            isVisualUpdateTypeResizeEnd(working.type) &&
            !isVisualUpdateTypeResizeEnd(working.type) &&
            isVisualUpdateTypeResize(latest.type) &&
            isVisualUpdateTypeResizeEnd(latest.type)
        ) {
            return 'editor';
        }
    }
    if (latest.displayMode === 'transition-editor-viewer') {
        if (
            !working.isInFocus &&
            isVisualUpdateTypeResizeEnd(working.type) &&
            isVisualUpdateTypeResize(working.type)
        ) {
            return 'viewer';
        }
    }
    if (
        !latest.isInFocus &&
        latest.displayMode === 'viewer' &&
        latest.viewMode === 1 &&
        working.isInFocus &&
        isVisualUpdateTypeResizeEnd(working.type)
    ) {
        return 'transition-viewer-editor';
    }
    if (
        latest.isInFocus &&
        !working.isInFocus &&
        latest.displayMode === 'editor' &&
        working.displayMode === 'viewer' &&
        latest.viewMode === 1 &&
        isVisualUpdateTypeViewMode(working.type)
    ) {
        return 'transition-editor-viewer';
    }

    return working.displayMode;
};

/**
 * Ensure that we only process data when we have the appropriate display mode.
 */
export const isDisplayModeEligibleForDataProcessing = (
    displayMode: DisplayMode
) => {
    return (
        displayMode === 'no-project' ||
        displayMode === 'viewer' ||
        displayMode === 'editor'
    );
};
