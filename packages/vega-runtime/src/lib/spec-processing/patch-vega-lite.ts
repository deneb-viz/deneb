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

    const isNsl = isNonStandardLayout(spec);

    // Build patches object based on layout type
    // Vega-Lite params have different structure but compatible with signal format
    const patches: Partial<TopLevelSpec> = {
        params: [
            ...(spec.params || []),
            getDenebContainerSignalFromDimensions(containerDimensions) as any,
            ...additionalParams
        ]
    };

    // For standard layouts, set responsive container sizing
    if (!isNsl) {
        const normalized = spec as ReturnType<typeof normalize>;

        if (!normalized.width) {
            (patches as any).width = 'container';
        }

        if (!normalized.height) {
            (patches as any).height = 'container';
        }
    }

    // Merge patches with original spec (non-mutating)
    return mergician(spec, patches) as TopLevelSpec;
};
