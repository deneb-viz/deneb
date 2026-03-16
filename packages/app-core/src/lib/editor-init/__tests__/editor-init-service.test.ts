import { describe, expect, it, vi } from 'vitest';

/**
 * Editor init service tests. These verify the orchestration requirements:
 * - Editor dependencies initialize without error
 * - Monaco diagnostics are configured with schemas after init
 * - Monaco completion provider and key bindings are registered
 * - Initialization is idempotent
 */

// Mock Monaco integration
const mockSetDiagnosticsOptions = vi.fn();
const mockRegisterCompletionItemProvider = vi.fn();
const mockAddKeybindingRules = vi.fn();
const mockSetupMonacoWorker = vi.fn();

vi.mock('../../../components/code-editor/monaco-integration', () => ({
    monaco: {
        languages: {
            json: {
                jsonDefaults: {
                    setDiagnosticsOptions: mockSetDiagnosticsOptions
                }
            },
            registerCompletionItemProvider: mockRegisterCompletionItemProvider,
            CompletionItemKind: { Field: 5 }
        },
        editor: {
            addKeybindingRules: mockAddKeybindingRules
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
        dataset: { fields: {} }
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

    it('should add custom keybinding rules', async () => {
        vi.resetModules();
        mockAddKeybindingRules.mockClear();
        const service = await import('../editor-init-service');
        await service.initializeEditorDependencies();
        expect(mockAddKeybindingRules).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ command: null }),
                expect.objectContaining({
                    command: 'editor.action.formatDocument'
                }),
                expect.objectContaining({
                    command: 'editor.action.quickCommand'
                })
            ])
        );
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
