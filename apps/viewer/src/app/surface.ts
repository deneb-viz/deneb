import powerbi from 'powerbi-visuals-api';
import { type useDenebVisualState } from '@deneb-viz/powerbi-host';

/** The display mode the kernel resolves for each update. */
export type DisplayMode = ReturnType<
    typeof useDenebVisualState.getState
>['interface']['mode'];

/** What the visual shows for a resolved display mode. */
export type Surface =
    | 'splash'
    | 'fetching'
    | 'create'
    | 'add-fields'
    | 'landing'
    | 'viewer';

/**
 * Numeric value of `powerbi.ViewMode.View`, the mode a published or embedded
 * report is consumed in. Compared directly rather than through the const
 * enum so the comparison holds where the `powerbi` namespace is shimmed in
 * tests; the `satisfies` clause fails compilation if the API ever renumbers
 * it.
 */
const VIEW_MODE_VIEW = 0 satisfies powerbi.ViewMode;

/**
 * Whether the report is being read rather than authored. Persisting
 * properties is suppressed in read mode, so nothing that persists (template
 * import, reset) may be offered there.
 */
export const isReadMode = (
    options: powerbi.extensibility.visual.VisualUpdateOptions | undefined
): boolean => options?.viewMode === VIEW_MODE_VIEW;

/** Whether the data view carries at least one field. */
export const hasDataFields = (
    options: powerbi.extensibility.visual.VisualUpdateOptions | undefined
): boolean => (options?.dataViews?.[0]?.metadata?.columns?.length ?? 0) > 0;

/**
 * Resolves the surface for a display mode.
 *
 * - An author with fields and no template gets the import surface; without
 *   fields they get guidance to add them.
 * - A reader never sees an authoring surface: with no template, or no data,
 *   they get the neutral landing state.
 * - The kernel only reports `landing` when there are no fields, and only
 *   reports `viewer` when there are; anything else falls back to the
 *   landing state.
 */
export const resolveSurface = (
    mode: DisplayMode,
    readMode: boolean,
    fieldsAssigned: boolean
): Surface => {
    if (mode === 'initializing') return 'splash';
    if (mode === 'fetching') return 'fetching';
    if (mode === 'viewer' && fieldsAssigned) return 'viewer';
    if (readMode) return 'landing';
    if (mode === 'no-project') return fieldsAssigned ? 'create' : 'add-fields';
    if (mode === 'landing') return 'add-fields';
    return 'landing';
};

/**
 * Whether an update's rendering lifecycle closes as soon as the surface is
 * shown. Only the viewer embeds Vega, whose callbacks close the lifecycle;
 * every other surface renders nothing for Vega to report on.
 */
export const closesRenderingSynchronously = (surface: Surface): boolean =>
    surface !== 'viewer';
