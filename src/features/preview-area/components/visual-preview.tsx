import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import {
    makeStyles,
    shorthands,
    tokens,
    mergeClasses
} from '@fluentui/react-components';

import store from '../../../store';
import { VegaContainer } from '../../vega-output';
import { FourD3D3D } from './fourd3d3d';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { logRender } from '@deneb-viz/utils/logging';

/**
 * Preview area base styles (static). Dynamic sizing is applied via inline styles.
 */
const usePreviewStyles = makeStyles({
    previewArea: {
        ...shorthands.padding('2px'),
        ...shorthands.overflow('overlay'),
        boxSizing: 'border-box',
        width: '100%',
        height: '100%'
    },
    previewWrapper: {
        // dynamic height/width driven by CSS variables
        height: 'calc((var(--vp-height) + var(--vp-border)) * var(--vp-scale))',
        width: 'calc((var(--vp-width) + var(--vp-border)) * var(--vp-scale))',
        ...shorthands.padding('var(--vp-border)'),
        ...shorthands.borderStyle('dashed'),
        ...shorthands.borderWidth('var(--vp-border)'),
        ...shorthands.borderRadius('2px')
    },
    previewWrapperViewportMarker: {
        ...shorthands.borderColor(tokens.colorNeutralStroke2)
    },
    previewWrapperNoMarker: {
        ...shorthands.borderColor('transparent')
    },
    previewContainer: {
        display: 'flex',
        height: 'var(--vp-height)',
        minHeight: 'var(--vp-height)',
        width: 'var(--vp-width)',
        minWidth: 'var(--vp-width)',
        transform: 'scale(var(--vp-scale))',
        transformOrigin: '0% 0% 0px'
    }
});

/**
 * Dedicated container for the visual when in the advanced editor, that allows
 * us to add our specific styling and customizations, without affecting the
 * main Vega container (which is used in both views).
 */
export const VisualPreview: React.FC = () => {
    const {
        editorPreviewAreaHeight,
        editorZoomLevel,
        status,
        viewportHeight,
        viewportWidth,
        showViewportMarker,
        visual4d3d3d
    } = store(
        (state) => ({
            editorPreviewAreaHeight: state.editorPreviewAreaHeight,
            editorZoomLevel: state.editorZoomLevel,
            showViewportMarker:
                state.visualSettings.editor.preview.showViewportMarker.value,
            status: state.specification.status,
            viewportHeight: Number.parseFloat(
                state.visualSettings.stateManagement.viewport.viewportHeight
                    .value
            ),
            viewportWidth: Number.parseFloat(
                state.visualSettings.stateManagement.viewport.viewportWidth
                    .value
            ),
            visual4d3d3d: state.visual4d3d3d
        }),
        shallow
    );
    const classes = usePreviewStyles();
    const borderWidth = DEBUG_PANE_CONFIGURATION.viewportBorderSize;
    const scale = editorZoomLevel / 100;
    const styleVars: React.CSSProperties = {
        ['--vp-height' as unknown as keyof React.CSSProperties]: `${viewportHeight}px`,
        ['--vp-width' as unknown as keyof React.CSSProperties]: `${viewportWidth}px`,
        ['--vp-border' as unknown as keyof React.CSSProperties]: `${borderWidth}px`,
        ['--vp-scale' as unknown as keyof React.CSSProperties]: String(scale)
    };
    const out = useMemo(
        () => (visual4d3d3d ? <FourD3D3D /> : <VegaContainer />),
        [visual4d3d3d, editorZoomLevel]
    );
    logRender('VisualPreview', status, editorPreviewAreaHeight);
    return (
        <div className={classes.previewArea} style={styleVars}>
            <div
                className={mergeClasses(
                    classes.previewWrapper,
                    showViewportMarker
                        ? classes.previewWrapperViewportMarker
                        : classes.previewWrapperNoMarker
                )}
            >
                <div
                    id='deneb-visual-preview'
                    className={classes.previewContainer}
                >
                    {out}
                </div>
            </div>
        </div>
    );
};
