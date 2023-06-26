import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

import store from '../../../store';
import { logRender } from '../../logging';
import { VegaContainer } from '../../vega-output';
import { getConfig } from '../../../core/utils/config';
import { FourD3D3D } from './fourd3d3d';

/**
 * Preview area styles
 */
const usePreviewStyles = (
    viewportWidth: number,
    viewportHeight: number,
    showViewportMarker: boolean,
    editorZoomLevel: number
) => {
    const borderWidth = getConfig().previewPane.viewportBorderSize;
    const height = viewportHeight;
    const width = viewportWidth;
    const scale = editorZoomLevel / 100;
    return makeStyles({
        previewArea: {
            ...shorthands.padding('2px'),
            boxSizing: 'border-box'
        },
        previewWrapper: {
            height: `${(height + borderWidth) * scale}px`,
            width: `${(width + borderWidth) * scale}px`,
            ...shorthands.overflow('visible'),
            ...shorthands.padding(`${borderWidth}px`),
            ...shorthands.borderStyle('dashed'),
            ...shorthands.borderWidth(`${borderWidth}px`),
            ...shorthands.borderColor(
                showViewportMarker ? tokens.colorNeutralStroke2 : 'transparent'
            ),
            ...shorthands.borderRadius('2px')
        },
        previewContainer: {
            display: 'flex',
            height: `${height}px`,
            minHeight: `${height}px`,
            width: `${width}px`,
            minWidth: `${width}px`,
            transform: `scale(${scale})`,
            transformOrigin: '0% 0% 0px'
        }
    });
};

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
            showViewportMarker: state.visualSettings.editor.showViewportMarker,
            status: state.specification.status,
            viewportHeight: state.visualSettings.display.viewportHeight,
            viewportWidth: state.visualSettings.display.viewportWidth,
            visual4d3d3d: state.visual4d3d3d
        }),
        shallow
    );
    const classes = usePreviewStyles(
        viewportWidth,
        viewportHeight,
        showViewportMarker,
        editorZoomLevel
    )();
    const out = useMemo(
        () => (visual4d3d3d ? <FourD3D3D /> : <VegaContainer />),
        [visual4d3d3d, editorZoomLevel]
    );
    logRender('VisualPreview', status, editorPreviewAreaHeight);
    return (
        <div className={classes.previewArea}>
            <div className={classes.previewWrapper}>
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
