import { loader } from '@monaco-editor/react';

import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { logDebug } from '@deneb-viz/utils/logging';
import {
    formatJsoncCompact,
    formatJsoncCompactRange
} from '@deneb-viz/utils/jsonc';
import { getProviderSchemaUrl } from '@deneb-viz/vega-runtime/embed';
import {
    resolveFieldDefaults,
    type SupportFieldFlags
} from '@deneb-viz/data-core/support-fields';
import {
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    FORMAT_FIELD_SUFFIX,
    FORMATTED_FIELD_SUFFIX,
    PARAMETER_NAMES_SUFFIX
} from '@deneb-viz/data-core/field';

import { monaco, setupMonacoWorker } from './monaco-integration';
import { getDenebState } from '../../state';
import { getFieldDocumentationByName } from '../../lib/dataset';
import { initializeSchemas, getProcessedSchema } from '../schema';

/**
 * Module-level initialization state.
 */
let editorReady = false;
let initPromise: Promise<void> | null = null;
let completionProviderDisposable: { dispose(): void } | null = null;
let formattingDisposables: { dispose(): void }[] = [];

/**
 * Configure Monaco JSON diagnostics with the pre-processed Vega/Vega-Lite
 * schemas. Enables schema-based validation and intellisense in the editor.
 */
const configureMonacoDiagnostics = () => {
    const enableSchemaRequest =
        toBoolean(process.env.ALLOW_EXTERNAL_URI) ?? false;
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        allowComments: true,
        enableSchemaRequest,
        schemas: [
            {
                schema: getProcessedSchema('vegaLite'),
                uri: getProviderSchemaUrl('vegaLite'),
                fileMatch: [
                    monaco.Uri.parse('deneb://Spec-vegaLite.json').toString()
                ]
            },
            {
                schema: getProcessedSchema('vega'),
                uri: getProviderSchemaUrl('vega'),
                fileMatch: [
                    monaco.Uri.parse('deneb://Spec-vega.json').toString()
                ]
            }
        ]
    });
};

/**
 * Register the dataset field completion provider for the Monaco editor.
 * Returns field names from the current dataset as completion suggestions
 * when editing spec JSON.
 */
const configureMonacoCompletionProvider = () => {
    // Dispose any previous registration before re-registering to prevent
    // stacking duplicate providers on retry.
    completionProviderDisposable?.dispose();
    completionProviderDisposable =
        monaco.languages.registerCompletionItemProvider('json', {
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
                    ([key]) => {
                        fields.push({
                            label: key,
                            insertText: key,
                            documentation: getFieldDocumentationByName(key),
                            kind: monaco.languages.CompletionItemKind.Field,
                            range,
                            sortText: `zzzzz__${key}`
                        });
                    }
                );
                // Support field companion suggestions — only for active (enabled) fields
                const {
                    project: {
                        supportFieldConfiguration: explicitConfig,
                        interactivity
                    },
                    i18n: { translate }
                } = getDenebState();
                const masterSettings = {
                    crossHighlightEnabled: interactivity?.highlight ?? false,
                    crossFilterEnabled: interactivity?.selection ?? false
                };
                const suffixMap: [keyof SupportFieldFlags, string, string][] = [
                    [
                        'highlight',
                        HIGHLIGHT_FIELD_SUFFIX,
                        translate('Completion_SupportField_Highlight')
                    ],
                    [
                        'highlightStatus',
                        HIGHLIGHT_STATUS_SUFFIX,
                        translate('Completion_SupportField_HighlightStatus')
                    ],
                    [
                        'highlightComparator',
                        HIGHLIGHT_COMPARATOR_SUFFIX,
                        translate('Completion_SupportField_HighlightComparator')
                    ],
                    [
                        'format',
                        FORMAT_FIELD_SUFFIX,
                        translate('Completion_SupportField_Format')
                    ],
                    [
                        'formatted',
                        FORMATTED_FIELD_SUFFIX,
                        translate('Completion_SupportField_Formatted')
                    ],
                    [
                        'names',
                        PARAMETER_NAMES_SUFFIX,
                        translate('Completion_SupportField_Names')
                    ]
                ];
                Object.entries(getDenebState().dataset.fields).forEach(
                    ([key, field]) => {
                        if (field?.isSupportField) return;
                        const flags =
                            explicitConfig?.[key] ??
                            resolveFieldDefaults({
                                masterSettings,
                                fieldRole: field?.role ?? 'grouping',
                                isLegacy: false
                            });
                        for (const [flagKey, suffix, doc] of suffixMap) {
                            if (flags[flagKey]) {
                                const name = `${key}${suffix}`;
                                fields.push({
                                    label: name,
                                    insertText: name,
                                    documentation: doc,
                                    kind: monaco.languages.CompletionItemKind
                                        .Property,
                                    range,
                                    sortText: `zzzzz__${key}${suffix}`
                                });
                            }
                        }
                    }
                );
                return {
                    suggestions: fields
                };
            }
        });
};

/**
 * Read formatting options at invocation time, so a change to the
 * `formattingMaxLineLength` property applies to the next format without
 * re-registering providers.
 */
const getFormattingOptions = (model: monaco.editor.ITextModel) => ({
    tabSize: model.getOptions().tabSize,
    maxLineLength:
        getDenebState().editorPreferences.jsonEditorFormattingMaxLineLength
});

