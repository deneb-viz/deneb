import React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import store from '../../../store';
import { getExportTemplate } from '../../../core/template';
import { i18nValue } from '../../../core/ui/i18n';
import { iconButtonStyles } from '../../../core/ui/icons';
import { hostServices } from '../../../core/services';
import { isFeatureEnabled } from '../../../core/utils/features';

const downloadIcon: IIconProps = { iconName: 'Download' };

export const ExportVisualDownloadButton: React.FC = () => {
    const name = store(
            (state) => state.templateExportMetadata?.information?.name
        ),
        resolvedName =
            name || i18nValue('Template_Export_Information_Name_Placeholder'),
        handleDownload = () => {
            /*  Pending API 4.0.0
                hostServices.download.exportVisualsContent(
                    getExportTemplate(),
                    `${resolvedName}.json`,
                    'json',
                    i18nValue('Template_Export_Json_File_Description')
                );
            */
        };

    return (
        (isFeatureEnabled('useDownloadApi') && (
            <Stack.Item>
                <IconButton
                    iconProps={downloadIcon}
                    styles={iconButtonStyles}
                    ariaLabel={i18nValue('Template_Export_Json_Copy')}
                    ariaDescription={i18nValue('Template_Export_Json_Copy')}
                    onClick={handleDownload}
                />
            </Stack.Item>
        )) || <></>
    );
};
