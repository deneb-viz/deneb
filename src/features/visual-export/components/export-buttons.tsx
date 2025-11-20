import React, { useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowDownloadRegular, CopyRegular } from '@fluentui/react-icons';
import { shallow } from 'zustand/shallow';

import { getI18nValue } from '../../i18n';
import store, { getState } from '../../../store';
import { logDebug, logRender } from '../../logging';
import { getExportTemplate } from '@deneb-viz/json-processing';
import { getVisualHost } from '@deneb-viz/powerbi-compat/visual-host';
import { TooltipCustomMount } from '@deneb-viz/app-core';

/**
 * Displays download and copy template to clipboard buttons.
 */
export const ExportButtons: React.FC = () => {
    const { exportProcessingState, templateName } = store(
        (state) => ({
            exportProcessingState: state.interface.exportProcessingState,
            isTrackingFields: state.interface.isTrackingFields,
            templateName: state.export?.metadata?.information?.name
        }),
        shallow
    );
    const [ttRefDownload, setTtRefDownload] = useState<HTMLElement | null>();
    const [ttRefCopy, setTtRefCopy] = useState<HTMLElement | null>();
    const resolvedName =
        templateName ||
        getI18nValue('Template_Export_Information_Name_Placeholder');
    const handleDownload = () => {
        getVisualHost()
            .downloadService.exportVisualsContentExtended(
                getProcessedExportTemplate(),
                `${resolvedName}.deneb.json`,
                'json',
                getI18nValue('Template_Export_Json_File_Description')
            )
            .then((result) => {
                logDebug('handleDownload result', result);
            });
    };
    const handleCopy = () => {
        const dummy = document.createElement('textarea');
        document.body.appendChild(dummy);
        dummy.value = getProcessedExportTemplate();
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
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

const getProcessedExportTemplate = () => {
    const {
        export: { metadata },
        fieldUsage: { dataset: trackedFields, tokenizedSpec }
    } = getState();
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
