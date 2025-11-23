import { useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowDownloadRegular, CopyRegular } from '@fluentui/react-icons';

import { getExportTemplate } from '@deneb-viz/json-processing';
import {
    getI18nValue,
    getVisualHost
} from '@deneb-viz/powerbi-compat/visual-host';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { TooltipCustomMount } from '../../../components/ui';
import { UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { TrackedFields } from '@deneb-viz/json-processing/field-tracking';

/**
 * Displays download and copy template to clipboard buttons.
 */
export const ExportButtons = () => {
    const {
        exportMetadata,
        exportProcessingState,
        templateName,
        tokenizedSpec,
        trackedFields
    } = useDenebState((state) => ({
        exportMetadata: state.export?.metadata,
        exportProcessingState: state.interface.exportProcessingState,
        isTrackingFields: state.interface.isTrackingFields,
        templateName: state.export?.metadata?.information?.name,
        tokenizedSpec: state.fieldUsage.tokenizedSpec,
        trackedFields: state.fieldUsage.dataset
    }));
    const [ttRefDownload, setTtRefDownload] = useState<HTMLElement | null>();
    const [ttRefCopy, setTtRefCopy] = useState<HTMLElement | null>();
    const resolvedName =
        templateName ||
        getI18nValue('Template_Export_Information_Name_Placeholder');
    const handleDownload = () => {
        if (exportMetadata && tokenizedSpec && trackedFields) {
            getVisualHost()
                .downloadService.exportVisualsContentExtended(
                    getProcessedExportTemplate(
                        exportMetadata,
                        tokenizedSpec,
                        trackedFields
                    ),
                    `${resolvedName}.deneb.json`,
                    'json',
                    getI18nValue('Template_Export_Json_File_Description')
                )
                .then((result) => {
                    logDebug('handleDownload result', result);
                });
        }
    };
    const handleCopy = () => {
        if (exportMetadata && tokenizedSpec && trackedFields) {
            const dummy = document.createElement('textarea');
            document.body.appendChild(dummy);
            dummy.value = getProcessedExportTemplate(
                exportMetadata,
                tokenizedSpec,
                trackedFields
            );
            dummy.select();
            document.execCommand('copy');
            document.body.removeChild(dummy);
        }
    };
    const isDisabled = exportProcessingState !== 'Complete';
    logRender('ExportButtons');
    return (
        <>
            <Tooltip
                content={getI18nValue('Text_Tooltip_Export_Download')}
                relationship='label'
                withArrow
                mountNode={ttRefDownload}
            >
                <Button
                    onClick={handleDownload}
                    appearance='primary'
                    icon={<ArrowDownloadRegular />}
                    disabled={isDisabled}
                >
                    {getI18nValue('Text_Button_Download')}
                </Button>
            </Tooltip>
            <TooltipCustomMount setRef={setTtRefDownload} />
            <Tooltip
                content={getI18nValue('Text_Tooltip_Export_Copy')}
                relationship='label'
                withArrow
                mountNode={ttRefCopy}
            >
                <Button
                    onClick={handleCopy}
                    icon={<CopyRegular />}
                    disabled={isDisabled}
                >
                    {getI18nValue('Text_Button_Copy')}
                </Button>
            </Tooltip>
            <TooltipCustomMount setRef={setTtRefCopy} />
        </>
    );
};

const getProcessedExportTemplate = (
    metadata: UsermetaTemplate,
    tokenizedSpec: string,
    trackedFields: TrackedFields
) => {
    const informationTranslationPlaceholders = {
        name: getI18nValue('Template_Export_Information_Name_Empty'),
        description: getI18nValue(
            'Template_Export_Information_Description_Empty'
        ),
        author: getI18nValue('Template_Export_Author_Name_Empty')
    };
    return getExportTemplate({
        informationTranslationPlaceholders,
        metadata,
        tokenizedSpec,
        trackedFields
    });
};
