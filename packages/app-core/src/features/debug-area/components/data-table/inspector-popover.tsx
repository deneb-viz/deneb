import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    makeStyles,
    Popover,
    PopoverSurface,
    tokens,
    type OnOpenChangeData,
    type OpenPopoverEvents
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

    // Focus Monaco as soon as it mounts so keyboard users can scroll, select,
    // and copy without a second Tab press. Popover no longer sets `trapFocus`
    // — with `trapFocus` Fluent would focus the empty PopoverSurface on open
    // (Monaco isn't mounted yet) and then Monaco would steal focus here,
    // producing a double focus event and duplicate screen-reader
    // announcements. `bindTabCycling`'s `FOCUS_YIELD_SELECTOR` already yields
    // Tab to the `.fui-PopoverSurface`, so there is no host-side Tab leak to
    // mitigate with `trapFocus`.
    const handleEditorMount = useCallback<OnMount>((editor) => {
        editorRef.current = editor;
        editor.focus();
    }, []);

    // When the popover retargets from one cell to another without closing
    // (single-inspector coordination), the Editor's props change but it does
    // not remount — `onMount` will not fire again. The user's click landed on
    // the new cell div, so focus is now there rather than in Monaco. Re-focus
    // the editor so the inspector behaves consistently on retarget.
    //
    // `wasOpenRef` suppresses this on the first render where `isOpen` flips
    // true — on initial open `handleEditorMount` already focuses Monaco once
    // mounted, and firing here would either double-focus or focus a stale
    // editor instance before Monaco finishes constructing.
    const wasOpenRef = useRef(false);
    useEffect(() => {
        if (!isOpen) {
            wasOpenRef.current = false;
            return;
        }
        if (!wasOpenRef.current) {
            wasOpenRef.current = true;
            return;
        }
        editorRef.current?.focus();
    }, [isOpen, cellId]);

    // Handle Fluent's close-intent events. Fluent fires onOpenChange(false)
    // on both Escape and outside-click dismissal. For outside clicks that
    // land on another inspectable cell, the cell's own onClick has already
    // dispatched `openInspector` for the new target — treating the dismiss
    // as a close would stomp that retarget and leave the popover closed.
    // Ignore the dismiss in that case so the retarget wins; otherwise
    // proceed with the usual close behaviour. Bail out early when the
    // inspector is already closed — the coordinate-based mousedown handler
    // may have closed it before Fluent's own onOpenChange fires for the same
    // gesture, and a redundant close-when-already-closed would re-queue the
    // focus-restore work in `closeInspector`.
    const handleOpenChange = useCallback(
        (event: OpenPopoverEvents, data: OnOpenChangeData) => {
            if (data.open) return;
            if (!isOpen) return;
            const target = event.target;
            if (
                target instanceof Element &&
                target.isConnected &&
                target.closest(INSPECTABLE_CELL_SELECTOR)
            ) {
                return;
            }
            closeInspector();
        },
        [isOpen, closeInspector]
    );

    // Coordinate-based outside-click dismissal. Fluent's built-in light
    // dismiss relies on DOM-target containment ("is `e.target` inside the
    // PopoverSurface's subtree?"). That check fails when Monaco escapes its
    // container for pointer events: a click visually below the popover lands
    // on Monaco's `.lines-content`, which IS a DOM descendant of the surface,
    // so Fluent keeps the popover open and Monaco scrolls as if the click
    // were interior. `document.elementFromPoint` uses visual hit testing
    // (which `contain: strict` on the editor container correctly constrains)
    // and respects CSS zoom — Power BI scales the visual iframe, and a
    // `getBoundingClientRect`-vs-`clientX/Y` comparison would drift because
    // the rect is zoom-scaled while the client coordinates are not.
    useEffect(() => {
        if (!isOpen) return;
        const handleDocumentMouseDown = (event: MouseEvent) => {
            const surfaceEl = editorContainerRef.current?.closest(
                '.fui-PopoverSurface'
            );
            if (!surfaceEl) return;
            const hit = document.elementFromPoint(event.clientX, event.clientY);
            if (hit instanceof Element && surfaceEl.contains(hit)) return;
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

    // Stop Escape from reaching the Power BI host (which shifts focus to
    // "Back to report"). Previously this was a React-synthetic onKeyDown on
    // `PopoverSurface`, but React 17+ delegates synthetic events at the root
    // — if Monaco's own native listeners on descendant elements call
    // `stopPropagation` for Escape (e.g., closing the find widget), the
    // synthetic handler at the root never fires. A native bubble-phase
    // listener scoped to `editorContainer` always runs for Escape keys that
    // make it past Monaco, catching them before they reach the host without
    // interfering with Monaco's internal Escape handling.
    useEffect(() => {
        if (!isOpen) return;
        const container = editorContainerRef.current;
        if (!container) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') event.stopPropagation();
        };
        container.addEventListener('keydown', onKeyDown);
        return () => container.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    return (
        <Popover
            open={isOpen}
            onOpenChange={handleOpenChange}
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
