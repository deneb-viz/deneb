import React from 'react';
import { useSelector } from 'react-redux';

import { Stack } from '@fluentui/react/lib/Stack';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import { state } from '../../store';
import { getExportTemplate } from '../../core/template';
import { i18nValue } from '../../core/ui/i18n';
import { iconButtonStyles } from '../../core/ui/icons';
import { hostServices } from '../../core/services';
import { isFeatureEnabled } from '../../core/utils/features';

const downloadIcon: IIconProps = { iconName: 'Download' };

const ExportDownloadButton: React.FC = () => {
    const { name } =
            useSelector(state).templates.templateExportMetadata.information,
        resolvedName =
            name || i18nValue('Template_Export_Information_Name_Placeholder'),
        handleDownload = () => {
            hostServices.download.exportVisualsContent(
                getExportTemplate(),
                `${resolvedName}.json`,
                'json',
                i18nValue('Template_Export_Json_File_Description')
            );
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

export default ExportDownloadButton;
