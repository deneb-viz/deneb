import React from 'react';

import {
    isZoomControlDisabledReact,
    isZoomInIconDisabled,
    isZoomOutIconDisabled,
    isZoomResetIconDisabled
} from '../../../core/ui/icons';
import { ZoomButton } from './ZoomButton';
import { ZoomSlider } from './ZoomSlider';
import { ZoomLevel } from './ZoomLevel';
import {
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset
} from '../../../core/ui/commands';
import { useStoreProp } from '../../../store';
import { reactLog } from '../../../core/utils/reactLog';

export const ZoomControls: React.FC = () => {
    const editorZoomLevel = useStoreProp<number>('editorZoomLevel');
    reactLog('Rendering [ZoomControls]');
    return (
        <>
            <ZoomButton
                i18nKey='Button_ZoomOut'
                iconName='CalculatorSubtract'
                onClick={handleZoomOut}
                disabled={isZoomOutIconDisabled(editorZoomLevel)}
            />
            <ZoomSlider />
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
            <ZoomLevel />
        </>
    );
};
