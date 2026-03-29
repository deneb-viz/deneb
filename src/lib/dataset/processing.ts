import powerbi from 'powerbi-visuals-api';
import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import PrimitiveValue = powerbi.PrimitiveValue;
import { mergician } from 'mergician';

import {
    isDrilldownFeatureEnabled,
    resolveDrilldownComponents,
    resolveDrilldownFlat
} from './drilldown';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import {
    DRILL_FIELD_FLAT,
    DRILL_FIELD_NAME,
    ROW_INDEX_FIELD_NAME
} from '@deneb-viz/data-core/field';
import { type VegaDatum } from '@deneb-viz/data-core/value';
import {
    buildProcessingPlan,
    buildDataRow,
    resolveFieldDefaults
} from '@deneb-viz/data-core/support-fields';
import type {
    SupportFieldConfiguration,
    SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';
import {
    logDebug,
    logError,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { getDenebState } from '@deneb-viz/app-core';
import { type DatasetSlice, type SetDatasetPayload } from '../../state/dataset';
import {
    doesDataViewHaveHighlights,
    getCategoricalRowCount
} from './data-view';
import {
    getCastedPrimitiveValue,
    getDatumValueEntriesFromDataview
} from './values';
import {
    getDatumFieldMetadataFromDataView,
    getDatumFieldsFromMetadata,
    getEncodedFieldName,
    isSourceField
} from './fields';
import {
    InteractivityManager,
    isCrossFilterPropSet,
    isCrossHighlightPropSet,
    type SelectionIdQueue,
    type SelectionIdQueueEntry,
    type SelectorStatus
} from '../interactivity';
import {
    createPbiSupportFieldProvider,
    type FieldSourceMapping
} from './support-field-provider';
import { isLegacySpec } from './support-field-migration';

// State for reference-based change detection
let prevCategories: DataViewCategoryColumn[] | undefined;
let prevValues: DataViewValueColumns | undefined;
let prevHighlights: (PrimitiveValue[] | undefined)[] = [];
let prevEnableSelection: boolean | undefined;
let prevEnableHighlight: boolean | undefined;
let prevRowCount: number = 0;
let prevSupportFieldConfiguration: string | undefined;

/**
 * Ensures an empty dataset is made available.
 */
const getEmptyDataset = (): SetDatasetPayload => ({
    fields: {},
    values: [],
    hasDrilldown: false,
    hasHighlights: false,
    rowsLoaded: 0
});

/**
 * Fast reference-based change detection for data views.
 * Checks if array references have changed rather than deep comparing values.
 * O(columns) complexity instead of O(rows × columns).
 */
export const hasDataViewChanged = (
    categorical: DataViewCategorical | undefined,
    enableSelection: boolean,
    enableHighlight: boolean,
    supportFieldConfiguration: SupportFieldConfiguration
): boolean => {
    logTimeStart('hasDataViewChanged');

    // Support field configuration changed
    const configString = JSON.stringify(supportFieldConfiguration);
    if (configString !== prevSupportFieldConfiguration) {
        prevSupportFieldConfiguration = configString;
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: supportFieldConfiguration changed');
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Settings changed
    if (
        enableSelection !== prevEnableSelection ||
        enableHighlight !== prevEnableHighlight
    ) {
        prevEnableSelection = enableSelection;
        prevEnableHighlight = enableHighlight;
        updatePrevReferences(categorical);
        logDebug(
            'hasDataViewChanged: enableSelection or enableHighlight changed'
        );
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    const categories = categorical?.categories;
    const values = categorical?.values;

    // Reference check on categories array
    if (categories !== prevCategories) {
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: categories reference changed');
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Reference check on values array
    if (values !== prevValues) {
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: values reference changed');
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Check row count as fallback (in case references are reused but data grows)
    const rowCount =
        categories?.[0]?.values?.length ?? values?.[0]?.values?.length ?? 0;
    if (rowCount !== prevRowCount) {
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: row count changed', {
            prevRowCount,
            rowCount
        });
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Reference check on each highlights array (for cross-highlighting)
    if (values) {
        for (let i = 0; i < values.length; i++) {
            if (values[i].highlights !== prevHighlights[i]) {
                updatePrevReferences(categorical);
                logDebug(
                    'hasDataViewChanged: highlights reference changed at index',
                    { index: i }
                );
                logTimeEnd('hasDataViewChanged');
                return true;
            }
        }
    }

    logDebug('hasDataViewChanged: no change detected');
    logTimeEnd('hasDataViewChanged');
    return false;
};

/**
 * Updates the previous reference state for subsequent comparisons.
 */
const updatePrevReferences = (
    categorical: DataViewCategorical | undefined
): void => {
    prevCategories = categorical?.categories;
    prevValues = categorical?.values;
    prevHighlights = categorical?.values?.map((v) => v.highlights) ?? [];
    prevRowCount =
        categorical?.categories?.[0]?.values?.length ??
        categorical?.values?.[0]?.values?.length ??
        0;
};

/**
 * Processes the data in the visual's data view into an object suitable for the visual's API.
 */
export const getMappedDataset = (
    categorical: DataViewCategorical,
    locale: string
): SetDatasetPayload => {
    const rowsLoaded = getCategoricalRowCount(categorical);
    const empty = getEmptyDataset();
    InteractivityManager.clearSelectors();
    const dvCategories = categorical?.categories;
    const dvValues = categorical?.values;
    const hasDataView = (dvCategories || dvValues) && true;
    if (!hasDataView) {
        return empty;
    } else {
        try {
            logTimeStart('getMappedDataset');
            const isCrossHighlight = isCrossHighlightPropSet();
            const isCrossFilter = isCrossFilterPropSet();
            const hasHighlights = doesDataViewHaveHighlights(dvValues);
            const columns = getDatumFieldMetadataFromDataView(
                dvCategories,
                dvValues
            );
            const hasDrilldown =
                isDrilldownFeatureEnabled() &&
                columns.filter((c) => c.column.roles?.[DRILL_FIELD_NAME])
                    ?.length > 0;
            const fieldValues = getDatumValueEntriesFromDataview(
                dvCategories,
                dvValues,
                locale
            );
            const fields = getDatumFieldsFromMetadata(columns);

            logTimeStart('getMappedDataset values');

            // Build support field processing plan
            const masterSettings: SupportFieldMasterSettings = {
                crossHighlightEnabled: isCrossHighlight,
                crossFilterEnabled: isCrossFilter
            };

            const supportFieldConfig: SupportFieldConfiguration =
                getDenebState().project.supportFieldConfiguration ?? {};

            const legacy = isLegacySpec(
                getDenebState().project.spec,
                supportFieldConfig
            );

            // One-time migration: stamp resolved legacy defaults into config
            // so that isLegacySpec returns false from this point on. This
            // ensures reset-to-default gives new-spec behavior, not legacy.
            if (legacy) {
                const migratedConfig: SupportFieldConfiguration = {};
                const sourceColumns = columns.filter(
                    (c) =>
                        c.column.roles?.[DATASET_DEFAULT_NAME] &&
                        isSourceField(c.source)
                );
                for (const c of sourceColumns) {
                    const encodedName =
                        c.encodedName ??
                        getEncodedFieldName(c.column.displayName);
                    migratedConfig[encodedName] = resolveFieldDefaults({
                        masterSettings,
                        fieldRole: c.column.isMeasure
                            ? 'aggregation'
                            : 'grouping',
                        isLegacy: true
                    });
                }
                getDenebState().project.setSupportFieldConfiguration(
                    migratedConfig
                );
                logDebug(
                    'getMappedDataset: migrated legacy support field config',
                    { migratedConfig }
                );
            }

            // Filter to source fields and build plan inputs + field source mappings
            const planSourceColumns = columns.filter(
                (c) =>
                    c.column.roles?.[DATASET_DEFAULT_NAME] &&
                    isSourceField(c.source)
            );

            const fieldSourceMappings: FieldSourceMapping[] =
                planSourceColumns.map((c) => ({
                    source: c.column.isMeasure ? 'values' : 'categories',
                    index: c.sourceIndex
                }));

            const pbiProvider = createPbiSupportFieldProvider({
                categories: dvCategories,
                values: dvValues,
                hasHighlights,
                fieldSourceMappings
            });

            const plan = buildProcessingPlan({
                fields: planSourceColumns.map((c) => ({
                    encodedName:
                        c.encodedName ??
                        getEncodedFieldName(c.column.displayName),
                    sourceIndex: c.sourceIndex,
                    role: c.column.isMeasure
                        ? ('aggregation' as const)
                        : ('grouping' as const)
                })),
                configuration: supportFieldConfig,
                masterSettings,
                hasHighlights,
                isLegacy: legacy
            });

            // Map plan field positions to their indices in columns/fieldValues
            const planFieldIndices = columns
                .map((c, i) =>
                    c.column.roles?.[DATASET_DEFAULT_NAME] &&
                    isSourceField(c.source)
                        ? i
                        : -1
                )
                .filter((i) => i !== -1);

            // Build selection queue template once (outside the row loop)
            // Doing this here this adds up a lot when processing large datasets
            const selectionQueueBase: SelectionIdQueueEntry[] = [];
            for (const key in fields) {
                const f = fields[key];
                if (f && isSourceField(f.hostMetadata?.source)) {
                    if (f.hostMetadata?.column.isMeasure) {
                        selectionQueueBase.push({
                            type: 'measure',
                            queryName: f.id ?? key
                        });
                    } else {
                        selectionQueueBase.push({
                            type: 'category',
                            column: dvCategories[f.hostMetadata?.sourceIndex]
                        });
                    }
                }
            }
            const selectionQueue: SelectionIdQueue = {
                entries: selectionQueueBase,
                rowNumber: 0
            };

            const values: VegaDatum[] = [];
            for (let r = 0; r < rowsLoaded; r++) {
                selectionQueue.rowNumber = r;
                const selector =
                    InteractivityManager.addRowSelector(selectionQueue);

                // Extract base values for dataset fields (matching plan.fields order)
                const baseValues = planFieldIndices.map((idx) =>
                    getCastedPrimitiveValue(columns[idx], fieldValues[idx][r])
                );

                const row = buildDataRow({
                    plan,
                    provider: pbiProvider,
                    baseValues,
                    rowIndex: r,
                    selectionStatus: plan.emitSelected
                        ? (selector?.status ?? 'neutral')
                        : undefined,
                    locale
                });

                // Handle drilldown fields (Power BI-specific, not part of the generic engine)
                if (hasDrilldown) {
                    for (let fi = 0; fi < columns.length; fi++) {
                        const f = columns[fi];
                        if (f?.column?.roles?.[DRILL_FIELD_NAME]) {
                            const rawValue = getCastedPrimitiveValue(
                                f,
                                fieldValues[fi][r]
                            );
                            row[DRILL_FIELD_NAME] = resolveDrilldownComponents(
                                row?.[DRILL_FIELD_NAME],
                                rawValue,
                                f.column.format
                            );
                            row[DRILL_FIELD_FLAT] = resolveDrilldownFlat(
                                row?.[DRILL_FIELD_FLAT],
                                rawValue,
                                f.column.format
                            );
                        }
                    }
                }

                values.push(row);
            }
            logTimeEnd('getMappedDataset values');
            logTimeEnd('getMappedDataset');
            return {
                hasDrilldown,
                hasHighlights,
                fields,
                values,
                rowsLoaded
            };
        } catch (e) {
            logError('getMappedDataset failure', e);
            return empty;
        }
    }
};

/**
 * Updates the dataset to reflect the current selection states from the selector map.
 */
export const getUpdatedDatasetSelectors = (
    dataset: DatasetSlice,
    selectorMap: SelectorStatus,
    enableSelection: boolean
) => {
    logTimeStart('dataset.updateDatasetSelectors');
    const isCrossFilter = isCrossFilterPropSet();
    let hasSelectionChanged = false;
    const values: VegaDatum[] = [];
    const nValues = dataset.values.length;
    if (isCrossFilter) {
        for (let i = 0; i < nValues; i++) {
            const v = dataset.values[i];
            const currentState =
                selectorMap.get(v[ROW_INDEX_FIELD_NAME]) ?? 'neutral';
            if (v.__selected__ !== currentState) {
                logDebug(
                    'dataset.updateDatasetSelectors: selection state changed',
                    {
                        rowIndex: v[ROW_INDEX_FIELD_NAME],
                        previous: v.__selected__,
                        current: currentState
                    }
                );
                hasSelectionChanged = true;
            }
            values.push({
                ...v,
                __selected__: currentState
            });
        }
    } else {
        for (let i = 0; i < nValues; i++) {
            values.push(dataset.values[i]);
        }
    }
    const newDataset = mergician(dataset, { values }) as DatasetSlice;
    // Only update version if selection state has changed, as this is the only volatile change
    newDataset.version = hasSelectionChanged
        ? dataset.version + 1
        : dataset.version;
    logDebug('dataset.updateDatasetSelectors', {
        newDataset,
        hasSelectionChanged
    });
    logTimeEnd('dataset.updateDatasetSelectors');
    return newDataset;
};
