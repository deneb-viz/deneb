import React from 'react';
import { useSelector } from 'react-redux';

import { ISliderStyles, Slider } from '@fluentui/react/lib/Slider';
import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';

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

const sliderStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            overflow: 'hidden'
        }
    },
    sliderStyles: Partial<ISliderStyles> = {
        root: {
            width: 150
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
                    valueFormat={valueFormat}
                    showValue
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
        </>
    );
};

export default ZoomControls;
