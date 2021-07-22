import React from 'react';
import { useSelector } from 'react-redux';

import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';
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
import { i18nValue } from '../../../core/ui/i18n';
import {
    isZoomInIconDisabled,
    isZoomOutIconDisabled,
    isZoomResetIconDisabled,
    zoomIconButtonStyles
} from '../../../core/ui/icons';

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
    },
    zoomInIcon: IIconProps = {
        iconName: 'CalculatorAddition'
    },
    zoomOutIcon: IIconProps = {
        iconName: 'CalculatorSubtract'
    },
    zoomResetIcon: IIconProps = {
        iconName: 'Refresh'
    },
    zoomFitIcon: IIconProps = {
        iconName: 'ZoomToFit'
    };

const ZoomControls: React.FC = () => {
    const { zoom } = useSelector(state),
        valueFormat = (value: number) => `${value}%`;
    return (
        <>
            <StackItem>
                <IconButton
                    iconProps={zoomOutIcon}
                    styles={zoomIconButtonStyles}
                    onClick={handleZoomOut}
                    disabled={isZoomOutIconDisabled()}
                    text={i18nValue('Button_ZoomOut')}
                    ariaLabel={i18nValue('Button_ZoomOut')}
                />
            </StackItem>
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
                />
            </StackItem>
            <StackItem>
                <IconButton
                    iconProps={zoomInIcon}
                    styles={zoomIconButtonStyles}
                    onClick={handleZoomIn}
                    disabled={isZoomInIconDisabled()}
                    text={i18nValue('Button_ZoomIn')}
                    ariaLabel={i18nValue('Button_ZoomIn')}
                />
            </StackItem>
            <StackItem>
                <IconButton
                    iconProps={zoomResetIcon}
                    styles={zoomIconButtonStyles}
                    onClick={handleResetZoomLevel}
                    disabled={isZoomResetIconDisabled()}
                    text={i18nValue('Button_ZoomReset')}
                    ariaLabel={i18nValue('Button_ZoomReset')}
                />
            </StackItem>
            <StackItem>
                <IconButton
                    iconProps={zoomFitIcon}
                    styles={zoomIconButtonStyles}
                    onClick={handleSetZoomToFit}
                    text={i18nValue('Button_ZoomFit')}
                    ariaLabel={i18nValue('Button_ZoomFit')}
                />
            </StackItem>
        </>
    );
};

export default ZoomControls;
