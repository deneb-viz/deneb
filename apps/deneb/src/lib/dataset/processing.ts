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
    buildFieldSourceMappings,
    createPbiSupportFieldProvider,
    getStaticParameterFormatStrings
} from './support-field-provider';
import { isLegacySpec } from './support-field-migration';
import {
    getStateManagementVersionToStamp,
    SUPPORT_FIELD_LEGACY_MIGRATION_ID
} from '../persistence/state-management-migration';
import type { SupportFieldMigrationStampPayload } from '@deneb-viz/app-core';
import {
    detectFieldParameterGroups,
    type DetectableField
} from './field-parameter-detection';
import type { PlanParameterGroup } from '@deneb-viz/data-core/support-fields';

// State for reference-based change detection
let prevCategories: DataViewCategoryColumn[] | undefined;
let prevValues: DataViewValueColumns | undefined;
let prevHighlights: (PrimitiveValue[] | undefined)[] = [];
let prevEnableSelection: boolean | undefined;
let prevEnableHighlight: boolean | undefined;
let prevRowCount: number = 0;
let prevSupportFieldConfiguration: string | undefined;
let prevConsolidateFieldParameters: boolean | undefined;

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
    supportFieldConfiguration: SupportFieldConfiguration,
    consolidateFieldParameters: boolean
): boolean => {
    logTimeStart('hasDataViewChanged');

    // Consolidate field parameters setting changed
    if (consolidateFieldParameters !== prevConsolidateFieldParameters) {
        prevConsolidateFieldParameters = consolidateFieldParameters;
        prevSupportFieldConfiguration = JSON.stringify(
            supportFieldConfiguration
        );
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: consolidateFieldParameters changed');
        logTimeEnd('hasDataViewChanged');
        return true;
    }

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
                dvValues
            );
            const fields = getDatumFieldsFromMetadata(columns);

            logTimeStart('getMappedDataset values');

            // Build support field processing plan
            const masterSettings: SupportFieldMasterSettings = {
                crossHighlightEnabled: isCrossHighlight,
                crossFilterEnabled: isCrossFilter
            };

            const state = getDenebState();
            const existingSupportFieldConfig: SupportFieldConfiguration =
                state.project.supportFieldConfiguration ?? {};

            // WHETHER the one-time legacy stamping migration is pending is
            // owned by the migration registry (isLegacySpec delegates to
            // it — see ../persistence/state-management-migration.ts).
            const isMigrationPending = isLegacySpec(
                state.project.spec,
                state.project.denebMetaVersion
            );

            // A non-empty persisted configuration is evidence the visual
            // has already operated with configured (non-legacy) support
            // fields — e.g. the config half of a previous migration's
            // persist landed but the version stamp did not (M10's
            // partial-persist split). In that case legacy semantics must
            // not be re-applied: existing entries win and unconfigured
            // fields resolve with new-spec defaults.
            const hasExistingConfig =
                Object.keys(existingSupportFieldConfig).length > 0;
            const legacy = isMigrationPending && !hasExistingConfig;

            // One-time migration (M10/M11): compute resolved defaults up
            // front and merge any existing explicit entries OVER them, so
            // interim user edits are preserved on re-migration. The stamp
            // is COMMITTED only after row building succeeds (see the end
            // of this try block) — a mapping failure must never leave a
            // half-committed migration (version stamped with no dataset,
            // or config without version). Once committed, isLegacySpec
            // returns false from that point on, so reset-to-default gives
            // new-spec behavior, not legacy.
            let migrationStamp: SupportFieldMigrationStampPayload | undefined;
            if (isMigrationPending) {
                const migratedDefaults: SupportFieldConfiguration = {};
                const sourceColumns = columns.filter(
                    (c) =>
                        c.column.roles?.[DATASET_DEFAULT_NAME] &&
                        isSourceField(c.source)
                );
                for (const c of sourceColumns) {
                    const encodedName =
                        c.encodedName ??
                        getEncodedFieldName(c.column.displayName);
                    migratedDefaults[encodedName] = resolveFieldDefaults({
                        masterSettings,
                        fieldRole: c.column.isMeasure
                            ? 'aggregation'
                            : 'grouping',
                        isLegacy: legacy
                    });
                }
                migrationStamp = {
                    supportFieldConfiguration: {
                        ...migratedDefaults,
                        ...existingSupportFieldConfig
                    },
                    denebMetaVersion: getStateManagementVersionToStamp(
                        SUPPORT_FIELD_LEGACY_MIGRATION_ID
                    ),
                    // Must match the value this pass processes with (see
                    // `consolidate` below): a fresh-legacy pass (no existing
                    // config) forces false, but a partial-persist recovery
                    // pass (existing config present) is non-legacy and must
                    // preserve the user's chosen setting rather than
                    // silently discarding it on the next update.
                    consolidateFieldParameters: hasExistingConfig
                        ? (state.project.consolidateFieldParameters ?? true)
                        : false
                };
            }

            // The configuration this pass processes with: the (merged)
            // migration output when migrating, the persisted configuration
            // otherwise.
            const supportFieldConfig: SupportFieldConfiguration =
                migrationStamp?.supportFieldConfiguration ??
                existingSupportFieldConfig;

            // Filter to source fields and build plan inputs + field source
            // mappings. The predicate narrows `source` to
            // 'categories' | 'values', which `buildFieldSourceMappings`'s
            // parameter type requires (compiler-enforced pre-filtering).
            const planSourceColumns = columns.filter(
                (
                    c
                ): c is (typeof columns)[number] & {
                    source: 'categories' | 'values';
                } =>
                    !!c.column.roles?.[DATASET_DEFAULT_NAME] &&
                    isSourceField(c.source)
            );

            // Detect field parameters when consolidation is enabled. A
            // legacy pass must use the value the migration just stamped
            // (false) rather than the pre-migration store snapshot in
            // `state`, which still reports the old value. This also covers
            // read mode, where persistence is suppressed and the migration
            // re-runs (and re-stamps) on every pass.
            const consolidate = legacy
                ? false
                : (state.project.consolidateFieldParameters ?? true);
            let planParameterGroups: PlanParameterGroup[] | undefined;

            if (consolidate) {
                const detectableFields: DetectableField[] =
                    planSourceColumns.map((c) => ({
                        displayName: c.column.displayName,
                        sourceIndex: c.sourceIndex,
                        isMeasure: c.column.isMeasure ?? false,
                        sourceFieldParameters: c.column.sourceFieldParameters
                    }));
                const detection = detectFieldParameterGroups(detectableFields);

                if (Object.keys(detection.parameterGroups).length > 0) {
                    planParameterGroups = Object.values(
                        detection.parameterGroups
                    ).map((group) => ({
                        parameterName: group.parameterName,
                        componentFieldIndices: group.componentFieldIndices,
                        componentNames: group.componentNames,
                        componentRoles: group.componentRoles,
                        formatStrings: getStaticParameterFormatStrings(
                            group.componentFieldIndices.map(
                                (idx) => planSourceColumns[idx]?.column?.format
                            )
                        )
                    }));
                }
            }

            // Add manually flagged "treat as parameter" fields as single-element groups
            if (consolidate) {
                const parameterFieldIndicesSet = new Set(
                    planParameterGroups?.flatMap(
                        (g) => g.componentFieldIndices
                    ) ?? []
                );
                for (let i = 0; i < planSourceColumns.length; i++) {
                    if (parameterFieldIndicesSet.has(i)) continue;
                    const col = planSourceColumns[i];
                    const encodedName =
                        col.encodedName ??
                        getEncodedFieldName(col.column.displayName);
                    const fieldConfig = supportFieldConfig[encodedName];
                    if (fieldConfig?.treatAsParameter) {
                        if (!planParameterGroups) planParameterGroups = [];
                        planParameterGroups.push({
                            parameterName: col.column.displayName,
                            componentFieldIndices: [i],
                            componentNames: [col.column.displayName],
                            componentRoles: [
                                col.column.isMeasure
                                    ? 'aggregation'
                                    : 'grouping'
                            ],
                            formatStrings: getStaticParameterFormatStrings([
                                col.column.format
                            ])
                        });
                    }
                }
            }

            const fieldSourceMappings =
                buildFieldSourceMappings(planSourceColumns);

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
                isLegacy: legacy,
                parameterGroups: planParameterGroups
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

            // Update field metadata for consolidated parameters
            // (done AFTER selection queue build so component fields
            // are still visible to the interactivity pipeline)
            if (planParameterGroups) {
                for (const group of planParameterGroups) {
                    const encodedParamName = getEncodedFieldName(
                        group.parameterName
                    );
                    // Determine if this is a single-element treat-as-parameter group
                    // (parameter name matches the sole component name). In that case
                    // the field is its own parameter — update role but do NOT mark
                    // it as a support field, so it remains visible in the dataset UI.
                    const isSingleSelf =
                        group.componentNames.length === 1 &&
                        getEncodedFieldName(group.componentNames[0]) ===
                            encodedParamName;
                    // Add/update the parameter as a dataset field
                    fields[encodedParamName] = {
                        ...(fields[encodedParamName] ?? { dataType: 'other' }),
                        role: 'field-parameter'
                    };
                    // Mark component fields as support fields
                    // (hides them from template operations but keeps
                    // them in the selection queue already built above).
                    // Skip for single-self treat-as groups.
                    if (!isSingleSelf) {
                        for (const name of group.componentNames) {
                            const encodedName = getEncodedFieldName(name);
                            if (fields[encodedName]) {
                                fields[encodedName].isSupportField = true;
                            }
                        }
                    }
                }
            }

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

            // M11: commit the migration stamp only now that row building
            // has succeeded — a throw above leaves persisted state
            // untouched, so the migration simply re-runs (idempotently)
            // on the next successful pass. M10: all three properties are
            // committed in a SINGLE store update so the sync layer
            // observes one slice change and emits one batched host
            // persist (no partial-persist split).
            if (migrationStamp) {
                state.project.applySupportFieldMigrationStamp(migrationStamp);
                logDebug(
                    'getMappedDataset: committed legacy support field migration',
                    { migrationStamp }
                );
            }

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
            // Surface a durable, user-visible signal — console logging is
            // invisible at certified LOG_LEVEL=0. The message is generic
            // and localized; raw exception text and data payloads are
            // deliberately NOT echoed into the UI.
            try {
                const { compilation, i18n } = getDenebState();
                compilation.logDurableError(
                    i18n.translate('Text_Error_Dataset_Mapping_Failed')
                );
            } catch (durableError) {
                // Store may be unavailable (teardown, pre-init) — never let
                // the durable-error path bury the original exception `e`.
                logError(
                    'getMappedDataset: failed to surface durable error',
                    durableError
                );
            }
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
