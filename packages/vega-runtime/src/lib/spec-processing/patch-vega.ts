import type { Spec } from 'vega';
import { mergician } from 'mergician';
import {
    getDenebContainerSignalFromDimensions,
    SIGNAL_DENEB_CONTAINER
} from '../signals';
import type { PatchVegaOptions } from './types';

/**
 * Check if a signal with the given name exists in the signals array.
 */
const hasSignalNamed = (spec: Spec, name: string): boolean => {
    return spec.signals?.some((signal) => signal.name === name) ?? false;
};

/**
 * Apply Deneb-specific patches to a Vega specification.
 *
 * Patches applied:
 * 1. Adds denebContainer signal with container dimensions
 * 2. Sets responsive width/height if not specified (and no user-defined signal exists)
 * 3. Merges additional signals if provided
 *
 * Width and height are stamped as literal numbers rather than references to
 * `denebContainer`. Binding them to the signal gives them an update expression
 * over an object the runtime writes at runtime, which resets whatever
 * `autosize: fit` computed and re-fits against a scenegraph whose
 * `encode.enter` marks never moved. Container changes reach the view through a
 * re-embed, not a signal write, so these do not need to be reactive.
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

    // Build patches object
    const patches: Partial<Spec> = {
        // Add denebContainer signal, unless the user spec already defines one
        // (user definition wins, consistent with width/height handling below)
        signals: [
            ...(spec.signals || []),
            ...(hasSignalNamed(spec, SIGNAL_DENEB_CONTAINER)
                ? []
                : [getDenebContainerSignalFromDimensions(containerDimensions)]),
            ...additionalSignals
        ]
    };

    // Set responsive dimensions if not already specified as a top-level property
    // or as a user-defined signal (to avoid conflicts with init/update expressions)
    if (
        spec.width == null &&
        !hasSignalNamed(spec, 'width') &&
        containerDimensions
    ) {
        patches.width = containerDimensions.width;
    }

    if (
        spec.height == null &&
        !hasSignalNamed(spec, 'height') &&
        containerDimensions
    ) {
        patches.height = containerDimensions.height;
    }

    // Merge patches with original spec (non-mutating)
    return mergician(spec, patches) as Spec;
};
