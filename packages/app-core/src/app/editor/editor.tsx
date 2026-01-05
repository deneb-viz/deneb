import { Suspense, useMemo } from 'react';
import {
    FluentProvider,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../state';
import { POPOVER_Z_INDEX, getDenebTheme } from '../../lib';
import { EditorContent } from './editor-content';
import { EditorSuspense } from './editor-suspense';

const useInterfaceStyles = makeStyles({
    container: {
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        cursor: 'auto',
        '& .editor-heading': {
            cursor: 'pointer'
        },
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`
    },
    tooltipMount: {
        zIndex: POPOVER_Z_INDEX
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
    logRender('Editor');
    return (
        <FluentProvider
            theme={resolvedTheme}
            className={className}
            id='visualEditor'
        >
            <Suspense
                fallback={
                    <EditorSuspense />
                }
            >
                <EditorContent />
            </Suspense>
        </FluentProvider>
    );
};
