import powerbi from 'powerbi-visuals-api';

import { VisualFormattingSettingsModel } from '../properties';

/**
 * Determines whether the visual can fetch more data, based on the feature switch and the corresponding flag in the store
 * (set by data processing methods).
 */
export const canFetchMoreFromDataview = (
    settings: VisualFormattingSettingsModel,
    metadata: powerbi.DataViewMetadata
) => {
    return (
        (metadata?.segment && settings.dataLimit.loading.override.value) ||
        false
    );
};

/**
 * Process the data view values to determine if any of them have a highlights array.
 */
export const doesDataViewHaveHighlights = (
    values: powerbi.DataViewValueColumns
) => values?.filter((v) => v.highlights).length > 0;

/**
 * Gets the categorical data view from the visual update options.
 */
export const getCategoricalDataViewFromOptions = (
    options: powerbi.extensibility.visual.VisualUpdateOptions
) => options?.dataViews?.[0]?.categorical || {};

/**
 * Checks for valid `categorical` dataview and provides count of values.
 */
export const getCategoricalRowCount = (
    categorical: powerbi.DataViewCategorical
) =>
    categorical?.categories?.[0]?.values?.length ||
    categorical?.values?.[0]?.values?.length ||
    0;
