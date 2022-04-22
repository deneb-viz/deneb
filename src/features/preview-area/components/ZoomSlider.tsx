import React from 'react';

import { ISliderStyles, Slider } from '@fluentui/react/lib/Slider';
import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';

import { isZoomControlDisabledReact } from '../../../core/ui/icons';
import { zoomConfig } from '../../../core/ui/dom';
import { useStoreProp } from '../../../store';
import { reactLog } from '../../../core/utils/reactLog';

const sliderStackItemStyles: IStackItemStyles = {
    root: {
        display: 'flex',
        overflow: 'hidden'
    }
};

const sliderStyles: Partial<ISliderStyles> = {
    root: {
        width: 75
    }
};

export const ZoomSlider: React.FC = () => {
    const editorZoomLevel = useStoreProp<number>('editorZoomLevel');
    const updateEditorZoomLevel = useStoreProp<(zoomLevel: number) => void>(
        'updateEditorZoomLevel'
    );
    const zoomToLevel = (value: number) => updateEditorZoomLevel(value);
    reactLog('Rendering [ZoomSlider]');
    return (
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
    );
};
