import type { Spec } from 'vega';
import { mergician } from 'mergician';
import {
    getDenebContainerSignalFromDimensions,
    getContainerSignalReferences
} from '../signals';
import type { PatchVegaOptions } from './types';

/**
 * Apply Deneb-specific patches to a Vega specification.
 *
 * Patches applied:
 * 1. Adds denebContainer signal with container dimensions
 * 2. Sets responsive width/height if not specified
 * 3. Merges additional signals if provided
 *
 * @param spec The Vega specification to patch
 * @param options Patching options
 * @returns A new patched Vega specification
 *
 * @example
 * ```typescript
 * const patched = patchVegaSpec(userSpec, {
 *   containerDimensions: { width: 800, height: 600 }
 * });
 * ```
 */
export const patchVegaSpec = (
    spec: Spec,
    options: PatchVegaOptions = {}
): Spec => {
    const { containerDimensions, additionalSignals = [] } = options;

    // Get container signal references for responsive sizing
    const containerRefs = getContainerSignalReferences();

    // Build patches object
    const patches: Partial<Spec> = {
        // Add denebContainer signal
        signals: [
            ...(spec.signals || []),
            getDenebContainerSignalFromDimensions(containerDimensions),
            ...additionalSignals
        ]
    };

    // Set responsive dimensions if not already specified
    if (!spec.width && containerDimensions) {
        patches.width = { signal: containerRefs.width };
    }

    if (!spec.height && containerDimensions) {
        patches.height = { signal: containerRefs.height };
    }

    // Merge patches with original spec (non-mutating)
    return mergician(spec, patches) as Spec;
};
