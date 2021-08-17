import React from 'react';
import { useSelector } from 'react-redux';

import { ISliderStyles, Slider } from '@fluentui/react/lib/Slider';
import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { state } from '../../../store';
import {
    handleResetZoomLevel,
    handleSetZoomLevel,
    handleSetZoomToFit,
    handleZoomIn,
    handleZoomOut
} from '../../../core/ui/commands';
import {
    isZoomControlDisabled,
    isZoomInIconDisabled,
    isZoomOutIconDisabled,
    isZoomResetIconDisabled
} from '../../../core/ui/icons';
import ZoomButton from './ZoomButton';
import { i18nValue } from '../../../core/ui/i18n';

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
    const { zoom } = useSelector(state),
        valueFormat = (value: number) => `${value}%`;
    return (
        <>
            <ZoomButton
                i18nKey='Button_ZoomOut'
                iconName='CalculatorSubtract'
                onClick={handleZoomOut}
                disabled={isZoomOutIconDisabled()}
            />
            <StackItem styles={sliderStackItemStyles}>
                <Slider
                    styles={sliderStyles}
                    min={zoom.min}
                    max={zoom.max}
                    step={zoom.step}
                    value={zoom.value}
                    defaultValue={zoom.default}
                    showValue={false}
                    onChange={handleSetZoomLevel}
                    disabled={isZoomControlDisabled()}
                />
            </StackItem>
            <ZoomButton
                i18nKey='Button_ZoomIn'
                iconName='CalculatorAddition'
                onClick={handleZoomIn}
                disabled={isZoomInIconDisabled()}
            />
            <ZoomButton
                i18nKey='Button_ZoomReset'
                iconName='Refresh'
                onClick={handleResetZoomLevel}
                disabled={isZoomResetIconDisabled()}
            />
            <ZoomButton
                i18nKey='Button_ZoomFit'
                iconName='ZoomToFit'
                onClick={handleSetZoomToFit}
                disabled={isZoomControlDisabled()}
            />
            <StackItem styles={valueStackItemStyles}>
                <TooltipHost content={i18nValue('Zoom_Level_Tooltip')}>
                    <Text>{valueFormat(zoom.value)}</Text>
                </TooltipHost>
            </StackItem>
        </>
    );
};

export default ZoomControls;
