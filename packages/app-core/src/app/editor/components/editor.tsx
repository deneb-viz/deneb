import { createRef, Suspense, useLayoutEffect, useMemo } from 'react';
import {
    FluentProvider,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';
import 'allotment/dist/style.css';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { getDenebTheme } from '../../../lib';
import { EditorContent } from './editor-content';
import { EditorSuspense } from './editor-suspense';
import { SpecificationEditorProvider } from '../../../features/specification-editor';

const EDITOR_INTERFACE_ID = 'deneb-editor-interface';

const useInterfaceStyles = makeStyles({
    container: {
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        boxSizing: 'border-box',
        cursor: 'auto',
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: '100%'
    },
    themeBackground: {
        backgroundColor: tokens.colorNeutralBackground1
    },
    visualBackground: {
        backgroundColor: 'transparent'
    }
});

export const Editor = () => {
    const { previewAreaTransparentBackground, theme } = useDenebState(
        (state) => ({
            previewAreaTransparentBackground:
                state.editorPreferences.previewAreaTransparentBackground,
            theme: state.editorPreferences.theme
        })
    );
    const classes = useInterfaceStyles();
    const resolvedTheme = useMemo(() => getDenebTheme(theme), [theme]);
    const className = useMemo(
        () =>
            mergeClasses(
                classes.container,
                previewAreaTransparentBackground
                    ? classes.visualBackground
                    : classes.themeBackground
            ),
        [theme, previewAreaTransparentBackground]
    );

    // Handle allotment-specific styling based on theme
    const editorContentRef = createRef<HTMLDivElement>();
    useLayoutEffect(() => {
        editorContentRef.current?.style.setProperty(
            '--focus-border',
            tokens.colorBrandForeground1
        );
        editorContentRef.current?.style.setProperty(
            '--separator-border',
            tokens.colorNeutralStroke2
        );
    }, [editorContentRef, theme]);

    logRender('Editor');
    return (
        <FluentProvider
            theme={resolvedTheme}
            className={className}
            ref={editorContentRef}
            id={EDITOR_INTERFACE_ID}
        >
            <Suspense fallback={<EditorSuspense />}>
                <SpecificationEditorProvider>
                    <EditorContent />
                </SpecificationEditorProvider>
            </Suspense>
        </FluentProvider>
    );
};
