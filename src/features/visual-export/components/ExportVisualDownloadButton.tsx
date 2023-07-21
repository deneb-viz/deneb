import React, { useState } from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowDownloadRegular } from '@fluentui/react-icons';
import { shallow } from 'zustand/shallow';

//import store from '../../../store';
import { isFeatureEnabled } from '../../../core/utils/features';
import { getI18nValue } from '../../i18n';

const downloadIcon: IIconProps = { iconName: 'Download' };
import { TooltipCustomMount } from '../../interface';

export const ExportVisualDownloadButton: React.FC = () => {
    /*const name = store(
            (state) => state.templateExportMetadata?.information?.name
        ),
        resolvedName =
    const [ttRef, setTtRef] = useState<HTMLElement | null>();
    const handleDownload = () => {
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
                <Tooltip
                    content={getI18nValue('Template_Export_Json_Copy')}
                    relationship='label'
                    withArrow
                    mountNode={ttRef}
                >
                    <Button
                        onClick={handleDownload}
                        icon={<ArrowDownloadRegular />}
                    />
                </Tooltip>
                <TooltipCustomMount setRef={setTtRef} />
            </Stack.Item>
        )) || <></>
    );
};
