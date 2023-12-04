import React, { useState } from 'react';
import { shallow } from 'zustand/shallow';
import { Slider, SliderProps, Tooltip } from '@fluentui/react-components';

import store from '../../../store';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { useToolbarStyles } from '.';
import { TooltipCustomMount } from '../../interface';
import { VISUAL_PREVIEW_ZOOM } from '../../../../config';

export const ZoomSlider: React.FC = () => {
    const classes = useToolbarStyles();
    const { editorZoomLevel, zoomFitEnabled, updateEditorZoomLevel } = store(
        (state) => ({
            editorZoomLevel: state.editorZoomLevel,
            zoomFitEnabled: state.commands.zoomFit,
            updateEditorZoomLevel: state.updateEditorZoomLevel
        }),
        shallow
    );
    const i18nText = getI18nValue('Text_Slider_Zoom_Level');
    const onChange: SliderProps['onChange'] = (event, data) =>
        updateEditorZoomLevel(data.value);
    const [ref, setRef] = useState<HTMLElement | null>();
    logRender('ZoomSlider');
    return (
        <>
            <Tooltip
                content={i18nText}
                relationship='label'
                withArrow
                mountNode={ref}
            >
                <Slider
                    className={classes.slider}
                    min={VISUAL_PREVIEW_ZOOM.min}
                    max={VISUAL_PREVIEW_ZOOM.max}
                    step={VISUAL_PREVIEW_ZOOM.step}
                    value={editorZoomLevel}
                    size='small'
                    onChange={onChange}
                    disabled={!zoomFitEnabled}
                />
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </>
    );
};
