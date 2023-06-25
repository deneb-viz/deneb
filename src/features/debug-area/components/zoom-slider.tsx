import React from 'react';
import { shallow } from 'zustand/shallow';
import { Slider, SliderProps, Tooltip } from '@fluentui/react-components';

import { useDebugStyles } from '..';
import store from '../../../store';
import { logRender } from '../../logging';
import { getConfig } from '../../../core/utils/config';
import { getI18nValue } from '../../i18n';

const CONFIGURATION = getConfig();

export const ZoomSlider: React.FC = () => {
    const classes = useDebugStyles();
    const { editorZoomLevel, updateEditorZoomLevel } = store(
        (state) => ({
            editorZoomLevel: state.editorZoomLevel,
            updateEditorZoomLevel: state.updateEditorZoomLevel
        }),
        shallow
    );
    const i18nText = getI18nValue('Text_Slider_Zoom_Level');
    const onChange: SliderProps['onChange'] = (event, data) =>
        updateEditorZoomLevel(data.value);
    logRender('ZoomSlider');
    return (
        <Tooltip content={i18nText} relationship='label'>
            <Slider
                className={classes.toolbarSlider}
                min={CONFIGURATION.zoomLevel.min}
                max={CONFIGURATION.zoomLevel.max}
                step={CONFIGURATION.zoomLevel.step}
                value={editorZoomLevel}
                size='small'
                onChange={onChange}
            />
        </Tooltip>
    );
};
