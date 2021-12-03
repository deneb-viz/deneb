import React from 'react';

import { ISliderStyles, Slider } from '@fluentui/react/lib/Slider';
import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import {
    isZoomControlDisabled,
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
import store from '../../../store';

const sliderStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            overflow: 'hidden'
        }
    },
    sliderStyles: Partial<ISliderStyles> = {
        root: {
            width: 100
        }
    },
    valueStackItemStyles: IStackItemStyles = {
        root: {
            padding: 4,
            cursor: 'default',
            userSelect: 'none'
        }
    };

const ZoomControls: React.FC = () => {
    const { editorZoomLevel, updateEditorZoomLevel } = store((state) => state),
        valueFormat = (value: number) => `${value}%`,
        zoomToLevel = (value: number) => updateEditorZoomLevel(value);
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
                    disabled={isZoomControlDisabled()}
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
                disabled={isZoomControlDisabled()}
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
