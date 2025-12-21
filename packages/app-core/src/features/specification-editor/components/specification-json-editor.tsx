import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { makeStyles, useUncontrolledFocus } from '@fluentui/react-components';
import Editor, { loader, OnChange, OnMount } from '@monaco-editor/react';

import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { ptToPx } from '@deneb-viz/utils/dom';
import { getProviderSchema } from '@deneb-viz/json-processing';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { logDebug } from '@deneb-viz/utils/logging';
import {
    handlePersistSpecification,
    PREVIEW_PANE_TOOLBAR_BUTTON_PADDING,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    type EditorPaneRole
} from '../../../lib';
import {
    monaco,
    setupMonacoWorker
} from '../../../components/code-editor/monaco-integration';
import { getDenebState, useDenebState } from '../../../state';
import { useSpecificationEditor } from '../hooks/use-specification-editor';
import { SpecificationEditorStatusBar } from './specification-editor-status-bar';
import { updateFieldTracking } from '../../../lib/field-processing';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { DatasetField } from '@deneb-viz/data-core/field';

/**
 * Initialize Monaco editor on first mount. This is deferred from module load time to only run when the editor is
 * actually needed (Editor mode).
 */
let monacoInitialized = false;
const initializeMonaco = () => {
    if (monacoInitialized) return;
    monacoInitialized = true;
    loader.init().then(() => {
        logDebug('Monaco Editor initialized');
        setMonacoCompletionProvider();
        setMonacoDiagnosticsOptions();
        setMonacoKeyBindingRules();
    });
};

type JsonEditorProps = {
    thisEditorRole: EditorPaneRole;
};

/**
 * Handles everything we need to manage for the status bar.
 */
type JsonEditorStatusState = {
    cursor: monaco.Position;
    role: EditorPaneRole;
    selectedText: string;
};

const useSpecificationJsonEditorStyles = makeStyles({
    container: {
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        width: '100%',
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
        debouncePeriod: state.visualSettings.editor.json.debouncePeriod.value,
        fontSize: state.visualSettings.editor.json.fontSize.value,
        provider: state.project.provider as SpecProvider,
        showLineNumbers: state.visualSettings.editor.json.showLineNumbers.value,
        theme: state.visualSettings.editor.interface.theme.value,
        viewStateConfig: state.editor.viewStateConfig,
        viewStateSpec: state.editor.viewStateSpec,
        wordWrap: state.visualSettings.editor.json.wordWrap.value,
        setViewState: state.editor.setViewState,
        updateChanges: state.editor.updateChanges
    }));
    const { launchUrl } = useDenebPlatformProvider();
    // Override default Monaco worker lookup to use bundled worker
    useEffect(() => {
        setupMonacoWorker();
    }, []);
    // Initialize Monaco editor on first mount (deferred from module load)
    useEffect(() => {
        initializeMonaco();
    }, []);
    const attr = useUncontrolledFocus();
    const classes = useSpecificationJsonEditorStyles();
    const editorHeight = useMemo(
        () =>
            `calc(100% - ${
                PREVIEW_PANE_TOOLBAR_MIN_SIZE +
                PREVIEW_PANE_TOOLBAR_BUTTON_PADDING
            }px)`,
        []
    );
    const isActiveEditor = useMemo(() => current === thisEditorRole, [current]);
    const display = useMemo(
        () => (isActiveEditor ? 'inline' : 'none'),
        [isActiveEditor]
    );
    const { spec, config } = useSpecificationEditor();
    const ref = thisEditorRole === 'Spec' ? spec : config;
    const viewState =
        thisEditorRole === 'Spec' ? viewStateSpec : viewStateConfig;
    const [editorText, setEditorText] = useState(ref?.current?.getValue());
    const debouncedEditorText = useDebounce(editorText, debouncePeriod);
    const isFirstDebounce = useRef(true);
    const [status, setStatus] = useState<JsonEditorStatusState>({
        cursor: {
            lineNumber: viewState?.cursorState?.[0]?.position?.lineNumber ?? 1,
            column: viewState?.cursorState?.[0]?.position?.column ?? 1
        } as monaco.Position,
        role: thisEditorRole,
        selectedText: ''
    });
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
        // Tracking of cursor position for status bar
        editor.onDidChangeCursorPosition((e) => {
            const range = editor.getSelection();
            setStatus({
                ...status,
                cursor: e.position,
                selectedText:
                    (range && editor.getModel()?.getValueInRange(range)) || ''
            });
        });
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
        // Tracking is now only used for export (#486)
        // updateTracking(debouncedEditorText, thisEditorRole);
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
            <Editor
                onMount={handleOnMount}
                onChange={handleOnChange}
                width='100%'
                height={editorHeight}
                defaultLanguage='json'
                path={`deneb://${thisEditorRole}-${provider}.json`}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                defaultValue={getDefaultValue(thisEditorRole)}
                options={{
                    cursorBlinking: 'smooth',
                    fixedOverflowWidgets: true,
                    folding: true,
                    fontSize: ptToPx(fontSize),
                    lineNumbers: showLineNumbers ? 'on' : 'off',
                    lineNumbersMinChars: 2,
                    minimap: { enabled: false },
                    quickSuggestions: true,
                    scrollBeyondLastLine: false,
                    tabSize: DEFAULTS.editor.tabSize,
                    wordWrap: wordWrap ? 'on' : 'off'
                }}
            />
            <SpecificationEditorStatusBar
                position={status.cursor}
                selectedText={status.selectedText}
            />
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
        visualSettings
    } = getDenebState();
    switch (role) {
        case 'Spec':
            return stagedSpec ?? visualSettings.vega.output.jsonSpec.value;
        case 'Config':
            return stagedConfig ?? visualSettings.vega.output.jsonConfig.value;
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

/**
 * Set up the completion item provider for the Monaco editor. This will return fields from the dataset as snippets
 * in the completion list, in addition to the Vega completers. This returns the disposable completion provider, so that
 * it can be cleaned up when the component is unmounted.
 * @privateRemarks
 * If we want to call this more than once per editor setup, it will need to be disposed of, otherwise we'll end up
 * with multiple entries for each list.
 */
const setMonacoCompletionProvider = () => {
    return monaco.languages.registerCompletionItemProvider('json', {
        provideCompletionItems: async (model, position) => {
            const { editorSelectedOperation } = getDenebState();
            if (editorSelectedOperation !== 'Spec') {
                return null;
            }
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };
            const fields: monaco.languages.CompletionItem[] = [];
            Object.entries(getDenebState().dataset.fields).forEach(
                ([key, field]) => {
                    fields.push({
                        label: key,
                        insertText: key,
                        detail: getSnippetFieldMetadata(field),
                        kind: monaco.languages.CompletionItemKind.Field,
                        range,
                        sortText: `zzzzz__${key}`
                    });
                }
            );
            return {
                suggestions: fields
            };
        }
    });
};

