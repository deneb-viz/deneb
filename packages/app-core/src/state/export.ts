import { type StateCreator } from 'zustand';

import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import {
    getDatasetTemplateFieldsFromMetadata,
    type UsermetaDatasetField
} from '@deneb-viz/data-core/field';
import { type SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';
import { type DeepPath, updateDeep } from '@deneb-viz/utils/object';
import { StateDependencies, type StoreState } from './state';
import { type ProjectSliceProperties } from './project';
import {
    getNewTemplateMetadata,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import {
    DATASET_DEFAULT_NAME,
    type TabularDataset
} from '@deneb-viz/data-core/dataset';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';

/**
 * Represents the export slice in the visual store.
 */
export type ExportSliceState = {
    export: ExportSliceProperties;
};

/**
 * Represents the export slice properties in the visual store.
 */
export type ExportSliceProperties = {
    includePreviewImage: boolean;
    metadata: UsermetaTemplate | null | undefined;
    setMetadataPropertyBySelector: (
        payload: ExportSliceSetMetadataPropertyBySelector
    ) => void;
    setPreviewImage: (payload: ExportSliceSetPreviewImage) => void;
    updateExportDataset: (dataset: UsermetaDatasetField[]) => void;
};

/**
 * Represents the payload for a preview image assignment.
 */
export type ExportSliceSetPreviewImage = {
    includePreviewImage: boolean;
    previewImageBase64PNG: string;
};

/**
 * Represents the payload for an export metadata property assignment.
 */
export type ExportSliceSetMetadataPropertyBySelector = {
    selector: string;
    value: string;
};

export const createExportSlice =
    (
        dependencies: StateDependencies
    ): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        ExportSliceState
    > =>
    (set) =>
        <ExportSliceState>{
            export: {
                includePreviewImage: false,
                metadata: getNewTemplateMetadata({
                    buildVersion: dependencies.applicationVersion,
                    provider: null,
                    providerVersion: null
                }),
                setMetadataPropertyBySelector(payload) {
                    set(
                        (state) =>
                            handleSetMetadataPropertyBySelector(state, payload),
                        false,
                        'export.setMetadataPropertyBySelector'
                    );
                },
                setPreviewImage: (payload) =>
                    set(
                        (state) => handleSetPreviewImage(state, payload),
                        false,
                        'export.setPreviewImage'
                    ),
                updateExportDataset: (dataset) =>
                    set(
                        (state) => handleUpdateExportDataset(state, dataset),
                        false,
                        'export.updateExportDataset'
                    )
            }
        };

const handleSetMetadataPropertyBySelector = (
    state: StoreState,
    payload: ExportSliceSetMetadataPropertyBySelector
): Partial<StoreState> => {
    // TODO: make the id/selector system better to avoid this hack.
    // Dataset-name coupling: selectors are split on '.', so path segments
    // that represent dataset names in `usermeta.datasets` MUST NOT contain
    // dots. Today this is safe because DATASET_DEFAULT_NAME = 'dataset'.
    // If multi-dataset support is added with user-supplied names, this
    // selector scheme will silently produce wrong paths for names like
    // 'my.layer' and needs to be revisited alongside the id convention.
    const path: DeepPath = payload.selector
        .split('.')
        .map((key) => (/^\d+$/.test(key) ? Number(key) : key));
    logDebug('Export slice - setting metadata property', {
        path,
        value: payload.value
    });
    return {
        export: {
            ...state.export,
            metadata: updateDeep(
                structuredClone(state.export.metadata),
                path,
                payload.value
            )
        }
    };
};

const handleSetPreviewImage = (
    state: StoreState,
    payload: ExportSliceSetPreviewImage
): Partial<StoreState> => ({
    export: {
        ...state.export,
        includePreviewImage: payload.includePreviewImage,
        metadata: {
            ...state.export.metadata,
            information: {
                ...state?.export?.metadata?.information,
                previewImageBase64PNG: payload.previewImageBase64PNG
            }
        } as UsermetaTemplate
    }
});

const handleUpdateExportDataset = (
    state: StoreState,
    dataset: UsermetaDatasetField[]
): Partial<StoreState> => {
    if (!state.export.metadata) return {};
    return {
        export: {
            ...state.export,
            metadata: {
                ...state.export.metadata,
                datasets: {
                    ...state.export.metadata.datasets,
                    [DATASET_DEFAULT_NAME]: dataset
                }
            }
        }
    };
};

/**
 * Reconcile freshly-generated template fields with previously-stored export metadata, preserving user-edited
 * properties (description, kind, type, suppliedObject*) while refreshing name/namePlaceholder/key from the current
 * dataset. Matches by `namePlaceholder` (stable field identity) rather than `key` (positional placeholder) so that
 * field reordering doesn't cause metadata to be applied to the wrong field.
 */
export const reconcileExportDatasetFields = (
    freshFields: UsermetaDatasetField[],
    previousFields: UsermetaDatasetField[] | undefined
): UsermetaDatasetField[] =>
    freshFields.map((d) => {
        const match = previousFields?.find(
            (ds) =>
                (ds.namePlaceholder ?? ds.name) ===
                (d.namePlaceholder ?? d.name)
        );
        if (match) {
            return {
                ...match,
                ...{
                    name: d.name,
                    namePlaceholder: d.namePlaceholder,
                    key: d.key
                }
            };
        }
        return d;
    });

/**
 * Project each export dataset entry's per-field support configuration into its
 * `supportFieldConfiguration` slot, and STRIP the slot from any field that is
 * no longer present in `config`. This is the single, canonical implementation
 * shared by every site that embeds support-field config into export metadata
 * (template init, setter, migration stamp, host sync). Previously duplicated
 * four times with two divergent semantics: two variants stripped stale config,
 * two left it embedded on removed fields — corrupting export/template
 * integrity when a field was reconfigured to defaults or removed.
 */
export const embedSupportFieldConfig = (
    dataset: UsermetaDatasetField[],
    config: SupportFieldConfiguration | undefined
): UsermetaDatasetField[] =>
    dataset.map((d) => {
        const fieldConfig = config?.[d.namePlaceholder ?? d.name];
        if (fieldConfig) {
            return { ...d, supportFieldConfiguration: fieldConfig };
        }
        // Remove stale config from a field that is no longer configured.
        const { supportFieldConfiguration: _, ...rest } = d;
        return rest as UsermetaDatasetField;
    });

/**
 * The subset of `project` this file's recompute needs — declared narrowly
 * (rather than importing the full `ProjectSliceProperties`, which also
 * carries every project action) so the intent at each call site is
 * unambiguous: this is read-only, data-only access to the fields export
 * metadata is derived from.
 */
type ExportMetadataProjectInput = Pick<
    ProjectSliceProperties,
    | 'config'
    | 'provider'
    | 'providerVersion'
    | 'interactivity'
    | 'supportFieldConfiguration'
>;

/**
 * Recompute `export.metadata` from the current project and dataset state,
 * preserving previously user-edited export fields (`getUpdatedExportMetadata`
 * spreads the existing metadata first, and `setMetadataPropertyBySelector` /
 * `setPreviewImage` write into fields this function's `options` never
 * touches, e.g. `information.previewImageBase64PNG`).
 *
 * Deliberately refreshes `config`/`provider`/`providerVersion`/
 * `interactivity` on EVERY call, not only when `supportFieldConfiguration`
 * or the create signal changes: `setContent` (Apply) and the host-driven
 * `syncProjectData` both change `project.config` without necessarily
 * changing `supportFieldConfiguration`, and both must keep
 * `export.metadata.config` in sync with the currently-applied content —
 * confirmed by `project.test.ts`'s M10/M12 `syncProjectData` coverage,
 * which seeds a stale embedded `supportFieldConfiguration` on an export
 * dataset entry and asserts it is corrected on the next sync. A narrower
 * subscription keyed only on `initializationCount`/`supportFieldConfiguration`
 * would silently stop refreshing `export.metadata.config` after every Apply
 * and every host-driven project sync — a real, user-visible regression
 * (a template exported after editing-then-applying would embed stale
 * Config-editor content). Re-embedding `supportFieldConfiguration` on every
 * call is safe because `embedSupportFieldConfig` is idempotent given
 * unchanged inputs.
 *
 * Dataset entries are only reconciled against `dataset` when
 * `datasetChanged` is true — reconciling unconditionally would drop any
 * export dataset entry that doesn't currently have a matching field in
 * `dataset` (see `reconcileExportDatasetFields`), which none of the six
 * write sites above did when they weren't themselves reacting to a
 * dataset change.
 */
export const recomputeExportMetadata = (
    currentMetadata: UsermetaTemplate | null | undefined,
    project: ExportMetadataProjectInput,
    dataset: TabularDataset,
    datasetChanged: boolean
): UsermetaTemplate => {
    logTimeStart('export.recomputeExportMetadata');
    const existingDatasetEntries =
        currentMetadata?.datasets?.[DATASET_DEFAULT_NAME] ?? [];
    const reconciled = datasetChanged
        ? reconcileExportDatasetFields(
              getDatasetTemplateFieldsFromMetadata(dataset.fields),
              existingDatasetEntries
          )
        : existingDatasetEntries;
    const embedded = embedSupportFieldConfig(
        reconciled,
        project.supportFieldConfiguration
    );
    const result = getUpdatedExportMetadata(
        currentMetadata as UsermetaTemplate,
        {
            config: project.config,
            datasets: {
                ...currentMetadata?.datasets,
                [DATASET_DEFAULT_NAME]: embedded
            },
            provider: project.provider,
            providerVersion: project.providerVersion,
            interactivity: project.interactivity
        }
    );
    logTimeEnd('export.recomputeExportMetadata');
    return result;
};
