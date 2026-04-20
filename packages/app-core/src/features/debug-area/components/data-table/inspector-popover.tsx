import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    makeStyles,
    Popover,
    PopoverSurface,
    tokens
} from '@fluentui/react-components';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';

import { POPOVER_Z_INDEX } from '../../../../lib';
import { useDenebState } from '../../../../state';
import { buildEditorProps } from '../../../../components/code-editor/editor-configuration';
import { useDataTableInspector } from './inspector-popover-context';
import {
    formatInspectorValue,
    getInspectorDimensions,
    getInspectorLanguage
} from './inspector-popover-utils';

// Selector used by both close-path guards to recognise a click that landed on
// another inspectable DataTableCell — those cells carry their own onClick that
// retargets the shared popover, so dismissing would stomp the retarget.
const INSPECTABLE_CELL_SELECTOR = '[role="button"][aria-haspopup="dialog"]';

const useInspectorPopoverStyles = makeStyles({
    popoverSurface: {
        zIndex: POPOVER_Z_INDEX
    },
    editorContainer: {
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        // Monaco renders its scroll/line layers on their own compositor
        // layers (via `transform: translate3d`) to accelerate scrolling. That
        // means plain `overflow: hidden` on an ancestor clips them visually
        // but not for hit-testing — clicks outside the visible editor bounds
        // can still land on Monaco's `.lines-content`. `contain: strict`
        // constrains paint AND hit-testing to the element's box, which is
        // what actually prevents Monaco from swallowing those outside
        // clicks.
        overflow: 'hidden',
        position: 'relative',
        contain: 'strict'
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
    const { isOpen, anchorRef, cellId, rawValue, valueType, closeInspector } =
        useDataTableInspector();
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);

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

    // Monaco loads asynchronously, so when Fluent's `trapFocus` tries to move
    // focus into the PopoverSurface on open, there is nothing focusable yet
    // and its auto-focus no-ops. Capture the editor instance on mount and
    // focus it immediately so the user can scroll, select, and copy from the
    // keyboard right away.
    const handleEditorMount = useCallback<OnMount>((editor) => {
        editorRef.current = editor;
        editor.focus();
    }, []);

    // When the popover retargets from one cell to another without closing
    // (single-inspector coordination), the Editor component's props change
    // but it does not remount — `onMount` will not fire again. The user's
    // click landed on the new cell div, so focus is now there rather than in
    // Monaco. Re-focus the editor so the inspector behaves consistently
    // whether it was just opened or retargeted.
    useEffect(() => {
        if (!isOpen || !cellId) return;
        editorRef.current?.focus();
    }, [isOpen, cellId]);

    // Prevent Escape (and other popover-local keys) from reaching the Power
    // BI host. Fluent's Popover closes the surface on Escape via its own
    // modal-attributes handler, but does not stop propagation, so the
    // keydown continues up to the iframe and triggers Power BI's default
    // Escape handler (which shifts focus to "Back to report"). Stopping
    // propagation at the surface lets Fluent do its job while keeping the
    // event out of the host.
    const handleSurfaceKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
            }
        },
        []
    );

    // Handle Fluent's close-intent events. Fluent fires onOpenChange(false)
    // on both Escape and outside-click dismissal. For outside clicks that
    // land on another inspectable cell, the cell's own onClick has already
    // dispatched `openInspector` for the new target — treating the dismiss
    // as a close would stomp that retarget and leave the popover closed.
    // Ignore the dismiss in that case so the retarget wins; otherwise
    // proceed with the usual close behaviour.
    const handleOpenChange = useCallback(
        (
            event: Parameters<
                NonNullable<
                    React.ComponentProps<typeof Popover>['onOpenChange']
                >
            >[0],
            data: { open: boolean }
        ) => {
            if (data.open) return;
            const target = (event as { target?: EventTarget | null })?.target;
            if (
                target instanceof Element &&
                target.isConnected &&
                target.closest(INSPECTABLE_CELL_SELECTOR)
            ) {
                return;
            }
            closeInspector();
        },
        [closeInspector]
    );

    // Coordinate-based outside-click dismissal. Fluent's built-in light
    // dismiss relies on DOM-target containment ("is `e.target` inside the
    // PopoverSurface's subtree?"). That check fails when Monaco escapes its
    // container for pointer events: a click visually below the popover lands
    // on Monaco's `.lines-content`, which IS a DOM descendant of the surface,
    // so Fluent keeps the popover open and Monaco scrolls as if the click
    // were interior. Detecting outside by bounding-rect coordinates instead
    // of DOM target routes around the issue entirely.
    useEffect(() => {
        if (!isOpen) return;
        const handleDocumentMouseDown = (event: MouseEvent) => {
            const surfaceEl = editorContainerRef.current?.closest(
                '.fui-PopoverSurface'
            );
            const rect = surfaceEl?.getBoundingClientRect();
            if (!rect) return;
            const insideSurface =
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom;
            if (insideSurface) return;
            // Click is visually outside the popover. If it landed on another
            // inspectable cell, let that cell's onClick retarget the
            // inspector instead of closing.
            const target = event.target;
            if (
                target instanceof Element &&
                target.closest(INSPECTABLE_CELL_SELECTOR)
            ) {
                return;
            }
            closeInspector();
        };
        document.addEventListener('mousedown', handleDocumentMouseDown, true);
        return () => {
            document.removeEventListener(
                'mousedown',
                handleDocumentMouseDown,
                true
            );
        };
    }, [isOpen, closeInspector]);

    return (
        <Popover
            open={isOpen}
            onOpenChange={handleOpenChange}
            withArrow
            trapFocus
            positioning={{ target: anchorRef?.current ?? null }}
        >
            <PopoverSurface
                className={classes.popoverSurface}
                onKeyDown={handleSurfaceKeyDown}
            >
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
                            language,
                            automaticLayout: true
                        })}
                        value={formattedValue}
                        onMount={handleEditorMount}
                    />
                </div>
            </PopoverSurface>
        </Popover>
    );
};
