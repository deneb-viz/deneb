import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { makeStyles, useUncontrolledFocus } from '@fluentui/react-components';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';

import { logDebug } from '@deneb-viz/utils/logging';
import { handlePersistSpecification, type EditorPaneRole } from '../../../lib';
import { monaco } from '../../../components/code-editor/monaco-integration';
import { buildEditorProps } from '../../../components/code-editor/editor-configuration';
import { getDenebState, useDenebState } from '../../../state';
import { useSpecificationEditor } from '../hooks/use-specification-editor';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useCursorContext } from '../../../context';

type JsonEditorProps = {
    thisEditorRole: EditorPaneRole;
};

const useSpecificationJsonEditorStyles = makeStyles({
    container: {
        flex: '1 1 0',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    editor: {
        flex: '1 1 auto',
        overflow: 'hidden'
    }
});

/**
 * Represents an instance of Ace editor, responsible for maintaining either the JSON spec or the config for a Vega/
 * Vega-Lite visualization.
 */
//eslint-disable-next-line max-lines-per-function
export const SpecificationJsonEditor = ({
    thisEditorRole
}: JsonEditorProps) => {
    const {
        applyMode,
        current,
        debouncePeriod,
        fontSize,
        provider,
        showLineNumbers,
        theme,
        viewStateConfig,
        viewStateSpec,
        wordWrap,
        setViewState,
        updateChanges
    } = useDenebState((state) => ({
        applyMode: state.editor.applyMode,
        current: state.editorSelectedOperation,
        debouncePeriod: state.editorPreferences.jsonEditorDebouncePeriod,
        fontSize: state.editorPreferences.jsonEditorFontSize,
        provider: state.project.provider,
        showLineNumbers: state.editorPreferences.jsonEditorShowLineNumbers,
        theme: state.editorPreferences.theme,
        viewStateConfig: state.editor.viewStateConfig,
        viewStateSpec: state.editor.viewStateSpec,
        wordWrap: state.editorPreferences.jsonEditorWordWrap,
        setViewState: state.editor.setViewState,
        updateChanges: state.editor.updateChanges
    }));
    const { launchUrl } = useDenebPlatformProvider();
    const attr = useUncontrolledFocus();
    const classes = useSpecificationJsonEditorStyles();
    const isActiveEditor = useMemo(
        () => current === thisEditorRole,
        [current, thisEditorRole]
    );
    const display = useMemo(
        () => (isActiveEditor ? 'flex' : 'none'),
        [isActiveEditor]
    );
    const { spec, config } = useSpecificationEditor();
    const ref = thisEditorRole === 'Spec' ? spec : config;
    const viewState =
        thisEditorRole === 'Spec' ? viewStateSpec : viewStateConfig;
    const [editorText, setEditorText] = useState(ref?.current?.getValue());
    const debouncedEditorText = useDebounce(editorText, debouncePeriod);
    const isFirstDebounce = useRef(true);
    const { setCursor } = useCursorContext();
    const handleFocus = () => isActiveEditor && ref?.current?.focus();
    // Ensure that we update key dependencies/events if we change the editor.
    useEffect(() => {
        handleFocus();
        addHyperlinkOverride(ref.current, launchUrl);
    }, [provider, current]);
    // Bootstrap the editor
    const handleOnMount: OnMount = (editor) => {
        ref.current = editor;
        if (viewState) {
            editor.restoreViewState(viewState);
        }
        // Handle view state changes for folding
        editor.onDidChangeHiddenAreas(() => {
            setViewState(ref.current?.saveViewState());
        });
        // Tracking of cursor position for status bar (via context)
        editor.onDidChangeCursorPosition(
            (e: monaco.editor.ICursorPositionChangedEvent) => {
                const range = editor.getSelection();
                const selectedText =
                    (range && editor.getModel()?.getValueInRange(range)) || '';
                setCursor({
                    lineNumber: e.position.lineNumber,
                    column: e.position.column,
                    selectedText
                });
            }
        );
        // Process context menu
        editor.onContextMenu(() => removeContextMenuItems(editor));
        addHyperlinkOverride(editor, launchUrl);
        handleFocus();
    };
    // Handle change events within editor
    const handleOnChange = useCallback<OnChange>((value) => {
        setEditorText(() => value);
    }, []);

    useEffect(() => {
        if (isFirstDebounce.current) {
            isFirstDebounce.current = false;
            return;
        }
        if (debouncedEditorText === undefined) return;
        logDebug('onChangeEditor');
        logDebug('Staging editor value', thisEditorRole);
        updateChanges({
            role: thisEditorRole,
            text: debouncedEditorText,
            viewState: ref.current?.saveViewState()
        });
        if (applyMode === 'Auto') {
            logDebug('Auto-apply changes');
            handlePersistSpecification(spec.current, config.current);
        }
    }, [
        applyMode,
        config,
        debouncedEditorText,
        ref,
        spec,
        thisEditorRole,
        updateChanges
    ]);
    return (
        <div style={{ display }} className={classes.container} {...attr}>
            <div className={classes.editor}>
                <Editor
                    {...buildEditorProps({
                        theme,
                        fontSize,
                        wordWrap,
                        showLineNumbers,
                        quickSuggestions: true,
                        fixedOverflowWidgets: true
                    })}
                    key={`${thisEditorRole}-${provider}`}
                    onMount={handleOnMount}
                    onChange={handleOnChange}
                    path={`deneb://${thisEditorRole}-${provider}.json`}
                    defaultValue={getDefaultValue(thisEditorRole)}
                />
            </div>
        </div>
    );
};

/**
 * Intercept click events on markdown tooltips and delegate to the host.
 */
const addHyperlinkOverride = (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    launchUrl: (url: string) => void
) => {
    editor?.getDomNode()?.removeEventListener('click', onLinkClick(launchUrl));
    editor?.getDomNode()?.addEventListener('click', onLinkClick(launchUrl));
};

/**
 * Resolve the default value when instantiated, either from settings or staging as needed.
 */
const getDefaultValue = (role: EditorPaneRole) => {
    const {
        editor: { stagedConfig, stagedSpec },
        project: { spec, config }
    } = getDenebState();
    switch (role) {
        case 'Spec':
            return stagedSpec ?? spec;
        case 'Config':
            return stagedConfig ?? config;
    }
};

/**
 * A very simple override of clicking link elements in the editor, to allow delegation of hyperlink handling to the
 * host.
 */
const onLinkClick = (launchUrl: (url: string) => void) => (e: MouseEvent) => {
    const url = (e.target as HTMLElement)
        .closest('a')
        ?.getAttribute('data-href');
    if (url && url.match(/^(http|https):\/\//)) {
        e.preventDefault();
        e.stopPropagation();
        launchUrl(url);
    }
};

/**
 * Because the Power BI visual sandbox disables the clipboard API, the standard Monaco context menu items for copy,
 * cut and paste just throw errors. This function removes them from the context menu.
 * @privateRemarks
 * As Monaco doesn't have an API for this, it's a bit of a hack.
 * This has been taken from https://github.com/microsoft/monaco-editor/issues/1567
 */
const removeContextMenuItems = (
    editor: monaco.editor.IStandaloneCodeEditor
) => {
    const contextmenu = editor.getContribution('editor.contrib.contextmenu');
    const removableIds = [
        'editor.action.clipboardCutAction',
        'editor.action.clipboardPasteAction'
    ];
    const realMethod = (contextmenu as any)._getMenuActions;
    (contextmenu as any)._getMenuActions = (...args: any[]) => {
        const items = realMethod.apply(contextmenu, args);
        return items.filter((item: any) => {
            return !removableIds.includes(item.id);
        });
    };
};
