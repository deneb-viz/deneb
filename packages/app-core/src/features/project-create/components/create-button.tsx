import { Button } from '@fluentui/react-components';

import {
    getTemplateReplacedForDataset,
    remapSupportFieldConfigurationForImport
} from '@deneb-viz/json-processing';
import { logDebug, logRender, logWarning } from '@deneb-viz/utils/logging';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useSpecificationEditor } from '../../specification-editor';
import { getDenebState, useDenebState } from '../../../state';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Displays the content for creating a specification using the selected
 * template.
 */
export const CreateButton = () => {
    const {
        candidates,
        metadata,
        metadataAllDependenciesAssigned,
        initializeFromTemplate,
        translate
    } = useDenebState((state) => ({
        candidates: state.create.candidates,
        metadata: state.create.metadata,
        metadataAllDependenciesAssigned:
            state.create.metadataAllDependenciesAssigned,
        initializeFromTemplate: state.project.initializeFromTemplate,
        translate: state.i18n.translate
    }));
    const { onCreateProject } = useDenebPlatformProvider();
    const { spec: editorSpec, config: editorConfig } = useSpecificationEditor();
    const onCreate = async () => {
        logDebug('createFromTemplate', { metadata, candidates });
        const provider = metadata?.deneb?.provider;
        if (!provider) {
            logWarning(
                'Cannot create project: template metadata is missing provider'
            );
            return;
        }
        const spec = getTemplateReplacedForDataset(
            candidates?.spec ?? PROJECT_DEFAULTS.spec,
            metadata?.dataset ?? []
        );
        const config = candidates?.config ?? PROJECT_DEFAULTS.config;
        // Remap support field configuration keys from inline dataset entries
        // to actual field names supplied by the user. Computed once and shared with both the
        // platform persistence callback and the project state initialisation.
        const supportFieldConfiguration =
            remapSupportFieldConfigurationForImport(metadata?.dataset ?? []);
        // Auto-flag treatAsParameter for regular fields assigned to parameter placeholders
        let needsConsolidation = false;
        const datasetFields = getDenebState().dataset.fields;
        for (const entry of metadata?.dataset ?? []) {
            if (entry.kind === 'parameter' && entry.suppliedObjectName) {
                const suppliedField = datasetFields[entry.suppliedObjectName];
                const suppliedRole = suppliedField?.role ?? 'grouping';
                if (
                    suppliedRole === 'grouping' ||
                    suppliedRole === 'aggregation'
                ) {
                    // Regular field assigned to parameter slot — auto-flag
                    supportFieldConfiguration[entry.suppliedObjectName] = {
                        ...(supportFieldConfiguration[
                            entry.suppliedObjectName
                        ] ?? {
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
        if (onCreateProject && metadata) {
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
        initializeFromTemplate({
            spec: spec,
            config: config,
            provider,
            supportFieldConfiguration,
            denebMetaVersion: metadata?.deneb?.metaVersion,
            consolidateFieldParameters: needsConsolidation || undefined
        });
        // Update editor refs directly for immediate UI update
        editorSpec?.current?.setValue(spec);
        editorConfig?.current?.setValue(config ?? '');
        editorSpec?.current?.focus();
    };
    logRender('CreateButton');
    return (
        <Button
            disabled={!metadataAllDependenciesAssigned}
            appearance='primary'
            onClick={onCreate}
        >
            {translate('Button_Create')}
        </Button>
    );
};
