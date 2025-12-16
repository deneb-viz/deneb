import { useState } from 'react';
import {
    makeStyles,
    Slider,
    SliderProps,
    tokens,
    Tooltip
} from '@fluentui/react-components';

import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { TooltipCustomMount } from '../../../../components/ui';
import { useDenebState } from '../../../../state';
import { logRender } from '@deneb-viz/utils/logging';

export const useZoomSliderStyles = makeStyles({
    slider: {
        minWidth: '75px',
        width: '75px',
        height: '100%',
        margin: `${tokens.spacingVerticalNone} ${tokens.spacingVerticalXXS}`,
        '& div::before': { backgroundImage: 'none' }
    }
});

export const ZoomSlider = () => {
    const classes = useZoomSliderStyles();
    const {
        editorZoomLevel,
        zoomFitEnabled,
        translate,
        updateEditorZoomLevel
    } = useDenebState((state) => ({
        editorZoomLevel: state.editorZoomLevel,
        zoomFitEnabled: state.commands.zoomFit,
        translate: state.i18n.translate,
        updateEditorZoomLevel: state.updateEditorZoomLevel
    }));
    const i18nText = translate('Text_Slider_Zoom_Level');
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
                    min={VISUAL_PREVIEW_ZOOM_CONFIGURATION.min}
                    max={VISUAL_PREVIEW_ZOOM_CONFIGURATION.max}
                    step={VISUAL_PREVIEW_ZOOM_CONFIGURATION.step}
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
