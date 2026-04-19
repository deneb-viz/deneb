import { useEffect, useMemo, useRef } from 'react';
import {
    makeStyles,
    Popover,
    PopoverSurface,
    tokens
} from '@fluentui/react-components';
import Editor from '@monaco-editor/react';

import { POPOVER_Z_INDEX } from '../../../../lib';
import { useDenebState } from '../../../../state';
import { buildEditorProps } from '../../../../components/code-editor/editor-configuration';
import { useDataTableInspector } from './inspector-popover-context';
import {
    formatInspectorValue,
    getInspectorDimensions,
    getInspectorLanguage
} from './inspector-popover-utils';

const useInspectorPopoverStyles = makeStyles({
    popoverSurface: {
        zIndex: POPOVER_Z_INDEX
    },
    editorContainer: {
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`
    }
});

/**
 * Single shared popover hosted at the `DataTableViewer` level. Reads its state
 * from `DataTableInspectorProvider` and re-anchors to whichever cell most
 * recently called `openInspector`. Only one instance should be mounted per
 * `DataTableViewer` — this guarantees at most one inspector is visible at a
 * time, and eliminates per-cell popover state duplication.
 */
export const InspectorPopover = () => {
    const classes = useInspectorPopoverStyles();
    const { fontSize, theme } = useDenebState((state) => ({
        fontSize: state.editorPreferences.jsonEditorFontSize,
        theme: state.editorPreferences.theme
    }));
    const { isOpen, anchorRef, rawValue, valueType, closeInspector } =
        useDataTableInspector();
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const formattedValue = useMemo(() => {
        if (valueType == null) return '';
        return formatInspectorValue(rawValue, valueType);
    }, [rawValue, valueType]);

    const language = useMemo(
        () =>
            valueType == null ? 'plaintext' : getInspectorLanguage(valueType),
        [valueType]
    );

    const dimensions = useMemo(
        () =>
            valueType == null
                ? { width: '0', height: '0' }
                : getInspectorDimensions(valueType),
        [valueType]
    );

    // Dismiss popover on any ancestor scroll, but ignore scrolling within the
    // popover's Monaco editor itself.
    useEffect(() => {
        if (!isOpen) return;
        const dismiss = (e: Event) => {
            if (editorContainerRef.current?.contains(e.target as Node)) return;
            closeInspector();
        };
        window.addEventListener('scroll', dismiss, true);
        return () => window.removeEventListener('scroll', dismiss, true);
    }, [isOpen, closeInspector]);

    return (
        <Popover
            open={isOpen}
            onOpenChange={(_e, data) => {
                if (!data.open) closeInspector();
            }}
            withArrow
            positioning={{ target: anchorRef?.current ?? null }}
        >
            <PopoverSurface className={classes.popoverSurface}>
                <div
                    ref={editorContainerRef}
                    className={classes.editorContainer}
                    style={{
                        width: dimensions.width,
                        height: dimensions.height
                    }}
                >
                    <Editor
                        {...buildEditorProps({
                            theme,
                            fontSize,
                            readOnly: true,
                            showLineNumbers: false,
                            wordWrap: false,
                            language
                        })}
                        value={formattedValue}
                    />
                </div>
            </PopoverSurface>
        </Popover>
    );
};
