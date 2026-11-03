import { getTemplateReplacedForDataset } from '@deneb-viz/json-processing';
import { type DenebTemplateAllocationComponents } from '@deneb-viz/json-processing/template-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { logDebug, logWarning } from '@deneb-viz/utils/logging';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { type DenebPlatformProviderProps } from '../../components/deneb-platform/types';
import { getDenebState } from '../../state';
import { remapSupportFieldConfigurationForImport } from '../../lib/project';

export type CreateProjectFromTemplateOptions = {
    /** The imported template, with the author's field assignments. */
    metadata: UsermetaTemplate | null | undefined;
    /** The template's spec and config, before field substitution. */
    candidates: DenebTemplateAllocationComponents | null | undefined;
    /** The platform's persistence step, run before the project initialises. */
    onCreateProject?: DenebPlatformProviderProps['onCreateProject'];
};

/**
 * Creates the project from an imported template and the fields assigned to
 * its placeholders, against the dataset in the store.
 *
 * The platform persists first, so it stays the source of truth, and the
 * project initialises even if persisting fails.
 */
export const createProjectFromTemplate = async ({
    metadata,
    candidates,
    onCreateProject
}: CreateProjectFromTemplateOptions) => {
    logDebug('createFromTemplate', { metadata, candidates });
    const provider = metadata?.deneb?.provider;
    if (!metadata || !provider) {
        logWarning(
            'Cannot create project: template metadata is missing provider'
        );
        return;
    }
    const spec = getTemplateReplacedForDataset(
        candidates?.spec ?? PROJECT_DEFAULTS.spec,
        metadata?.datasets ?? {}
    );
    const config = candidates?.config ?? PROJECT_DEFAULTS.config;
    // Remap support field configuration keys from inline dataset entries
    // to actual field names supplied by the user. Computed once and shared with both the
    // platform persistence callback and the project state initialisation.
    const supportFieldConfiguration = remapSupportFieldConfigurationForImport(
        metadata?.datasets?.[DATASET_DEFAULT_NAME] ?? []
    );
    // Auto-flag treatAsParameter for regular fields assigned to parameter placeholders
    let needsConsolidation = false;
    const datasetFields = getDenebState().dataset.fields;
    for (const entry of metadata?.datasets?.[DATASET_DEFAULT_NAME] ?? []) {
        if (entry.kind === 'parameter' && entry.suppliedObjectName) {
            const suppliedField = datasetFields[entry.suppliedObjectName];
            const suppliedRole = suppliedField?.role ?? 'grouping';
            if (suppliedRole === 'grouping' || suppliedRole === 'aggregation') {
                // Regular field assigned to parameter slot — auto-flag
                supportFieldConfiguration[entry.suppliedObjectName] = {
                    ...(supportFieldConfiguration[entry.suppliedObjectName] ?? {
                        highlight: false,
                        highlightStatus: false,
                        highlightComparator: false,
                        format: false,
                        formatted: false
                    }),
                    treatAsParameter: true
                };
                needsConsolidation = true;
            }
        }
    }
    logDebug('createFromTemplate - processed candidates', {
        spec,
        config,
        supportFieldConfiguration
    });
    // Call platform-specific handler FIRST for persistence (avoids sync race conditions)
    if (onCreateProject) {
        try {
            await onCreateProject({
                metadata,
                supportFieldConfiguration,
                spec,
                config
            });
        } catch (error) {
            logWarning(
                'onCreateProject callback failed:',
                error instanceof Error ? error.message : String(error)
            );
        }
    }
    getDenebState().project.initializeFromTemplate({
        spec: spec,
        config: config,
        provider,
        supportFieldConfiguration,
        denebMetaVersion: metadata?.deneb?.metaVersion,
        consolidateFieldParameters: needsConsolidation || undefined
    });
    // Staging the new text into the mounted Monaco instances and
    // requesting focus is handled editor-side, via subscriptions
    // registered in `installEditorState()` (state/install-editor-state.ts)
    // that fire on `project.initializationCount`. This keeps the create
    // step free of Monaco/editor refs.
};
