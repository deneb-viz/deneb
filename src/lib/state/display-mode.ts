import powerbi from 'powerbi-visuals-api';

import { type VisualFormattingSettingsModel } from '../../lib/persistence';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { logDebug } from '@deneb-viz/utils/logging';
import { toBoolean } from '@deneb-viz/utils/type-conversion';

/**
 * Dev-only override for {@link isReportInReadMode}. When the
 * `PBIVIZ_DEV_FORCE_READ_MODE` env flag is set, the helper unconditionally
 * reports "read mode" regardless of `viewMode`. This is the local-test
 * substitute for a real published-service deployment — flipping it in
 * `.env` lets a developer exercise the read-mode persist gate and the
 * in-memory migration mutations from Power BI Desktop (which always
 * reports `viewMode === Edit`) without temporarily editing the helper
 * itself.
 *
 * The flag is enforced to `false` in committed code by
 * `bin/validate-config-for-commit.ts`, so a packaged build cannot
 * accidentally ship with the override on. In production, the constant
 * resolves to `false` at compile time via the webpack DefinePlugin
 * substitution and the comparison short-circuits — no runtime cost.
 */
const IS_DEV_FORCE_READ_MODE = toBoolean(
    process.env.PBIVIZ_DEV_FORCE_READ_MODE
);

/**
 * Resolved display mode for the Deneb visual; will dictate what UI and processing is performed.
 */
export type DisplayMode =
    | 'initializing'
    | 'landing'
    | 'no-project'
    | 'fetching'
    | 'viewer'
    | 'transition-viewer-editor'
    | 'transition-editor-viewer'
    | 'editor';

/**
 * Pertinent visual update information for display mode across multiple updates.
 */
export type DisplayHistoryRecord = {
    displayMode: DisplayMode;
    editMode: powerbi.extensibility.visual.VisualUpdateOptions['editMode'];
    isFetchingAdditionalData: boolean;
    isInFocus: powerbi.extensibility.visual.VisualUpdateOptions['isInFocus'];
    type: powerbi.extensibility.visual.VisualUpdateOptions['type'];
    viewMode: powerbi.extensibility.visual.VisualUpdateOptions['viewMode'];
    viewport: powerbi.extensibility.visual.VisualUpdateOptions['viewport'];
};

export type GetUpdatedHistoryListPayload = {
    options: powerbi.extensibility.visual.VisualUpdateOptions;
    settings: VisualFormattingSettingsModel;
    isFetchingAdditionalData: boolean;
};

/**
 * Maximum number of update history records to retain.
 */
const MAX_UPDATE_HISTORY_RETENTION = 100;

/**
 * Whether the current display mode is one where the embed viewport may
 * be committed from the live host viewport.
 *
 * Excluded modes report a host viewport that does not match the canvas
 * size the viewer should be rendered at:
 *  - `editor` and the two `transition-*` modes report the editor's
 *    full-screen area; committing it would resize the viewer to the
 *    editor pane on the next viewer entry.
 *  - `fetching` is a transient state during segmented data loads. If a
 *    viewer↔editor transition arrives mid-fetch, the host viewport is
 *    the editor's area, but the resolved mode is still `fetching` (the
 *    transition detector is masked by the stuck flag). Treating
 *    `fetching` as commit-safe pollutes `embedViewport` with the editor
 *    viewport, which then survives into the viewer post-fetch. The
 *    correct committed viewport is set when fetch completes and mode
 *    resolves to `viewer`/`no-project`.
 */
export const doesModeAllowEmbedViewportSet = (mode: DisplayMode): boolean => {
    return (
        mode !== 'editor' &&
        mode !== 'transition-viewer-editor' &&
        mode !== 'transition-editor-viewer' &&
        mode !== 'fetching'
    );
};

/**
 * Numeric value of `powerbi.ViewMode.View` (the published-report
 * consumption mode). Compared against directly rather than via the
 * `powerbi.ViewMode.View` const-enum reference so the comparison
 * survives test environments where the `powerbi` namespace import is
 * shimmed and the const-enum lookup returns undefined. Matches the
 * pattern used elsewhere in this file (e.g. `editMode === 1`).
 *
 * The `satisfies powerbi.ViewMode` clause is load-bearing: if a future
 * `powerbi-visuals-api` upgrade ever reassigns `ViewMode.View` to a
 * non-zero value, this declaration fails to compile, surfacing the
 * drift instead of silently mismatching at runtime.
 */