/**
 * Set up the diagnostics options for the Monaco editor. This will allow us to provide schema-based validation for the
 * JSON editor.
 */
const setMonacoDiagnosticsOptions = () => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        allowComments: true,
        enableSchemaRequest: false,
        schemas: [
            {
                schema: getProviderSchema({ provider: 'vegaLite' }),
                uri: 'https://vega.github.io/schema/vega-lite/v5.json',
                fileMatch: [
                    monaco.Uri.parse('deneb://Spec-vegaLite.json').toString()
                ]
            },
            {
                schema: getProviderSchema({ provider: 'vega' }),
                uri: 'https://vega.github.io/schema/vega/v5.json',
                fileMatch: [
                    monaco.Uri.parse('deneb://Spec-vega.json').toString()
                ]
            }
        ]
    });
};

/**
 * Override the default key bindings for the Monaco editor that will clash with the Deneb hotkeys.
 */
const setMonacoKeyBindingRules = () => {
    monaco.editor.addKeybindingRules([
        {
            keybinding:
                monaco.KeyMod.CtrlCmd |
                monaco.KeyMod.Shift |
                monaco.KeyCode.Enter,
            command: null
        },
        {
            keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            command: null
        },
        {
            keybinding:
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR,
            command: 'editor.action.formatDocument'
        },
        {
            keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.F1,
            command: 'editor.action.quickCommand'
        }
    ]);
};

/**
 * For any data-based completers in the editor, provide a qualifier denoting whether it's a column, measure or
 * something else.
 */
const getSnippetFieldMetadata = (field: DatasetField) => {
    const { translate } = getDenebState().i18n;
    switch (true) {
        case field.isHighlightComponent:
            return translate('Text_AutoComplete_Meta_Highlight');
        case field.isMeasure:
            return translate('Text_AutoComplete_Meta_Measure');
        case field.isColumn:
            return translate('Text_AutoComplete_Meta_Column');
        default:
            return '';
    }
};

/**
 * Do the necessary tests and then call the tracking /tokenization workers, if needed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateTracking = async (spec: string, editorRole: EditorPaneRole) => {
    logDebug(
        '[Spec Editor] Checking to see if tracking and tokenization is needed...'
    );
    const {
        fieldUsage: { dataset: trackedFieldsCurrent, editorShouldSkipRemap },
        visualSettings: {
            vega: {
                output: {
                    jsonSpec: { value: jsonSpec }
                }
            }
        }
    } = getDenebState();
    if (
        editorRole === 'Config' ||
        (editorRole === 'Spec' && (spec === jsonSpec || editorShouldSkipRemap))
    ) {
        logDebug(
            "[Spec Editor] Spec hasn't changed, skipping tracking and tokens..."
        );
        return;
    }
    logDebug('[Spec Editor] Updating tracking and tokens...');
    updateFieldTracking(spec, trackedFieldsCurrent);
};
