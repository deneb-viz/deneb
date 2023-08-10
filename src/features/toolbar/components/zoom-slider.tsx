import React, { useState } from 'react';
import { shallow } from 'zustand/shallow';
import { Slider, SliderProps, Tooltip } from '@fluentui/react-components';

import store from '../../../store';
import { logRender } from '../../logging';
import { getConfig } from '../../../core/utils/config';
import { getI18nValue } from '../../i18n';
import { useToolbarStyles } from '.';
import { TooltipCustomMount } from '../../interface';

const CONFIGURATION = getConfig();

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
                    min={CONFIGURATION.zoomLevel.min}
                    max={CONFIGURATION.zoomLevel.max}
                    step={CONFIGURATION.zoomLevel.step}
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
