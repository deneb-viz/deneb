import { type CSSProperties } from 'react';
import {
    makeStyles,
    shorthands,
    tokens,
    mergeClasses
} from '@fluentui/react-components';

import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { logRender } from '@deneb-viz/utils/logging';
import { VisualViewer } from '../../../components/visual-viewer';
import { useDenebState } from '../../../state';

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
        padding: 'var(--vp-border)',
        borderRadius: tokens.borderRadiusSmall,
        ...shorthands.borderStyle('dashed'),
        ...shorthands.borderWidth('var(--vp-border)')
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
export const PreviewArea = () => {
    const {
        editorPreviewAreaHeight,
        editorZoomLevel,
        status,
        viewportHeight,
        viewportWidth,
        showViewportMarker
    } = useDenebState((state) => ({
        editorPreviewAreaHeight: state.editorPreviewAreaHeight,
        editorZoomLevel: state.editorZoomLevel,
        showViewportMarker:
            state.visualSettings.editor.preview.showViewportMarker.value,
        status: state.specification.status,
        viewportHeight: state.interface.embedViewport?.height ?? 0,
        viewportWidth: state.interface.embedViewport?.width ?? 0
    }));
    const classes = usePreviewStyles();
    const borderWidth = DEBUG_PANE_CONFIGURATION.viewportBorderSize;
    const scale = editorZoomLevel / 100;
    const styleVars: CSSProperties = {
        ['--vp-height' as unknown as keyof CSSProperties]: `${viewportHeight}px`,
        ['--vp-width' as unknown as keyof CSSProperties]: `${viewportWidth}px`,
        ['--vp-border' as unknown as keyof CSSProperties]: `${borderWidth}px`,
        ['--vp-scale' as unknown as keyof CSSProperties]: String(scale)
    };
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
                    <VisualViewer isEmbeddedInEditor />
                </div>
            </div>
        </div>
    );
};
