import type powerbi from 'powerbi-visuals-api';

/**
 * Scenario fixture builders for the fake-host lifecycle harness,
 * including the documented Power BI host quirks from:
 *
 *  - docs/solutions/logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md
 *  - docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md
 *  - docs/solutions/ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md
 *
 * Enum values are pinned as numeric literals with `satisfies` clauses
 * (the pattern established in `src/lib/state/display-mode.ts`) because
 * `powerbi-visuals-api` const enums have no runtime representation in
 * the vitest environment — the namespace import resolves, but member
 * lookups are `undefined`. The `satisfies` clause fails compilation if
 * a future API upgrade reassigns the value.
 */

export const OPERATION_KIND_CREATE =
    0 satisfies powerbi.VisualDataChangeOperationKind;
export const OPERATION_KIND_APPEND =
    1 satisfies powerbi.VisualDataChangeOperationKind;

export const UPDATE_TYPE_DATA = 2 satisfies powerbi.VisualUpdateType;
export const UPDATE_TYPE_RESIZE = 4 satisfies powerbi.VisualUpdateType;
export const UPDATE_TYPE_VIEW_MODE = 8 satisfies powerbi.VisualUpdateType;
export const UPDATE_TYPE_RESIZE_END = 32 satisfies powerbi.VisualUpdateType;
/** `Resize | ResizeEnd` — the composite the host ships on transition updates. */
export const UPDATE_TYPE_RESIZE_WITH_END = (UPDATE_TYPE_RESIZE |
    UPDATE_TYPE_RESIZE_END) as powerbi.VisualUpdateType;

export const EDIT_MODE_DEFAULT = 0 satisfies powerbi.EditMode;
export const EDIT_MODE_ADVANCED = 1 satisfies powerbi.EditMode;

export const VIEW_MODE_VIEW = 0 satisfies powerbi.ViewMode;
export const VIEW_MODE_EDIT = 1 satisfies powerbi.ViewMode;

/**
 * Documented host quirk (viewer-bounce doc): with snap-to-grid off,
 * Power BI Desktop reports FRACTIONAL viewport dimensions. Any harness
 * logic that assumes integer viewports diverges from the real host, so
 * the default scenario viewports deliberately carry sub-pixel values.
 */
export const FRACTIONAL_VIEWPORT: powerbi.IViewport = {
    width: 286.4729,
    height: 174.2331
};

/**
 * A plausible editor-pane viewport, also fractional. Used with the
 * "host reports the new viewport before the iframe physically resizes"
 * quirk: during a viewer→editor transition the host ships this larger
 * viewport while the iframe's `window.innerWidth` still reflects the
 * old viewer size.
 */
export const EDITOR_VIEWPORT: powerbi.IViewport = {
    width: 1280.5,
    height: 720.25
};

/**
 * Build a categorical data view slice with `rowCount` rows. Every call
 * produces FRESH array references — the reference-based change
 * detection in `hasDataViewChanged` treats each build as new data.
 * Reuse the same returned object across updates to simulate the
 * host's reference-equal DataView behaviour on transitions.
 */
export const buildCategorical = (
    rowCount: number
): powerbi.DataViewCategorical =>
    ({
        categories: [
            {
                source: {
                    displayName: 'Category',
                    queryName: 'Table.Category',
                    index: 0,
                    roles: { dataset: true }
                },
                values: Array.from({ length: rowCount }, (_, i) => `row-${i}`)
            }
        ],
        values: []
    }) as unknown as powerbi.DataViewCategorical;

export type BuildDataViewConfig = {
    categorical: powerbi.DataViewCategorical;
    /**
     * When true, `metadata.segment` is present — the host's signal that
     * more data segments are available (`canFetchMoreFromDataview`
     * reads this together with the data-limit override setting).
     */
    segment?: boolean;
};

export const buildDataView = (config: BuildDataViewConfig): powerbi.DataView =>
    ({
        metadata: {
            columns: [
                {
                    displayName: 'Category',
                    queryName: 'Table.Category',
                    index: 0,
                    roles: { dataset: true }
                }
            ],
            ...(config.segment ? { segment: {} } : {})
        },
        categorical: config.categorical
    }) as unknown as powerbi.DataView;

