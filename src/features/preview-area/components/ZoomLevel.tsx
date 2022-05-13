import React from 'react';

import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { i18nValue } from '../../../core/ui/i18n';
import { useStoreProp } from '../../../store';
import { reactLog } from '../../../core/utils/reactLog';

const valueStackItemStyles: IStackItemStyles = {
    root: {
        padding: 4,
        cursor: 'default',
        userSelect: 'none',
        width: 45,
        minWidth: 45
    }
};

export const ZoomLevel: React.FC = () => {
    const editorZoomLevel = useStoreProp<number>('editorZoomLevel');
    const valueFormat = (value: number) => `${value}%`;
    reactLog('Rendering [ZoomLevel]');
    return (
        <StackItem styles={valueStackItemStyles}>
            <TooltipHost content={i18nValue('Zoom_Level_Tooltip')}>
                <Text>{valueFormat(editorZoomLevel)}</Text>
            </TooltipHost>
        </StackItem>
    );
};
