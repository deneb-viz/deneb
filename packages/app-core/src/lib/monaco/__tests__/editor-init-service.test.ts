import { describe, expect, it, vi } from 'vitest';

/**
 * Editor init service tests. These verify the orchestration requirements:
 * - Editor dependencies initialize without error
 * - Monaco diagnostics are configured with schemas after init
 * - Monaco completion provider, formatting providers, and key bindings are
 *   registered
 * - Initialization is idempotent
 */

// Mock Monaco integration
const mockSetDiagnosticsOptions = vi.fn();
const mockSetModeConfiguration = vi.fn();
const mockDisposeCompletionProvider = vi.fn();
const mockRegisterCompletionItemProvider = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeCompletionProvider });
const mockDisposeFormattingProvider = vi.fn();
const mockRegisterDocumentFormattingEditProvider = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeFormattingProvider });
const mockRegisterDocumentRangeFormattingEditProvider = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeFormattingProvider });
const mockAddEditorAction = vi
    .fn()
    .mockReturnValue({ dispose: mockDisposeFormattingProvider });
const mockAddKeybindingRules = vi.fn();
const mockSetupMonacoWorker = vi.fn();

vi.mock('../monaco-integration', () => ({
    monaco: {
        languages: {
            json: {
                jsonDefaults: {
                    setDiagnosticsOptions: mockSetDiagnosticsOptions,
                    modeConfiguration: { diagnostics: true, hovers: true },
                    setModeConfiguration: mockSetModeConfiguration
                }
            },
            registerCompletionItemProvider: mockRegisterCompletionItemProvider,
            registerDocumentFormattingEditProvider:
                mockRegisterDocumentFormattingEditProvider,
            registerDocumentRangeFormattingEditProvider:
                mockRegisterDocumentRangeFormattingEditProvider,
            CompletionItemKind: { Field: 5, Property: 9 }
        },
        editor: {
            addKeybindingRules: mockAddKeybindingRules,
            addEditorAction: mockAddEditorAction
        },
        Range: {
            fromPositions: (start: unknown, end: unknown) => ({ start, end })
        },
        Uri: {
            parse: (uri: string) => ({ toString: () => uri })
        },
        KeyMod: { CtrlCmd: 2048, Shift: 1024, Alt: 512 },
        KeyCode: { Enter: 3, KeyR: 48, F1: 59 }
    },
    setupMonacoWorker: mockSetupMonacoWorker
}));

// Mock Monaco loader
vi.mock('@monaco-editor/react', () => ({
    loader: { init: vi.fn().mockResolvedValue(undefined) }
}));

// Mock schema service — kept at module scope so retry tests can spy on it.
const initializeSchemasMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../../schema', () => ({
    initializeSchemas: initializeSchemasMock,
    getProcessedSchema: vi.fn((provider: string) => ({
        $schema: `https://example.com/${provider}`,
        type: 'object'
    }))
}));

// Mock other dependencies
vi.mock('@deneb-viz/utils/type-conversion', () => ({
    toBoolean: vi.fn(() => false)
}));
vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn()
}));
vi.mock('@deneb-viz/vega-runtime/embed', () => ({
    getProviderSchemaUrl: vi.fn(
        (provider: string) => `https://schema.example.com/${provider}`
    )
}));
vi.mock('../../../state', () => ({
    getDenebState: vi.fn(() => ({
        editorSelectedOperation: 'Spec',
        dataset: { fields: {} },
        project: {
            supportFieldConfiguration: {},
            interactivity: undefined
        },
        editorPreferences: { jsonEditorFormattingMaxLineLength: 80 },
        i18n: { translate: vi.fn((key: string) => key) }
    }))
}));
vi.mock('../../../lib/dataset', () => ({
    getFieldDocumentationByName: vi.fn(() => '')
}));

