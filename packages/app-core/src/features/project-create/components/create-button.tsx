import { Button } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useDenebState } from '../../../state';
import { createProjectFromTemplate } from '../create-project-from-template';

/**
 * Displays the content for creating a specification using the selected
 * template.
 */
export const CreateButton = () => {
    const {
        candidates,
        metadata,
        metadataAllDependenciesAssigned,
        translate
    } = useDenebState((state) => ({
        candidates: state.create.candidates,
        metadata: state.create.metadata,
        metadataAllDependenciesAssigned:
            state.create.metadataAllDependenciesAssigned,
        translate: state.i18n.translate
    }));
    const { onCreateProject } = useDenebPlatformProvider();
    const onCreate = () =>
        createProjectFromTemplate({ metadata, candidates, onCreateProject });
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
