import { loader } from '@monaco-editor/react';

import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { logDebug } from '@deneb-viz/utils/logging';
import { getProviderSchemaUrl } from '@deneb-viz/vega-runtime/embed';

import {
    monaco,
    setupMonacoWorker
} from '../../components/code-editor/monaco-integration';
import { getDenebState } from '../../state';
import { getFieldDocumentationByName } from '../../lib/dataset';
import { initializeSchemas, getProcessedSchema } from '../schema';

/**
 * Module-level initialization state.
 */
let editorReady = false;
let initPromise: Promise<void> | null = null;
let completionProviderDisposable: { dispose(): void } | null = null;

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
    completionProviderDisposable = monaco.languages.registerCompletionItemProvider('json', {
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
            Object.entries(getDenebState().dataset.fields).forEach(([key]) => {
                fields.push({
                    label: key,
                    insertText: key,
                    documentation: getFieldDocumentationByName(key),
                    kind: monaco.languages.CompletionItemKind.Field,
                    range,
                    sortText: `zzzzz__${key}`
                });
            });
            return {
                suggestions: fields
            };
        }
    });
};

/**
 * Override default Monaco key bindings that clash with Deneb hotkeys and
 * add custom bindings for format and quick command.
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
            keybinding:
                monaco.KeyMod.CtrlCmd |
                monaco.KeyMod.Alt |
                monaco.KeyCode.KeyR,
            command: 'editor.action.formatDocument'
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
 * 5. Configure Monaco diagnostics, completions, and keybindings
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