const VIEW_MODE_VIEW = 0 satisfies powerbi.ViewMode;

/**
 * Whether the visual is being consumed in read mode (a published or
 * embedded report being viewed, not authored). This is the gate the
 * property-migration code uses to decide whether to persist migrated
 * values back to the host: in read mode persistence is suppressed
 * because (a) the reader has no intent to mutate the report, (b) host
 * persists during read may be silently dropped or surface to the user
 * as a stale-state warning, and (c) the snapshot/export service expects
 * each `update()` to complete without side effects that trigger
 * follow-up host updates.
 *
 * `viewMode === ViewMode.View` (the official "read" value) is the
 * authoritative signal. The host-reported `isInFocus` flag carries
 * separately — focus mode within a viewer (a reader clicking the
 * "focus on this visual" control on a published report) keeps
 * `viewMode === View`, so this helper correctly treats it as read mode.
 * `InFocusEdit` is defined in the Power BI API but is not emitted by
 * any real host scenario today; the gate falls through to "not read"
 * for it, which is the symbolically-correct edit-context treatment.
 *
 * When the `PBIVIZ_DEV_FORCE_READ_MODE` env flag is set
 * (see {@link IS_DEV_FORCE_READ_MODE}), the helper unconditionally
 * reports read mode regardless of `viewMode`. The override is
 * dev-only and is enforced to `false` in committed builds.
 *
 * This helper is intentionally separate from the existing `isEditMode`
 * computation (which keys off `editMode === Advanced` and answers a
 * different question — whether the visual itself is in advanced edit
 * pane mode). The two coexist: `isEditMode` drives the Deneb editor
 * UI; `isReportInReadMode` drives the persistence gate.
 */
export const isReportInReadMode = (
    options: powerbi.extensibility.visual.VisualUpdateOptions
): boolean => IS_DEV_FORCE_READ_MODE || options.viewMode === VIEW_MODE_VIEW;

/**
 * Generate an updated display history list based on the current history and new update payload.
 */
