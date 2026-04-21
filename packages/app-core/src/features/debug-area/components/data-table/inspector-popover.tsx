import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
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
    getInspectorLanguage,
    isDismissTargetInspectableCell,
    isPointerDismissEvent
} from './inspector-popover-utils';

const useInspectorPopoverStyles = makeStyles({
    popoverSurface: {
        zIndex: POPOVER_Z_INDEX
    },
    editorContainer: {
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        overflow: 'hidden',
        position: 'relative',
        // `contain: strict` constrains hit-testing to this box. Without it
        // Monaco's compositor-layer scroll/line elements remain hit-testable
        // outside the visible container, swallowing clicks that are visually
        // below the popover.
        contain: 'strict'
    }
});

export interface InspectorPopoverProps {
    /**
     * Element whose scroll events dismiss the inspector. Typically the
     * `DataTableViewer` enclosure, so that scrolls in a sibling viewer (e.g.
     * the dataset viewer while the signals viewer has an open inspector) do
     * not cross-dismiss. Listeners attach in capture phase, so scrolls from
     * any descendant — including react-data-table's internal responsive
     * wrapper — are caught.
     */
    scrollContainerRef: RefObject<HTMLElement | null>;
}

/**
 * Single shared popover hosted at the `DataTableViewer` level. Reads its state
 * from `DataTableInspectorProvider` and re-anchors to whichever cell most
 * recently called `openInspector`. Only one instance should be mounted per
 * `DataTableViewer` — this guarantees at most one inspector is visible at a
 * time, and eliminates per-cell popover state duplication.
 */
export const InspectorPopover = ({
    scrollContainerRef
}: InspectorPopoverProps) => {
    const classes = useInspectorPopoverStyles();
    const { fontSize, theme } = useDenebState((state) => ({
        fontSize: state.editorPreferences.jsonEditorFontSize,
        theme: state.editorPreferences.theme
    }));
    const inspector = useDataTableInspector();
    if (!inspector) {
        // InspectorPopover is only valid inside DataTableInspectorProvider.
        // Fail here rather than downstream with a less actionable error.
        throw new Error(
            'InspectorPopover must be mounted inside DataTableInspectorProvider'
        );
    }
    const { isOpen, anchorRef, cellId, rawValue, valueType, closeInspector } =
        inspector;
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

    // Dismiss popover on scrolls inside the containing viewer, but ignore
    // scrolling within the popover's Monaco editor itself. Scoping the
    // listener to the viewer's enclosure (instead of `window`) means a
    // scroll inside a sibling viewer — e.g. the dataset viewer while the
    // signals viewer has an open inspector — no longer cross-dismisses.
    useEffect(() => {
        if (!isOpen) return;
        const container = scrollContainerRef.current;
        if (!container) return;
        const dismiss = (e: Event) => {
            if (editorContainerRef.current?.contains(e.target as Node)) return;
            closeInspector();
        };
        container.addEventListener('scroll', dismiss, true);
        return () => container.removeEventListener('scroll', dismiss, true);
    }, [isOpen, closeInspector, scrollContainerRef]);

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

    // Handle Fluent's close-intent events. Skip the close if the dismiss
    // target is another inspectable cell so that cell's own click handler
    // can retarget the popover without us stomping it. Also skip when the
    // inspector is already closed — the coordinate-based mousedown handler
    // below may have fired first for the same gesture.
    const handleOpenChange = useCallback(
        (event: OpenPopoverEvents, data: OnOpenChangeData) => {
            if (data.open) return;
            if (!isOpen) return;
            // Retarget-suppression only applies to pointer dismissals.
            // Keyboard (Escape) and focus-out (Tab) dismissals should
            // always close, even when Tab lands focus on another
            // inspectable cell — the user's intent is to leave, not to
            // retarget.
            if (
                isPointerDismissEvent(event) &&
                isDismissTargetInspectableCell(event.target)
            ) {
                return;
            }
            closeInspector();
        },
        [isOpen, closeInspector]
    );

    // Coordinate-rect outside-click dismissal. Fluent's light dismiss and
    // `elementFromPoint` both rely on the click target, which fails for
    // Monaco: its compositor layers (`transform: translate3d`) extend the
    // hit-testable area visually below the container, so a click under the
    // popover returns Monaco's `.lines-content` — a DOM descendant of the
    // PopoverSurface — and registers as "inside". Compare the click's
    // `clientX`/`clientY` to the PopoverSurface's bounding rect directly,
    // which ignores DOM/hit-testing and treats anything visually outside
    // the rectangle as outside.
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
            if (isDismissTargetInspectableCell(event.target)) return;
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
    // "Back to report"), but let it propagate up to the PopoverSurface so
    // Fluent's own Escape handler can dismiss the popover. Scoped to the
    // PopoverSurface node because a listener on the editor container would
    // fire before Fluent's handler bubble-wise and swallow the dismiss.
    const handleSurfaceKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape') event.stopPropagation();
        },
        []
    );

    return (
        <Popover
            open={isOpen}
            onOpenChange={handleOpenChange}
            withArrow
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
