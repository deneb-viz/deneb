import { Button } from '@fluentui/react-components';

import { getTemplateReplacedForDataset } from '@deneb-viz/json-processing';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import {
    persistProperties,
    resolveObjectProperties
} from '@deneb-viz/powerbi-compat/visual-host';
import { useSpecificationEditor } from '../../specification-editor';
import { useDenebState } from '../../../state';

/**
 * Displays the content for creating a specification using the selected
 * template.
 */
export const CreateButton = () => {
    const {
        candidates,
        metadata,
        metadataAllDependenciesAssigned,
        createFromTemplate,
        translate
    } = useDenebState((state) => ({
        candidates: state.create.candidates,
        metadata: state.create.metadata,
        metadataAllDependenciesAssigned:
            state.create.metadataAllDependenciesAssigned,
        createFromTemplate: state.create.createFromTemplate,
        translate: state.i18n.translate
    }));
    const { spec, config } = useSpecificationEditor();
    const onCreate = () => {
        logDebug('createFromTemplate', { metadata, candidates });
        const jsonSpec = getTemplateReplacedForDataset(
            candidates?.spec ?? '',
            metadata?.dataset ?? []
        );
        const jsonConfig = candidates?.config;
        logDebug('createFromTemplate - processed candidates', {
            jsonSpec,
            jsonConfig
        });
        persistProperties(
            resolveObjectProperties([
                {
                    objectName: 'vega',
                    properties: [
                        { name: 'provider', value: metadata?.deneb.provider },
                        { name: 'jsonSpec', value: jsonSpec },
                        { name: 'jsonConfig', value: jsonConfig },
                        { name: 'isNewDialogOpen', value: false },
                        {
                            name: 'enableTooltips',
                            value: metadata?.interactivity?.tooltip || false
                        },
                        {
                            name: 'enableContextMenu',
                            value: metadata?.interactivity?.contextMenu || false
                        },
                        {
                            name: 'enableHighlight',
                            value: metadata?.interactivity?.highlight || false
                        },
                        {
                            name: 'enableSelection',
                            value: metadata?.interactivity?.selection || false
                        },
                        {
                            name: 'selectionMaxDataPoints',
                            value: metadata?.interactivity?.dataPointLimit || 0
                        }
                    ]
                }
            ])
        );
        spec?.current?.setValue(jsonSpec);
        config?.current?.setValue(jsonConfig ?? '');
        spec?.current?.focus();
        createFromTemplate();
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
