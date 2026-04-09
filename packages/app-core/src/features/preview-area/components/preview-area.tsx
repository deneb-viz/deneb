import { type CSSProperties, useMemo } from 'react';
import {
    makeStyles,
    shorthands,
    tokens,
    mergeClasses
} from '@fluentui/react-components';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import type { PartialOptions } from 'overlayscrollbars';
import 'overlayscrollbars/overlayscrollbars.css';
import { VegaViewProvider } from '@deneb-viz/vega-react';

import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { logRender } from '@deneb-viz/utils/logging';
import { VisualViewer } from '../../../components/visual-viewer';
import { createSchemaValidator } from '../../../lib/vega/compilation';
import { useDenebState } from '../../../state';
import { COMPILATION_STATUS_DEFAULT } from '@deneb-viz/vega-runtime/compilation';
import { getScrollbarStyleVars } from '../../../lib/scrollbars/scrollbar-style-vars';

/**
 * Stable overlayscrollbars options reference for the editor preview area.
 * Lifted to module scope so the library does not re-apply options on every
 * render (the library compares the `options` prop by reference and calls
 * `instance.options(...)` whenever it changes). Mirrors the SCROLLBAR_OPTIONS
 * used in visual-viewer.tsx.
 */
const SCROLLBAR_OPTIONS: PartialOptions = {
    scrollbars: {
        autoHide: 'never',
        visibility: 'auto'
    },
    overflow: { x: 'scroll', y: 'scroll' }
};

/**
 * Preview area base styles (static). Dynamic sizing is applied via inline styles.
 */
const usePreviewStyles = makeStyles({
    previewArea: {
        ...shorthands.padding('2px'),
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        // Override the overlayscrollbars default theme's hard-coded CSS
        // custom properties on .os-scrollbar descendants so the user's
        // display.scrollbar* settings (applied as inline style vars on the
        // host via getScrollbarStyleVars) actually reach the rendered
        // scrollbar handle. The descendant selector's specificity (0,2,0)
        // beats the library's own .os-scrollbar and .os-theme-dark rules
        // (both 0,1,0), and `inherit` resolves via the cascade back up to
        // the host. Mirrors the same override in visual-viewer.tsx. See #480.
        '& .os-scrollbar': {
            '--os-size': 'inherit',
            '--os-handle-bg': 'inherit',
            '--os-handle-bg-hover': 'inherit',
            '--os-handle-bg-active': 'inherit',
            '--os-handle-border-radius': 'inherit'
        }
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
        provider,
        status,
        viewportHeight,
        viewportWidth,
        showViewportMarker,
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
        scrollbarWidth
    } = useDenebState((state) => ({
        editorPreviewAreaHeight: state.editor.previewAreaViewport.height ?? 0,
        editorZoomLevel: state.editorZoomLevel,
        provider: state.project.provider as SpecProvider,
        showViewportMarker: state.editorPreferences.previewAreaShowBorder,
        status: state.compilation.result?.status ?? COMPILATION_STATUS_DEFAULT,
        viewportHeight: state.interface.embedViewport?.height ?? 0,
        viewportWidth: state.interface.embedViewport?.width ?? 0,
        scrollbarColor: state.visualRender.scrollbarColor,
        scrollbarOpacity: state.visualRender.scrollbarOpacity,
        scrollbarRadius: state.visualRender.scrollbarRadius,
        scrollbarWidth: state.visualRender.scrollbarWidth
    }));

    /**
     * Schema validator for spec validation during compilation.
     * Created here (editor path only) so the schema dependency chain
     * doesn't leak into viewer-only builds.
     */
    const schemaValidator = useMemo(
        () => createSchemaValidator(provider),
        [provider]
    );
    const classes = usePreviewStyles();
    const borderWidth = DEBUG_PANE_CONFIGURATION.viewportBorderSize;
    const scale = editorZoomLevel / 100;
    const styleVars: CSSProperties = {
        ['--vp-height' as unknown as keyof CSSProperties]: `${viewportHeight}px`,
        ['--vp-width' as unknown as keyof CSSProperties]: `${viewportWidth}px`,
        ['--vp-border' as unknown as keyof CSSProperties]: `${borderWidth}px`,
        ['--vp-scale' as unknown as keyof CSSProperties]: String(scale)
    };
    const scrollbarStyleVars = getScrollbarStyleVars(
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
        scrollbarWidth
    );
    const combinedStyleVars: CSSProperties = {
        ...styleVars,
        ...scrollbarStyleVars
    };
    logRender('VisualPreview', status, editorPreviewAreaHeight);
    return (
        <VegaViewProvider>
            <OverlayScrollbarsComponent
                className={classes.previewArea}
                style={combinedStyleVars}
                options={SCROLLBAR_OPTIONS}
                defer
            >
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
                        <VisualViewer
                            isEmbeddedInEditor
                            schemaValidator={schemaValidator}
                        />
                    </div>
                </div>
            </OverlayScrollbarsComponent>
        </VegaViewProvider>
    );
};
