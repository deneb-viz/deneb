/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TopLevelSpec } from 'vega-lite';
import { normalize } from 'vega-lite';
import { mergician } from 'mergician';
import { getDenebContainerSignalFromDimensions } from '../signals';
import type { PatchVegaLiteOptions } from './types';

/**
 * Check if a Vega-Lite spec uses non-standard layout (concat, hconcat, vconcat, facet).
 * Non-standard layouts don't support container-based responsive sizing.
 *
 * @param spec Vega-Lite specification
 * @returns True if spec uses non-standard layout
 */
const isNonStandardLayout = (spec: TopLevelSpec): boolean => {
    return !!(
        (spec as any).concat ||
        (spec as any).hconcat ||
        (spec as any).vconcat ||
        (spec as any).facet
    );
};

/**
 * Apply responsive container sizing to a Vega-Lite specification.
 *
 * For standard layouts (no concat/hconcat/vconcat/facet), sets `width` and/or `height`
 * to `'container'` if not already specified. Non-standard layouts are returned unchanged.
 *
 * When container-based sizing is injected, also injects
 * `autosize: { type: 'fit', contains: 'padding' }` so the rendered SVG (including padding)
 * fits within the container. Without this, Vega-Lite's default `autosize.contains = 'content'`
 * causes the SVG to be `container + 2 × padding` in both dimensions — visible as unwanted
 * scrollbars on fitted specs (issue #480).
 *
 * User-specified `autosize` is never overridden.
 *
 * This is separated from the full patching so it can be used independently — e.g. when
 * compiling a clean Vega spec for the "Edit Vega Spec" feature, where we need container
 * sizing in the output but don't want the `denebContainer` signal injected.
 *
 * @param spec The Vega-Lite specification
 * @returns A new specification with responsive sizing applied (or the original if unchanged)
 */
export const patchVegaLiteResponsiveSizing = (
    spec: TopLevelSpec
): TopLevelSpec => {
    if (isNonStandardLayout(spec)) return spec;

    const normalized = spec as ReturnType<typeof normalize>;
    const patches: Partial<TopLevelSpec> = {};
    let injectingContainerSizing = false;

    if (normalized.width === undefined) {
        (patches as any).width = 'container';
        injectingContainerSizing = true;
    }

    if (normalized.height === undefined) {
        (patches as any).height = 'container';
        injectingContainerSizing = true;
    }

    // When Deneb injects container-based sizing, also inject an autosize that fits
    // the total rendered size (including padding) within the container. Vega-Lite's
    // default `autosize.contains` is `'content'`, which places padding OUTSIDE the
    // container-specified dimensions, producing an SVG that is 2×padding larger than
    // the container on each axis. `contains: 'padding'` fits padding INSIDE instead.
    if (
        injectingContainerSizing &&
        (normalized as any).autosize === undefined
    ) {
        (patches as any).autosize = { type: 'fit', contains: 'padding' };
    }

    return Object.keys(patches).length > 0
        ? (mergician(spec, patches) as TopLevelSpec)
        : spec;
};

/**
 * Apply Deneb-specific patches to a Vega-Lite specification.
 *
 * Patches applied:
 * 1. Adds denebContainer param with container dimensions
 * 2. For standard layouts: sets responsive width/height to 'container'
 * 3. For non-standard layouts: only adds the param (no container sizing)
 * 4. Merges additional params if provided
 *
 * @param spec The Vega-Lite specification to patch
 * @param options Patching options
 * @returns A new patched Vega-Lite specification
 *
 * @example
 * ```typescript
 * const patched = patchVegaLiteSpec(userSpec, {
 *   containerDimensions: { width: 800, height: 600 }
 * });
 * ```
 */
export const patchVegaLiteSpec = (
    spec: TopLevelSpec,
    options: PatchVegaLiteOptions = {}
): TopLevelSpec => {
    const { containerDimensions, additionalParams = [] } = options;

    // Apply responsive sizing first
    const sized = patchVegaLiteResponsiveSizing(spec);

    // Add denebContainer param and any additional params
    const patches: Partial<TopLevelSpec> = {
        params: [
            ...(sized.params || []),
            getDenebContainerSignalFromDimensions(containerDimensions) as any,
            ...additionalParams
        ]
    };

    // Merge patches with sized spec (non-mutating)
    return mergician(sized, patches) as TopLevelSpec;
};
