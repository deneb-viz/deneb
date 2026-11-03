import type powerbi from 'powerbi-visuals-api';
import { Body1, Button, Subtitle2 } from '@fluentui/react-components';
import { ArrowUpload24Regular } from '@fluentui/react-icons';

import { CreateButton, useDenebState } from '@deneb-viz/app-core';
import {
    persistOnCreateFromTemplate,
    StatusContainer
} from '@deneb-viz/powerbi-host';
import { logRender } from '@deneb-viz/utils/logging';
import { openImportDialog } from '../dialog';
import { ImportContent } from './import-content';

type CreateSurfaceProps = {
    host: powerbi.extensibility.visual.IVisualHost;
};

/**
 * The authoring surface for a visual with no template. The import and
 * placeholder mapping open in a Power BI dialog, so they have room whatever
 * the tile's size. Where Power BI doesn't allow dialogs, they sit in the
 * tile instead.
 */
export const CreateSurface = ({ host }: CreateSurfaceProps) =>
    host.hostCapabilities?.allowModalDialog ? (
        <ImportPrompt host={host} />
    ) : (
        <ImportContent footer={<CreateButton />} />
    );

const ImportPrompt = ({ host }: CreateSurfaceProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const onImport = () =>
        openImportDialog({
            host,
            title: translate('PowerBI_Viewer_Create_Dialog_Title'),
            onCreateProject: persistOnCreateFromTemplate
        });
    logRender('ImportPrompt');
    return (
        <StatusContainer>
            <ArrowUpload24Regular />
            <Subtitle2 as='h1'>
                {translate('PowerBI_Viewer_Create_Heading')}
            </Subtitle2>
            <Body1>{translate('PowerBI_Viewer_Create_Body')}</Body1>
            <Button appearance='primary' onClick={onImport}>
                {translate('PowerBI_Viewer_Create_Import')}
            </Button>
        </StatusContainer>
    );
};