/**
 * Replace the JSON worker's formatter (jsonc-parser `format`, which has no
 * line-length control) with Deneb's comment-preserving compact formatter.
 * Registers document and range providers and a Ctrl+Alt+R action that
 * formats the selection when there is one, otherwise the whole document.
 * Output line endings are normalized to the model's EOL.
 */
const configureMonacoFormatting = () => {
    // Dispose any previous registrations before re-registering to prevent
    // stacking duplicate providers on retry.
    formattingDisposables.forEach((disposable) => disposable.dispose());
    formattingDisposables = [];

    const { jsonDefaults } = monaco.languages.json;
    jsonDefaults.setModeConfiguration({
        ...jsonDefaults.modeConfiguration,
        documentFormattingEdits: false,
        documentRangeFormattingEdits: false
    });

    formattingDisposables.push(
        monaco.languages.registerDocumentFormattingEditProvider('json', {
            provideDocumentFormattingEdits: (model) => {
                const content = model.getValue();
                const formatted = formatJsoncCompact(
                    content,
                    getFormattingOptions(model)
                );
                if (formatted === content) {
                    // Invalid JSON is echoed back unchanged, and already-
                    // formatted LF documents match directly — no edits.
                    return [];
                }
                const text = formatted.replace(/\n/g, model.getEOL());
                if (text === content) {
                    // Valid, already formatted — just authored with CRLF.
                    return [];
                }
                return [{ range: model.getFullModelRange(), text }];
            }
        }),
        monaco.languages.registerDocumentRangeFormattingEditProvider('json', {
            provideDocumentRangeFormattingEdits: (model, range) => {
                const content = model.getValue();
                const offset = model.getOffsetAt(range.getStartPosition());
                const length =
                    model.getOffsetAt(range.getEndPosition()) - offset;
                const edit = formatJsoncCompactRange(
                    content,
                    { offset, length },
                    getFormattingOptions(model)
                );
                if (!edit) {
                    return [];
                }
                const text = edit.content.replace(/\n/g, model.getEOL());
                if (
                    content.slice(edit.offset, edit.offset + edit.length) ===
                    text
                ) {
                    return [];
                }
                return [
                    {
                        range: monaco.Range.fromPositions(
                            model.getPositionAt(edit.offset),
                            model.getPositionAt(edit.offset + edit.length)
                        ),
                        text
                    }
                ];
            }
        }),
        monaco.editor.addEditorAction({
            id: 'deneb.formatDocumentOrSelection',
            label: getDenebState().i18n.translate('Text_Editor_Action_Format'),
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR
            ],
            run: (editor) => {
                const selection = editor.getSelection();
                const actionId =
                    selection && !selection.isEmpty()
                        ? 'editor.action.formatSelection'
                        : 'editor.action.formatDocument';
                return editor.getAction(actionId)?.run();
            }
        })
    );
};

/**
 * Override default Monaco key bindings that clash with Deneb hotkeys and
 * add the quick command binding. Format is bound by the editor action in
 * `configureMonacoFormatting`.
 */
const configureMonacoKeyBindings = () => {
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
            keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.F1,
            command: 'editor.action.quickCommand'
        }
    ]);
};

/**
 * Wait for two animation frames so the browser has definitely committed
 * and painted the Suspense fallback before heavy synchronous work starts.
 *
 * A single setTimeout(0) is insufficient because React 19's concurrent
 * rendering may defer the Suspense commit past the next macrotask. Two
 * requestAnimationFrame callbacks guarantee at least one full paint cycle
 * has completed.
 */
const waitForPaint = () =>
    new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        } else {
            // Node/test environment — setTimeout is sufficient
            setTimeout(resolve, 0);
        }
    });

/**
 * Perform all editor initialization work:
 * 1. Yield to let the Suspense fallback paint
 * 2. Set up the Monaco worker environment
 * 3. Initialize schemas (async — heavy AJV compilation)
 * 4. Initialize Monaco loader (async)
 * 5. Configure Monaco diagnostics, completions, formatting, and keybindings
 */
const doInitialize = async (): Promise<void> => {
    // Ensure the Suspense fallback is visible before heavy work blocks
    await waitForPaint();

    // Worker environment must be set before Monaco initializes
    setupMonacoWorker();

    // Schema init and Monaco loader init are independent — run in parallel
    await Promise.all([initializeSchemas(), loader.init()]);

    logDebug('Monaco Editor initialized');

    // Configure Monaco with the now-ready schemas
    configureMonacoDiagnostics();
    configureMonacoCompletionProvider();
    configureMonacoFormatting();
    configureMonacoKeyBindings();

    editorReady = true;
};

/**
 * Initialize all editor dependencies asynchronously. Combines schema
 * compilation and Monaco editor setup into a single awaitable operation
 * that gates the editor UI behind a Suspense boundary.
 *
 * Idempotent — safe to call multiple times. Returns the shared in-flight
 * promise while initialization is running; resolves immediately once complete.
 */
export const initializeEditorDependencies = (): Promise<void> => {
    if (editorReady) return Promise.resolve();
    if (initPromise) return initPromise;
    initPromise = doInitialize().catch((error) => {
        // Reset so callers can retry after a transient failure.
        // Without this a single rejection permanently poisons initPromise.
        initPromise = null;
        throw error;
    });
    return initPromise;
};

/**
 * Whether editor dependencies have been initialized.
 */
export const isEditorReady = (): boolean => editorReady;
