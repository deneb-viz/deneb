import { Button } from '@fluentui/react-components';

import { getTemplateReplacedForDataset } from '@deneb-viz/json-processing';
import { logDebug, logRender, logWarning } from '@deneb-viz/utils/logging';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useSpecificationEditor } from '../../specification-editor';
import { useDenebState } from '../../../state';
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
        logDebug('createFromTemplate - processed candidates', {
            spec,
            config
        });
        // Call platform-specific handler FIRST for persistence (avoids sync race conditions)
        if (onCreateProject && metadata) {
            try {
                await onCreateProject({
                    metadata,
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
        // Initialize project state from template
        initializeFromTemplate({
            spec: spec,
            config: config,
            provider
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
