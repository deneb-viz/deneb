import React from 'react';
import { useSelector } from 'react-redux';
import { state } from '../../../store';
import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { ISliderStyles, Slider } from '@fluentui/react/lib/Slider';
import { handleSetZoomLevel } from '../../../core/ui/commands';

const sliderStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            overflow: 'hidden'
        }
    },
    sliderStyles: Partial<ISliderStyles> = {
        root: {
            width: 200
        }
    };

const ZoomControls: React.FC = () => {
    const { zoom } = useSelector(state),
        valueFormat = (value: number) => `${value}%`;
    return (
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
    );
};

export default ZoomControls;
