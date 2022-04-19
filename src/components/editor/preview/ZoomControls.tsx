import React from 'react';

import { ISliderStyles, Slider } from '@fluentui/react/lib/Slider';
import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import {
    isZoomControlDisabledReact,
    isZoomInIconDisabled,
    isZoomOutIconDisabled,
    isZoomResetIconDisabled
} from '../../../core/ui/icons';
import ZoomButton from './ZoomButton';
import { i18nValue } from '../../../core/ui/i18n';
import { zoomConfig } from '../../../core/ui/dom';
import {
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset
} from '../../../core/ui/commands';
import { useStoreProp } from '../../../store';
import { reactLog } from '../../../core/utils/logger';

const sliderStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            overflow: 'hidden'
        }
    },
    sliderStyles: Partial<ISliderStyles> = {
        root: {
            width: 75
        }
    },
    valueStackItemStyles: IStackItemStyles = {
        root: {
            padding: 4,
            cursor: 'default',
            userSelect: 'none',
            width: 45,
            minWidth: 45
        }
    };

const ZoomControls: React.FC = () => {
    const editorZoomLevel = useStoreProp<number>('editorZoomLevel');
    const updateEditorZoomLevel = useStoreProp<(zoomLevel: number) => void>(
        'updateEditorZoomLevel'
    );
    const valueFormat = (value: number) => `${value}%`;
    const zoomToLevel = (value: number) => updateEditorZoomLevel(value);
    reactLog('Rendering [ZoomControls]');
    return (
        <>
            <ZoomButton
                i18nKey='Button_ZoomOut'
                iconName='CalculatorSubtract'
                onClick={handleZoomOut}
                disabled={isZoomOutIconDisabled(editorZoomLevel)}
            />
            <StackItem styles={sliderStackItemStyles}>
                <Slider
                    styles={sliderStyles}
                    min={zoomConfig.min}
                    max={zoomConfig.max}
                    step={zoomConfig.step}
                    value={editorZoomLevel}
                    defaultValue={zoomConfig.default}
                    showValue={false}
                    onChange={zoomToLevel}
                    disabled={isZoomControlDisabledReact()}
                />
            </StackItem>
            <ZoomButton
                i18nKey='Button_ZoomIn'
                iconName='CalculatorAddition'
                onClick={handleZoomIn}
                disabled={isZoomInIconDisabled(editorZoomLevel)}
            />
            <ZoomButton
                i18nKey='Button_ZoomReset'
                iconName='Refresh'
                onClick={handleZoomReset}
                disabled={isZoomResetIconDisabled(editorZoomLevel)}
            />
            <ZoomButton
                i18nKey='Button_ZoomFit'
                iconName='ZoomToFit'
                onClick={handleZoomFit}
                disabled={isZoomControlDisabledReact()}
            />
            <StackItem styles={valueStackItemStyles}>
                <TooltipHost content={i18nValue('Zoom_Level_Tooltip')}>
                    <Text>{valueFormat(editorZoomLevel)}</Text>
                </TooltipHost>
            </StackItem>
        </>
    );
};

export default ZoomControls;
