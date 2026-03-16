import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type MockInstance
} from 'vitest';

/**
 * Retry-behaviour tests for schema-service.
 *
 * These tests use vi.resetModules() + dynamic import to get a fresh module
 * state for each scenario. Heavy deps (vega schemas, ajv, mergician) are
 * mocked with lightweight stubs so reset is cheap.
 *
 * Kept separate from schema-service.test.ts which deliberately avoids
 * vi.resetModules() to skip re-parsing the real Vega/Vega-Lite schemas.
 */

vi.mock('vega/vega-schema.json', () => ({ default: { $schema: 'vega' } }));
vi.mock('vega-lite/vega-lite-schema.json', () => ({
    default: {
        $schema: 'vega-lite',
        definitions: {
            Categorical: { enum: [] },
            Diverging: { enum: [] },
            SequentialMultiHue: { enum: [] }
        }
    }
}));
vi.mock('ajv/lib/refs/json-schema-draft-06.json', () => ({ default: {} }));
vi.mock('@deneb-viz/vega-runtime/extensibility', () => ({
    VEGA_LITE_SCHEME_ADDITIONS: {
        categorical: [],
        diverging: [],
        sequential: []
    }
}));

// Mergician is the first operation in doInitialize — easy to make it throw.
const mergicianMock = vi.fn();
vi.mock('mergician', () => ({ mergician: mergicianMock }));

// Stub AJV so compile() returns a trivially passing validator.
const compileMock = vi.fn(() => {
    const fn = (_: unknown) => true;
    fn.errors = null;
    return fn;
});
vi.mock('ajv', () => ({
    default: vi.fn(() => ({
        addMetaSchema: vi.fn(),
        addFormat: vi.fn(),
        compile: compileMock
    }))
}));
vi.mock('ajv-formats', () => ({ default: vi.fn() }));

describe('schema-service retry behaviour', () => {
    // Re-import the module fresh before each test.
    let initializeSchemas: () => Promise<void>;
    let areSchemasReady: () => boolean;

    beforeEach(async () => {
        vi.resetModules();
        mergicianMock.mockReset();
        compileMock.mockReset();
        // Default: compile returns a passing validator stub.
        compileMock.mockImplementation(() => {
            const fn = (_: unknown) => true;
            fn.errors = null;
            return fn;
        });
        // Default: mergician passes through its first argument.
        mergicianMock.mockImplementation((a: unknown) => a);

        const mod = await import('../schema-service');
        initializeSchemas = mod.initializeSchemas;
        areSchemasReady = mod.areSchemasReady;
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('rejects when doInitialize throws', async () => {
        mergicianMock.mockImplementationOnce(() => {
            throw new Error('transient error');
        });
        await expect(initializeSchemas()).rejects.toThrow('transient error');
    });

    it('clears initPromise after failure so a subsequent call can retry', async () => {
        mergicianMock.mockImplementationOnce(() => {
            throw new Error('transient error');
        });
        await expect(initializeSchemas()).rejects.toThrow('transient error');
        expect(areSchemasReady()).toBe(false);

        // Second call — mergician now succeeds (default mock).
        await expect(initializeSchemas()).resolves.toBeUndefined();
        expect(areSchemasReady()).toBe(true);
    });

    it('concurrent callers during a failure all receive the same rejection', async () => {
        mergicianMock.mockImplementationOnce(() => {
            throw new Error('concurrent error');
        });
        const [r1, r2] = await Promise.allSettled([
            initializeSchemas(),
            initializeSchemas()
        ]);
        expect(r1.status).toBe('rejected');
        expect(r2.status).toBe('rejected');
        if (r1.status === 'rejected' && r2.status === 'rejected') {
            expect(r1.reason.message).toBe('concurrent error');
            expect(r2.reason.message).toBe('concurrent error');
        }
    });

    it('does not retry when already succeeded', async () => {
        await initializeSchemas();
        expect(areSchemasReady()).toBe(true);
        const callsBefore = mergicianMock.mock.calls.length;
        await initializeSchemas();
        expect(mergicianMock.mock.calls.length).toBe(callsBefore);
    });
});
