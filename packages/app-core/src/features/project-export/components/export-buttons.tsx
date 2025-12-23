import { useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowDownloadRegular, CopyRegular } from '@fluentui/react-icons';

import { getExportTemplate } from '@deneb-viz/json-processing';
import { logRender } from '@deneb-viz/utils/logging';
import { getDenebState, useDenebState } from '../../../state';
import { TooltipCustomMount } from '../../../components/ui';
import { UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { TrackedFields } from '@deneb-viz/json-processing/field-tracking';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';

/**
 * Displays download and copy template to clipboard buttons.
 */
export const ExportButtons = () => {
    const {
        exportMetadata,
        exportProcessingState,
        templateName,
        tokenizedSpec,
        trackedFields,
        translate
    } = useDenebState((state) => ({
        exportMetadata: state.export?.metadata,
        exportProcessingState: state.interface.exportProcessingState,
        isTrackingFields: state.interface.isTrackingFields,
        templateName: state.export?.metadata?.information?.name,
        tokenizedSpec: state.fieldUsage.tokenizedSpec,
        trackedFields: state.fieldUsage.dataset,
        translate: state.i18n.translate
    }));
    const { isDownloadPermitted, downloadJsonFile } =
        useDenebPlatformProvider();
    const [ttRefDownload, setTtRefDownload] = useState<HTMLElement | null>();
    const [ttRefCopy, setTtRefCopy] = useState<HTMLElement | null>();
    const resolvedName =
        templateName ||
        translate('Template_Export_Information_Name_Placeholder');
    const handleDownload = () => {
        if (exportMetadata && tokenizedSpec && trackedFields) {
            downloadJsonFile(
                getProcessedExportTemplate(
                    exportMetadata,
                    tokenizedSpec,
                    trackedFields
                ),
                `${resolvedName}.deneb.json`,
                translate('Template_Export_Json_File_Description')
            );
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
    const cannotDownload = isDisabled || !isDownloadPermitted;
    logRender('ExportButtons');
    return (
        <>
            <Tooltip
                content={translate(
                    cannotDownload
                        ? 'Tooltip_Export_Download_Disabled'
                        : 'Tooltip_Export_Download'
                )}
                relationship='label'
                withArrow
                mountNode={ttRefDownload}
            >
                <Button
                    onClick={handleDownload}
                    appearance='primary'
                    icon={<ArrowDownloadRegular />}
                    disabled={cannotDownload}
                >
                    {translate('Button_Download')}
                </Button>
            </Tooltip>
            <TooltipCustomMount setRef={setTtRefDownload} />
            <Tooltip
                content={translate('Tooltip_Export_Copy')}
                relationship='label'
                withArrow
                mountNode={ttRefCopy}
            >
                <Button
                    onClick={handleCopy}
                    icon={<CopyRegular />}
                    disabled={isDisabled}
                >
                    {translate('Button_Copy')}
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
    const { translate } = getDenebState().i18n;
    const informationTranslationPlaceholders = {
        name: translate('Template_Export_Information_Name_Empty'),
        description: translate('Template_Export_Information_Description_Empty'),
        author: translate('Template_Export_Author_Name_Empty')
    };
    return getExportTemplate({
        informationTranslationPlaceholders,
        metadata,
        tokenizedSpec,
        trackedFields
    });
};