describe('editor-init-service', () => {
    it('should report editor is not ready before initialization', async () => {
        // Use resetModules to get a fresh module with clean state
        vi.resetModules();
        const { isEditorReady } = await import('../editor-init-service');
        expect(isEditorReady()).toBe(false);
    });

    it('should initialize editor dependencies and report ready', async () => {
        vi.resetModules();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();
        expect(service.isEditorReady()).toBe(true);
    });

    it('should not re-run initialization when already ready', async () => {
        vi.resetModules();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();

        // Clear mocks to track if anything is called again
        mockSetupMonacoWorker.mockClear();
        mockSetDiagnosticsOptions.mockClear();

        // Call again — should be a no-op
        await service.initializeEditorDependencies();
        expect(mockSetupMonacoWorker).not.toHaveBeenCalled();
        expect(mockSetDiagnosticsOptions).not.toHaveBeenCalled();
    });

    it('should set up Monaco worker during initialization', async () => {
        vi.resetModules();
        mockSetupMonacoWorker.mockClear();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();
        expect(mockSetupMonacoWorker).toHaveBeenCalled();
    });

    it('should configure Monaco JSON diagnostics with schemas', async () => {
        vi.resetModules();
        mockSetDiagnosticsOptions.mockClear();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();
        expect(mockSetDiagnosticsOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                allowComments: true,
                schemas: expect.arrayContaining([
                    expect.objectContaining({
                        schema: expect.objectContaining({ type: 'object' })
                    })
                ])
            })
        );
    });

    it('should register a completion item provider for JSON', async () => {
        vi.resetModules();
        mockRegisterCompletionItemProvider.mockClear();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();
        expect(mockRegisterCompletionItemProvider).toHaveBeenCalledWith(
            'json',
            expect.any(Object)
        );
    });

    it('should add custom keybinding rules without the old formatDocument binding', async () => {
        vi.resetModules();
        mockAddKeybindingRules.mockClear();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();
        const rules = mockAddKeybindingRules.mock.calls[0][0];
        expect(rules).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ command: null }),
                expect.objectContaining({
                    command: 'editor.action.quickCommand'
                })
            ])
        );
        expect(rules).not.toContainEqual(
            expect.objectContaining({ command: 'editor.action.formatDocument' })
        );
    });

    it('should not dispose a completion provider when none was previously registered', async () => {
        vi.resetModules();
        // Fail before configure* calls — no provider is registered.
        initializeSchemasMock.mockRejectedValueOnce(
            new Error('fail before configure')
        );
        const service = await import('../editor-init-service');
        await expect(service.initializeEditorDependencies()).rejects.toThrow();

        // Retry succeeds — provider registered for the first time.
        mockRegisterCompletionItemProvider.mockClear();
        mockDisposeCompletionProvider.mockClear();
        await service.initializeEditorDependencies();
        expect(mockRegisterCompletionItemProvider).toHaveBeenCalledTimes(1);
        expect(mockDisposeCompletionProvider).not.toHaveBeenCalled();
    });

    it('should dispose the previous completion provider before re-registering on retry', async () => {
        vi.resetModules();
        mockRegisterCompletionItemProvider.mockClear();
        const firstDispose = vi.fn();
        mockRegisterCompletionItemProvider.mockReturnValueOnce({
            dispose: firstDispose
        });
        // First attempt: schemas + loader succeed, diagnostics + provider succeed,
        // but keybindings throw — provider IS registered before failure.
        mockAddKeybindingRules.mockImplementationOnce(() => {
            throw new Error('keybinding failure');
        });
        const service = await import('../editor-init-service');
        await expect(service.initializeEditorDependencies()).rejects.toThrow(
            'keybinding failure'
        );
        expect(mockRegisterCompletionItemProvider).toHaveBeenCalledTimes(1);

        // Retry succeeds — should dispose the provider from the first attempt.
        mockRegisterCompletionItemProvider.mockClear();
        await service.initializeEditorDependencies();
        expect(firstDispose).toHaveBeenCalledTimes(1);
        expect(mockRegisterCompletionItemProvider).toHaveBeenCalledTimes(1);
    });

    describe('formatting', () => {
        const makeModel = (value: string, eol = '\n') => ({
            getValue: () => value,
            getOptions: () => ({ tabSize: 2 }),
            getFullModelRange: () => 'FULL_RANGE',
            getOffsetAt: (position: { offset: number }) => position.offset,
            getPositionAt: (offset: number) => ({ offset }),
            getEOL: () => eol
        });

        it('should disable the worker formatter but keep its other features', async () => {
            vi.resetModules();
            mockSetModeConfiguration.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            expect(mockSetModeConfiguration).toHaveBeenCalledWith({
                diagnostics: true,
                hovers: true,
                documentFormattingEdits: false,
                documentRangeFormattingEdits: false
            });
        });

        it('should register a document formatting provider that compacts JSON', async () => {
            vi.resetModules();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            expect(
                mockRegisterDocumentFormattingEditProvider
            ).toHaveBeenCalledWith('json', expect.any(Object));
            const provider =
                mockRegisterDocumentFormattingEditProvider.mock.calls[0][1];
            const edits = provider.provideDocumentFormattingEdits(
                makeModel('{"a":1,\n"b":2}')
            );
            expect(edits).toEqual([
                { range: 'FULL_RANGE', text: '{"a": 1, "b": 2}' }
            ]);
        });

        it('should return no edits when the document is already formatted', async () => {
            vi.resetModules();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            const provider =
                mockRegisterDocumentFormattingEditProvider.mock.calls[0][1];
            expect(
                provider.provideDocumentFormattingEdits(
                    makeModel('{"a": 1, "b": 2}')
                )
            ).toEqual([]);
        });

        it('should return no edits for invalid JSON in a CRLF document', async () => {
            vi.resetModules();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            const provider =
                mockRegisterDocumentFormattingEditProvider.mock.calls[0][1];
            const doc = '{\r\n  "a": 1,\r\n}';
            expect(
                provider.provideDocumentFormattingEdits(makeModel(doc, '\r\n'))
            ).toEqual([]);
        });

        it('should return no edits for an already formatted CRLF document', async () => {
            vi.resetModules();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            const provider =
                mockRegisterDocumentFormattingEditProvider.mock.calls[0][1];
            const longValue = 'x'.repeat(90);
            const doc = `{\r\n  "expr": "${longValue}"\r\n}`;
            expect(
                provider.provideDocumentFormattingEdits(makeModel(doc, '\r\n'))
            ).toEqual([]);
        });

        it('should emit CRLF line endings when the model uses CRLF', async () => {
            vi.resetModules();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            const provider =
                mockRegisterDocumentFormattingEditProvider.mock.calls[0][1];
            const longValue = 'x'.repeat(90);
            const doc = `{"expr": "${longValue}"}`;
            expect(
                provider.provideDocumentFormattingEdits(makeModel(doc, '\r\n'))
            ).toEqual([
                {
                    range: 'FULL_RANGE',
                    text: `{\r\n  "expr": "${longValue}"\r\n}`
                }
            ]);
        });

        it('should register a range formatting provider that snaps to the enclosing node', async () => {
            vi.resetModules();
            mockRegisterDocumentRangeFormattingEditProvider.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            const provider =
                mockRegisterDocumentRangeFormattingEditProvider.mock
                    .calls[0][1];
            const doc = '{\n  "a": {\n    "b": 1\n  },\n  "c": 2\n}';
            // Select from the opening brace of "a"'s value to its closing
            // brace — the common ancestor is that object, which snaps to the
            // "a" property.
            const range = {
                getStartPosition: () => ({ offset: doc.indexOf('{', 1) }),
                getEndPosition: () => ({ offset: doc.indexOf('}') + 1 })
            };
            const edits = provider.provideDocumentRangeFormattingEdits(
                makeModel(doc),
                range
            );
            expect(edits).toEqual([
                {
                    range: {
                        start: { offset: doc.indexOf('"a"') },
                        end: { offset: doc.indexOf('},') + 1 }
                    },
                    text: '"a": {"b": 1}'
                }
            ]);
        });

        it('should add a Ctrl+Alt+R action that formats the selection when present, else the document', async () => {
            vi.resetModules();
            mockAddEditorAction.mockClear();
            const service = await import('../editor-init-service');
            await service.initializeEditorDependencies();
            expect(mockAddEditorAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'deneb.formatDocumentOrSelection',
                    label: 'Text_Editor_Action_Format',
                    keybindings: [2048 | 512 | 48]
                })
            );
            const { run } = mockAddEditorAction.mock.calls[0][0];
            const actionRun = vi.fn();
            const getAction = vi.fn(() => ({ run: actionRun }));

            run({
                getSelection: () => ({ isEmpty: () => false }),
                getAction
            });
            expect(getAction).toHaveBeenLastCalledWith(
                'editor.action.formatSelection'
            );

            run({
                getSelection: () => ({ isEmpty: () => true }),
                getAction
            });
            expect(getAction).toHaveBeenLastCalledWith(
                'editor.action.formatDocument'
            );
            expect(actionRun).toHaveBeenCalledTimes(2);
        });

        it('should dispose previous formatting registrations before re-registering on retry', async () => {
            vi.resetModules();
            mockDisposeFormattingProvider.mockClear();
            mockRegisterDocumentFormattingEditProvider.mockClear();
            // Formatting is configured before keybindings; make keybindings
            // throw so the first attempt fails after formatting is registered.
            mockAddKeybindingRules.mockImplementationOnce(() => {
                throw new Error('keybinding failure');
            });
            const service = await import('../editor-init-service');
            await expect(
                service.initializeEditorDependencies()
            ).rejects.toThrow('keybinding failure');
            expect(
                mockRegisterDocumentFormattingEditProvider
            ).toHaveBeenCalledTimes(1);

            await service.initializeEditorDependencies();
            // Three disposables (document provider, range provider, action)
            // from the first attempt are disposed on retry.
            expect(mockDisposeFormattingProvider).toHaveBeenCalledTimes(3);
            expect(
                mockRegisterDocumentFormattingEditProvider
            ).toHaveBeenCalledTimes(2);
        });
    });

    describe('retry behaviour', () => {
        it('should reject when doInitialize fails', async () => {
            vi.resetModules();
            initializeSchemasMock.mockRejectedValueOnce(
                new Error('transient error')
            );
            const service = await import('../editor-init-service');
            await expect(
                service.initializeEditorDependencies()
            ).rejects.toThrow('transient error');
        });

        it('should clear initPromise after failure so a retry can succeed', async () => {
            vi.resetModules();
            initializeSchemasMock.mockRejectedValueOnce(
                new Error('transient error')
            );
            const service = await import('../editor-init-service');
            await expect(
                service.initializeEditorDependencies()
            ).rejects.toThrow('transient error');
            expect(service.isEditorReady()).toBe(false);

            // Second call — initializeSchemas now succeeds (default mock).
            await expect(
                service.initializeEditorDependencies()
            ).resolves.toBeUndefined();
            expect(service.isEditorReady()).toBe(true);
        });

        it('should deliver the same rejection to concurrent callers', async () => {
            vi.resetModules();
            initializeSchemasMock.mockRejectedValueOnce(
                new Error('concurrent error')
            );
            const service = await import('../editor-init-service');
            const [r1, r2] = await Promise.allSettled([
                service.initializeEditorDependencies(),
                service.initializeEditorDependencies()
            ]);
            expect(r1.status).toBe('rejected');
            expect(r2.status).toBe('rejected');
            if (r1.status === 'rejected' && r2.status === 'rejected') {
                expect(r1.reason.message).toBe('concurrent error');
                expect(r2.reason.message).toBe('concurrent error');
            }
        });
    });
});
