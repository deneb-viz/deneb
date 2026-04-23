/**
 * Dataset descriptor indexer for the settings-pane search feature.
 *
 * Walks the current source fields, resolves the applicable flags for
 * each, and produces a {@link ResolvedDatasetDescriptor} that can be
 * fed straight into the match engine. The indexer owns every
 * translation call — the engine itself sees only strings.
 *
 * This mirrors the resolver pattern used by `resolveSectionSchema`
 * and keeps the same invariants: pure, no hooks, no closures over
 * live state, referentially stable for a given input shape within a
 * single locale.
 */
import {
    resolveFieldDefaults,
    type SupportFieldConfiguration,
    type SupportFieldFlags,
    type SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';
import type { DatasetField } from '@deneb-viz/data-core/field';

import {
    COLUMN_FLAGS,
    FLAG_INFO,
    FLAG_LABELS,
    MEASURE_FLAGS,
    getApplicableFlags
} from '../components/dataset-settings-utils';
import type {
    ResolvedDatasetDescriptor,
    ResolvedFieldDescriptor,
    ResolvedFlagDescriptor
} from './types';
import type { TranslateFn } from './resolve-descriptors';

/**
 * Tuple of `[fieldName, field]` as taken from `Object.entries` of
 * `state.dataset.fields`. Indexer consumers are expected to have
 * already filtered out support/derived fields.
 */
export type SourceFieldEntry = readonly [string, DatasetField];

/**
 * Input bundle for {@link buildResolvedDatasetDescriptor}.
 *
 * The caller supplies already-filtered source fields and the handful
 * of pieces of context that drive flag resolution. The indexer does
 * the per-field applicability walk itself so pane wiring stays thin.
 */
export type BuildResolvedDatasetDescriptorInput = {
    /** Pre-filtered source fields (support/derived fields removed). */
    sourceFields: readonly SourceFieldEntry[];
    /** Explicit per-field config overlay. */
    config: SupportFieldConfiguration;
    /** Master settings that feed `resolveFieldDefaults`. */
    masterSettings: SupportFieldMasterSettings;
    /** True when the current spec pre-dates Deneb 2.0 semantics. */
    isLegacy: boolean;
    /** Whether cross-highlight is enabled on the visual. */
    highlightEnabled: boolean;
    /** Whether field-parameter consolidation is enabled on the spec. */
    consolidateFieldParameters: boolean;
    /** Translation function — resolves i18n keys to concrete strings. */
    translate: TranslateFn;
    /** i18n key for the section heading (typically `Text_Settings_Dataset`). */
    headingKey: string;
};

/**
 * Resolve the flag set that will actually drive the rendered UI for a
 * single source field. Mirrors the logic inside `DatasetSettings` —
 * keep the two in sync.
 */
const resolveFieldFlags = (
    field: DatasetField,
    config: SupportFieldConfiguration,
    name: string,
    masterSettings: SupportFieldMasterSettings,
    isLegacy: boolean
): SupportFieldFlags => {
    const explicit = config[name];
    if (explicit) return explicit;
    return resolveFieldDefaults({
        masterSettings,
        fieldRole: field.role ?? 'grouping',
        isLegacy
    });
};

/**
 * Produce the list of applicable flag keys for a field given its role
 * and the current consolidation setting. Mirrors the selection logic
 * inside the `DatasetSettings` component render.
 */
const resolveApplicableFlagKeys = (
    field: DatasetField,
    fieldFlags: SupportFieldFlags,
    highlightEnabled: boolean,
    consolidateFieldParameters: boolean
): (keyof SupportFieldFlags)[] => {
    const isMeasure = (field.role ?? 'grouping') === 'aggregation';
    const isFieldParameter = field.role === 'field-parameter';
    const baseFlags =
        isMeasure || isFieldParameter
            ? highlightEnabled
                ? MEASURE_FLAGS
                : COLUMN_FLAGS
            : COLUMN_FLAGS;
    const isTreatedAs = fieldFlags.treatAsParameter === true;
    const isParameter = isFieldParameter || isTreatedAs;
    return getApplicableFlags(
        baseFlags,
        isFieldParameter,
        isTreatedAs,
        isParameter,
        consolidateFieldParameters
    );
};

/**
 * Resolve a single applicable flag into its descriptor form. Labels
 * route through `translate(FLAG_LABELS[key])` and assistive text
 * through `translate(FLAG_INFO[key])`; flags without assistive text
 * get `assistive: null`.
 */
const resolveFlagDescriptor = (
    key: keyof SupportFieldFlags,
    translate: TranslateFn
): ResolvedFlagDescriptor => {
    const labelKey = FLAG_LABELS[key];
    const assistiveKey = FLAG_INFO[key];
    return {
        key,
        label: labelKey ? translate(labelKey) : key,
        assistive: assistiveKey ? translate(assistiveKey) : null
    };
};

/**
 * Build a {@link ResolvedDatasetDescriptor} from the raw inputs the
 * settings pane already has in hand.
 *
 * Pure — the same inputs yield referentially stable output within a
 * single locale. Every translation call happens here so the match
 * engine stays locale-agnostic.
 */
export const buildResolvedDatasetDescriptor = ({
    sourceFields,
    config,
    masterSettings,
    isLegacy,
    highlightEnabled,
    consolidateFieldParameters,
    translate,
    headingKey
}: BuildResolvedDatasetDescriptorInput): ResolvedDatasetDescriptor => {
    const fields: ResolvedFieldDescriptor[] = sourceFields.map(
        ([name, field]) => {
            const fieldFlags = resolveFieldFlags(
                field,
                config,
                name,
                masterSettings,
                isLegacy
            );
            const applicableKeys = resolveApplicableFlagKeys(
                field,
                fieldFlags,
                highlightEnabled,
                consolidateFieldParameters
            );
            const applicableFlags = applicableKeys.map((key) =>
                resolveFlagDescriptor(key, translate)
            );
            return { name, applicableFlags };
        }
    );
    return {
        sectionId: 'dataset',
        heading: translate(headingKey),
        fields
    };
};