export const getUpdatedDisplayHistoryList = (
    current: DisplayHistoryRecord[],
    payload: GetUpdatedHistoryListPayload
): DisplayHistoryRecord[] => {
    const { isFetchingAdditionalData, options } = payload;
    const { editMode, isInFocus, type, viewMode, viewport } = options;
    const displayMode = getDisplayModeAccordingToOptions(payload);
    const workingEntry: DisplayHistoryRecord = {
        displayMode,
        editMode,
        isFetchingAdditionalData,
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
export const getDisplayModeAccordingToOptions = (
    payload: GetUpdatedHistoryListPayload
): DisplayMode => {
    const { isFetchingAdditionalData, options, settings } = payload;
    const { dataViews, editMode, isInFocus, viewMode } = options;
    const project = settings.vega.output.jsonSpec.value;
    const defaultProject = PROJECT_DEFAULTS.spec;
    const hasProject = project !== defaultProject;
    // Determine correct states for whether we are viewing or editing.
    // editMode === 1 (EditMode.Advanced) is set only when the user explicitly
    // clicks "Edit" in the visual header. Focus Mode sets editMode to 0 or
    // undefined, so it stays in viewer mode.
    const isLandingPage =
        !dataViews || !dataViews[0]?.metadata?.columns?.length;
    const isEditMode = editMode === 1;
    const isViewMode = !isEditMode;
    const isNoProject = !hasProject && isViewMode;
    logDebug('getDisplayModeAccordingToOptions', {
        payload,
        hasProject,
        isFetchingAdditionalData,
        isLandingPage,
        isNoProject,
        isViewMode,
        isEditMode,
        defaultProject,
        project,
        viewMode,
        editMode,
        isInFocus
    });
    if (isFetchingAdditionalData) {
        return 'fetching';
    }
    if (isNoProject) {
        return 'no-project';
    }
    if (isLandingPage) {
        return 'landing';
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
 * | #         | editMode              | type                          | viewMode            |
 * |-----------|-----------------------|-------------------------------|---------------------|
 * | [initial] | `0` (`Default`)       | (irrelevant)                  | 1 (`ViewMode.Edit`) |
 * | 1         | `1` (`Advanced`)      | `36` (`Resize` + `ResizeEnd`) | 1 (`ViewMode.Edit`) |
 * | 2         | `1` (`Advanced`)      | `36` (`Resize` + `ResizeEnd`) | 1 (`ViewMode.Edit`) |
 * | 3         | `1` (`Advanced`)      | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
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
 * | #         | editMode              | type                          | viewMode            |
 * |-----------|-----------------------|-------------------------------|---------------------|
 * | [initial] | `1` (`Advanced`)      | (irrelevant)                  | 1 (`ViewMode.Edit`) |
 * | 1         | `0` (`Default`)       | `8` (`ViewMode`)              | 1 (`ViewMode.Edit`) |
 * | 2         | `0` (`Default`)       | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
 * | 3         | `0` (`Default`)       | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
 * | 4         | `0` (`Default`)       | `4` (`Resize`)                | 1 (`ViewMode.Edit`) |
 * | 5         | `0` (`Default`)       | `36` (`Resize` + `ResizeEnd`) | 1 (`ViewMode.Edit`) |
 *
 * In this case, we can catch a change from `editMode === Advanced` to `editMode === Default && type === 8` as the
 * start of transition from editor to viewer (assigning `transition-editor-viewer`).
 *
 * When we reach the final update (5), we can confirm the transition to viewer mode.
 *
 * Note: `isInFocus` is NOT used for mode detection. Focus Mode (expand without editing) sets
 * `editMode = Default` and is handled as normal viewer mode. Only `editMode = Advanced`
 * (triggered by the visual header Edit button) opens the editor.
 *
 */
const getResolvedDisplayModeForHostQuirks = (
    working: DisplayHistoryRecord,
    history: DisplayHistoryRecord[]
) => {
    const latest = history[0];
    if (!latest) return working.displayMode;
    // Confirm transition from viewer to editor:
    // Previous must be transition-viewer-editor. Working must have
    // editMode === Advanced, Resize only (no ResizeEnd), while latest had
    // Resize + ResizeEnd.
    if (latest.displayMode === 'transition-viewer-editor') {
        if (
            working.editMode === 1 &&
            isVisualUpdateTypeResize(working.type) &&
            !isVisualUpdateTypeResizeEnd(working.type) &&
            isVisualUpdateTypeResize(latest.type) &&
            isVisualUpdateTypeResizeEnd(latest.type)
        ) {
            return 'editor';
        }
    }
    // Confirm transition from editor to viewer:
    // Previous must be transition-editor-viewer. Working must have
    // editMode !== Advanced, Resize + ResizeEnd.
    if (latest.displayMode === 'transition-editor-viewer') {
        if (
            working.editMode !== 1 &&
            isVisualUpdateTypeResizeEnd(working.type) &&
            isVisualUpdateTypeResize(working.type)
        ) {
            return 'viewer';
        }
    }
    // Detect start of viewer-to-editor transition:
    // Previous was viewer with editMode !== Advanced, viewMode === 1.
    // Working has editMode === Advanced with ResizeEnd.
    if (
        latest.editMode !== 1 &&
        latest.displayMode === 'viewer' &&
        latest.viewMode === 1 &&
        working.editMode === 1 &&
        isVisualUpdateTypeResizeEnd(working.type)
    ) {
        return 'transition-viewer-editor';
    }
    // Detect start of editor-to-viewer transition:
    // Previous had editMode === Advanced and was in editor mode.
    // Working has editMode !== Advanced with ViewMode update type.
    if (
        latest.editMode === 1 &&
        working.editMode !== 1 &&
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

/**
 * Checks if a visual update type is data-related.
 */
const isVisualUpdateTypeData = (type: powerbi.VisualUpdateType | undefined) =>
    type !== undefined
        ? powerbi.VisualUpdateType.Data ===
          (type & powerbi.VisualUpdateType.Data)
        : false;

/**
 * Checks if a visual update type is a resize event.
 */
const isVisualUpdateTypeResize = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.Resize ===
          (type & powerbi.VisualUpdateType.Resize)
        : false;

/**
 * Checks if a visual has finished resizing.
 */
export const isVisualUpdateTypeResizeEnd = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.ResizeEnd ===
          (type & powerbi.VisualUpdateType.ResizeEnd)
        : false;

/**
 * Checks if a visual update type is view mode change.
 */
const isVisualUpdateTypeViewMode = (type: powerbi.VisualUpdateType) =>
    powerbi.VisualUpdateType.ViewMode ===
    (type & powerbi.VisualUpdateType.ViewMode);

/**
 * Check the visual update type to see if it is volatile.
 */
export const isVisualUpdateTypeVolatile = (
    options: powerbi.extensibility.visual.VisualUpdateOptions
) => isVisualUpdateTypeData(options.type);