export type BuildUpdateOptionsConfig = {
    dataView?: powerbi.DataView;
    /** Reuse a prior update's `dataViews` array verbatim (reference-equal quirk). */
    dataViews?: powerbi.DataView[];
    operationKind?: powerbi.VisualDataChangeOperationKind;
    type?: powerbi.VisualUpdateType;
    viewport?: powerbi.IViewport;
    editMode?: powerbi.EditMode;
    viewMode?: powerbi.ViewMode;
    /**
     * Documented host quirk: `isInFocus` arrives as `undefined` (not
     * `false`) on many real host updates. The default here is
     * deliberately `undefined` so every scenario exercises the quirk
     * unless a test opts into an explicit value.
     */
    isInFocus?: boolean;
};

/**
 * Build a `VisualUpdateOptions` payload for the driver. Only the
 * properties the update-cycle orchestration reads are populated; the
 * cast is the same pattern the existing root test-suites use for
 * partial host payloads.
 */
export const buildUpdateOptions = (
    config: BuildUpdateOptionsConfig = {}
): powerbi.extensibility.visual.VisualUpdateOptions =>
    ({
        dataViews:
            config.dataViews ??
            (config.dataView ? [config.dataView] : undefined),
        operationKind: config.operationKind,
        type: config.type ?? UPDATE_TYPE_DATA,
        viewport: config.viewport ?? FRACTIONAL_VIEWPORT,
        editMode: config.editMode ?? EDIT_MODE_DEFAULT,
        viewMode: config.viewMode ?? VIEW_MODE_EDIT,
        isInFocus: config.isInFocus
    }) as unknown as powerbi.extensibility.visual.VisualUpdateOptions;

/**
 * Documented host quirk (segmented-fetch doc, root cause #1): a
 * viewer↔editor transition update re-ships the PREVIOUS update's
 * DataView objects reference-equal — only the options envelope (type,
 * viewport, editMode) changes. Reference-based change detection must
 * report "no data change" for these.
 */
export const buildTransitionUpdateReusingDataView = (
    previous: powerbi.extensibility.visual.VisualUpdateOptions,
    overrides: Omit<BuildUpdateOptionsConfig, 'dataView' | 'dataViews'> = {}
): powerbi.extensibility.visual.VisualUpdateOptions =>
    buildUpdateOptions({
        dataViews: previous.dataViews,
        type: overrides.type ?? UPDATE_TYPE_RESIZE_WITH_END,
        viewport: overrides.viewport ?? EDITOR_VIEWPORT,
        editMode: overrides.editMode ?? EDIT_MODE_ADVANCED,
        viewMode: overrides.viewMode,
        isInFocus: overrides.isInFocus,
        operationKind: overrides.operationKind
    });

/**
 * Documented host quirk (segmented-fetch doc, root causes #3 + #4): on
 * a viewer→editor transition of a fully-loaded multi-segment dataset,
 * the host resets its segmented-fetch state and re-ships a REDUCED
 * first segment as a fresh `Create` — while the visual's
 * `isFetchingAdditional` flag from the interrupted chain is still set.
 * The decision function must route this to recovery (preserve the
 * fully-loaded slice; do NOT re-enter fetch-more).
 */
export const buildReducedRestartCreate = (
    reducedRowCount: number
): powerbi.extensibility.visual.VisualUpdateOptions =>
    buildUpdateOptions({
        dataView: buildDataView({
            categorical: buildCategorical(reducedRowCount),
            segment: true
        }),
        operationKind: OPERATION_KIND_CREATE,
        type: UPDATE_TYPE_DATA
    });

/**
 * Documented host quirk (freeze + bounce docs): the host reports the
 * NEW viewport in `options.viewport` before the iframe has physically
 * resized — `window.innerWidth` still holds the old width for tens to
 * ~150ms. The fixture pairs the premature host-reported viewport with
 * the stale physical width so display-mode tests can assert the
 * embed-viewport commit gate blocks the premature value.
 */
export type ViewportBeforeIframeResizeFixture = {
    options: powerbi.extensibility.visual.VisualUpdateOptions;
    /** What `window.innerWidth` would still report at this instant. */
    physicalInnerWidth: number;
};

export const buildViewportBeforeIframeResizeQuirk =
    (): ViewportBeforeIframeResizeFixture => ({
        options: buildUpdateOptions({
            dataView: buildDataView({ categorical: buildCategorical(100) }),
            type: UPDATE_TYPE_RESIZE_WITH_END,
            editMode: EDIT_MODE_ADVANCED,
            viewport: EDITOR_VIEWPORT
        }),
        physicalInnerWidth: Math.trunc(FRACTIONAL_VIEWPORT.width)
    });
