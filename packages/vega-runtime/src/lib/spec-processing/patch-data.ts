import type { Spec } from 'vega';
import type { TopLevelSpec } from 'vega-lite';
import { mergician } from 'mergician';
import type { VegaDatum } from '@deneb-viz/data-core/value';

/**
 * Default dataset name used in Deneb specifications.
 */
export const DATASET_DEFAULT_NAME = 'dataset';

/**
 * Patch dataset values into a Vega specification.
 * This merges the values into the spec's data array using the default dataset name.
 *
 * Note: Values are cloned to prevent mutations affecting the original dataset.
 *
 * @param spec The Vega specification
 * @param values The dataset values to patch in
 * @returns A new spec with dataset values merged
 *
 * @example
 * ```typescript
 * const patchedSpec = patchVegaSpecWithData(spec, datasetValues);
 * ```
 */
export const patchVegaSpecWithData = (
    spec: Spec,
    values: VegaDatum[]
): Spec => {
    // Clone values to prevent mutations (#369 in legacy code)
    const specValues = structuredClone(values);

    // Get existing data array
    const existingData = spec.data || [];

    // Find if dataset already exists in data array
    const datasetIndex = existingData.findIndex(
        (d) => d.name === DATASET_DEFAULT_NAME
    );

    // Create new data array with dataset values
    const patchedData =
        datasetIndex >= 0
            ? // Replace existing dataset
              existingData.map((d, i) =>
                  i === datasetIndex ? { ...d, values: specValues } : d
              )
            : // Add new dataset entry
              [
                  ...existingData,
                  {
                      name: DATASET_DEFAULT_NAME,
                      values: specValues
                  }
              ];

    // Merge with original spec
    return mergician(spec, {
        data: patchedData
    }) as Spec;
};

/**
 * Patch dataset values into a Vega-Lite specification.
 * This merges the values into the spec's datasets object using the default dataset name.
 *
 * Note: Values are cloned to prevent mutations affecting the original dataset.
 *
 * @param spec The Vega-Lite specification
 * @param values The dataset values to patch in
 * @returns A new spec with dataset values merged
 *
 * @example
 * ```typescript
 * const patchedSpec = patchVegaLiteSpecWithData(spec, datasetValues);
 * ```
 */
export const patchVegaLiteSpecWithData = (
    spec: TopLevelSpec,
    values: VegaDatum[]
): TopLevelSpec => {
    // Clone values to prevent mutations (#369 in legacy code)
    const specValues = structuredClone(values);

    // Merge with existing datasets
    const datasets = {
        ...(spec.datasets ?? {}),
        [DATASET_DEFAULT_NAME]: specValues
    };

    // Merge with original spec
    return mergician(spec, {
        datasets
    }) as TopLevelSpec;
};

/**
 * Patch dataset values into a specification based on provider.
 *
 * @param spec The specification (Vega or Vega-Lite)
 * @param values The dataset values to patch in
 * @param provider The spec provider ('vega' or 'vega-lite')
 * @returns A new spec with dataset values merged
 *
 * @example
 * ```typescript
 * const patchedSpec = patchSpecWithData(spec, datasetValues, 'vega');
 * ```
 */
export const patchSpecWithData = (
    spec: Spec | TopLevelSpec,
    values: VegaDatum[],
    provider: 'vega' | 'vega-lite'
): Spec | TopLevelSpec => {
    return provider === 'vega'
        ? patchVegaSpecWithData(spec as Spec, values)
        : patchVegaLiteSpecWithData(spec as TopLevelSpec, values);
};
