import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import debounce from 'lodash/debounce';
import { useUncontrolledFocus } from '@fluentui/react-components';
import Editor, { loader, OnChange, OnMount } from '@monaco-editor/react';

import store, { getState } from '../../../store';
import { logDebug } from '../../logging';
import { useJsonEditorContext } from './json-editor-context-provider';
import { PREVIEW_PANE_TOOLBAR_BUTTON_PADDING } from '../../../constants';
import { useInterfaceStyles } from '../../interface';
import { JsonEditorStatusBar } from './json-editor-status-bar';
import { persistSpecification } from '../../specification';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { updateFieldTracking } from '../../json-processing';

import {
    type EditorPaneRole,
    monaco,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    setupMonacoWorker
} from '@deneb-viz/app-core';
import { ptToPx } from '@deneb-viz/utils/dom';
import { getProviderSchema } from '@deneb-viz/json-processing';
import { IVisualDatasetField } from '../../../core/data';
import { getI18nValue } from '../../i18n';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { launchUrl } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * One-time Monaco initialization tasks.
 */
loader.init().then(() => {
    setMonacoCompletionProvider();
    setMonacoDiagnosticsOptions();
    setMonacoKeyBindingRules();
});

interface IJsonEditorProps {
    thisEditorRole: EditorPaneRole;
}

/**
 * Handles everything we need to manage for the status bar.
 */
interface IJsonEditorStatusState {
    cursor: monaco.Position;
    role: EditorPaneRole;
    selectedText: string;
}

/**
 * Represents an instance of Ace editor, responsible for maintaining either
 * the JSON spec or the config for a Vega/Vega-Lite visualization.
 */
//eslint-disable-next-line max-lines-per-function
export const JsonEditor: React.FC<IJsonEditorProps> = ({ thisEditorRole }) => {
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
    } = store(
        (state) => ({
            applyMode: state.editor.applyMode,
            current: state.editorSelectedOperation,
            debouncePeriod:
                state.visualSettings.editor.json.debouncePeriod.value,
            fontSize: state.visualSettings.editor.json.fontSize.value,
            provider: state.visualSettings.vega.output.provider
                .value as SpecProvider,
            showLineNumbers:
                state.visualSettings.editor.json.showLineNumbers.value,
            theme: state.visualSettings.editor.interface.theme.value,
            viewStateConfig: state.editor.viewStateConfig,
            viewStateSpec: state.editor.viewStateSpec,
            wordWrap: state.visualSettings.editor.json.wordWrap.value,
            setViewState: state.editor.setViewState,
            updateChanges: state.editor.updateChanges
        }),
        shallow
    );
    // Override default Monaco worker lookup to use bundled worker
    useEffect(() => {
        setupMonacoWorker();
    }, []);
    const attr = useUncontrolledFocus();
    const classes = useInterfaceStyles();
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
    const { spec, config } = useJsonEditorContext();
    const ref = thisEditorRole === 'Spec' ? spec : config;
    const viewState =
        thisEditorRole === 'Spec' ? viewStateSpec : viewStateConfig;
    const [editorText, setEditorText] = useState(ref?.current?.getValue());
    const [status, setStatus] = useState<IJsonEditorStatusState>({
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
        addHyperlinkOverride(ref.current);
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
            setStatus({
                ...status,
                cursor: e.position,
                selectedText:
                    editor.getModel()?.getValueInRange(editor.getSelection()) ||
                    ''
            });
        });
        // Process context menu
        editor.onContextMenu(() => removeContextMenuItems(editor));
        addHyperlinkOverride(editor);
        handleFocus();
    };
    // Handle change events within editor
    const handleOnChange = useCallback<OnChange>(
        debounce((value) => {
            logDebug('onChangeEditor');
            setEditorText(() => value);
            logDebug('Staging editor value', thisEditorRole);
            updateChanges({
                role: thisEditorRole,
                text: value,
                viewState: ref.current?.saveViewState()
            });
            // Tracking is now only used for export (#486)
            // updateTracking(value, thisEditorRole);
            if (applyMode === 'Auto') {
                logDebug('Auto-apply changes');
                persistSpecification(spec.current, config.current);
            }
        }, debouncePeriod),
        [editorText, applyMode]
    );
    return (
        <div style={{ display }} className={classes.editorContainer} {...attr}>
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
            <JsonEditorStatusBar
                position={status.cursor}
                selectedText={status.selectedText}
            />
        </div>
    );
};

/**
 * Intercept click events on markdown tooltips and delegate to the host.
 */
const addHyperlinkOverride = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editor?.getDomNode()?.removeEventListener('click', onLinkClick);
    editor?.getDomNode()?.addEventListener('click', onLinkClick);
};

/**
 * Resolve the default value when instantiated, either from settings or staging
 * as needed.
 */
const getDefaultValue = (role: EditorPaneRole) => {
    const {
        editor: { stagedConfig, stagedSpec },
        visualSettings
    } = getState();
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
const onLinkClick = (e: MouseEvent) => {
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
 * Because the Power BI vidsual sandbox disables the clipboard API, the standard Monaco context menu items for copy,
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
            const { editorSelectedOperation } = getState();
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
            let fields: monaco.languages.CompletionItem[] = [];
            Object.entries(getState().dataset.fields).forEach(
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
 * For any data-based completers in the editor, provide a qualifier denoting
 * whether it's a column, measure or something else.
 */
const getSnippetFieldMetadata = (field: IVisualDatasetField) => {
    switch (true) {
        case field.isHighlightComponent:
            return getI18nValue('Text_AutoComplete_Meta_Highlight');
        case field.isMeasure:
            return getI18nValue('Text_AutoComplete_Meta_Measure');
        case field.isColumn:
            return getI18nValue('Text_AutoComplete_Meta_Column');
        default:
            return '';
    }
};

/**
 * Do the necessary tests and then call the tracking /tokenization workers, if needed.
 */
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
    } = getState();
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
