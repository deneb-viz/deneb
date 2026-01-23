import { StateCreator } from 'zustand';
import { compileSpec } from '@deneb-viz/vega-runtime/compilation';
import type {
    CompilationResult,
    CompileSpecOptions
} from '@deneb-viz/vega-runtime/compilation';
import { type StoreState, type SyncableSlice } from './state';
import { INCREMENTAL_UPDATE_CONFIGURATION } from '../lib/vega';

/**
 * Performance settings that control compilation and rendering behavior.
 * These settings are durable across viewer and editor modes.
 */
export type CompilationPerformanceSettings = {
    /**
     * Whether to use incremental data updates for small dataset changes.
     * When enabled, uses view.data() instead of full re-compilation
     * for datasets below the threshold.
     * @default true
     */
    enableIncrementalDataUpdates: boolean;

    /**
     * Row count threshold for incremental updates.
     * Datasets with fewer rows than this will use incremental updates
     * if enableIncrementalDataUpdates is true.
     * @default 500
     */
    incrementalUpdateThreshold: number;
};

/**
 * Payload for syncing compilation performance settings.
 * Used for hydration from localStorage and Power BI properties.
 */
export type CompilationPerformanceSyncPayload =
    Partial<CompilationPerformanceSettings>;

/**
 * Properties for the compilation slice.
 * Manages the state of spec compilation for rendering.
 */
export type CompilationSliceProperties = SyncableSlice &
    CompilationPerformanceSettings & {
        /**
         * Current compilation result (spec + embed options).
         * Null when no compilation has been performed yet.
         */
        result: CompilationResult | null;

        /**
         * Whether a compilation is currently in progress.
         */
        isCompiling: boolean;

        /**
         * Timestamp of the last successful compilation.
         * Used for cache invalidation and change detection.
         */
        lastCompiled: number | null;

        /**
         * Whether the Vega view has completed its initial run.
         * Set to false when embedding starts, true when view.runAsync() completes.
         * Used to guard incremental data updates - we can only update the view
         * after it has fully initialized its datasets and signals.
         */
        viewReady: boolean;

        /**
         * Runtime errors accumulated during Vega view rendering.
         * These are errors that occur after compilation, during view execution.
         */
        runtimeErrors: string[];

        /**
         * Runtime warnings accumulated during Vega view rendering.
         */
        runtimeWarnings: string[];

        /**
         * Compile the current specification with given options.
         */
        compile: (options: CompileSpecOptions) => void;

        /**
         * Clear the current compilation result.
         */
        clear: () => void;

        /**
         * Reset the compilation state to initial values.
         */
        reset: () => void;

        /**
         * Sync performance settings from external source (localStorage, Power BI properties).
         */
        syncPerformanceSettings: (
            payload: CompilationPerformanceSyncPayload
        ) => void;

        /**
         * Update individual performance setting.
         */
        setEnableIncrementalDataUpdates: (enabled: boolean) => void;

        /**
         * Update dataset row threshold for incremental updates.
         */
        setIncrementalUpdateThreshold: (threshold: number) => void;

        /**
         * Set view ready state. Called by VegaEmbed when view.runAsync() completes.
         */
        setViewReady: (ready: boolean) => void;

        /**
         * Record a runtime error message. Deduplicates messages.
         */
        logError: (error: string) => void;

        /**
         * Record a runtime warning message. Deduplicates messages.
         */
        logWarn: (warn: string) => void;

        /**
         * Clear all runtime errors and warnings.
         */
        clearLog: () => void;
    };

export type CompilationSlice = {
    compilation: CompilationSliceProperties;
};

/**
 * Default performance settings.
 */
const defaultPerformanceSettings: CompilationPerformanceSettings = {
    enableIncrementalDataUpdates:
        INCREMENTAL_UPDATE_CONFIGURATION.enabledDefault,
    incrementalUpdateThreshold:
        INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold
};

/**
 * Initial compilation state.
 */
const initialState: Omit<
    CompilationSliceProperties,
    | 'compile'
    | 'clear'
    | 'reset'
    | 'syncPerformanceSettings'
    | 'setEnableIncrementalDataUpdates'
    | 'setIncrementalUpdateThreshold'
    | 'setViewReady'
    | 'logError'
    | 'logWarn'
    | 'clearLog'
> = {
    __hasHydrated__: false,
    result: null,
    isCompiling: false,
    lastCompiled: null,
    viewReady: false,
    runtimeErrors: [],
    runtimeWarnings: [],
    ...defaultPerformanceSettings
};

/**
 * Create the compilation slice for the Deneb state store - manages spec compilation lifecycle and results.
 */
export const createCompilationSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        CompilationSlice
    > =>
    (set) => ({
        compilation: {
            ...initialState,
            compile: (options) =>
                set(
                    (state) => handleCompile(state, options),
                    false,
                    'compilation.compile'
                ),
            clear: () => set(handleClear, false, 'compilation.clear'),
            reset: () => set(handleReset, false, 'compilation.reset'),
            syncPerformanceSettings: (payload) =>
                set(
                    (state) => handleSyncPerformanceSettings(state, payload),
                    false,
                    'compilation.syncPerformanceSettings'
                ),
            setEnableIncrementalDataUpdates: (enabled) =>
                set(
                    (state) => ({
                        compilation: {
                            ...state.compilation,
                            enableIncrementalDataUpdates: enabled
                        }
                    }),
                    false,
                    'compilation.setEnableIncrementalDataUpdates'
                ),
            setIncrementalUpdateThreshold: (threshold) =>
                set(
                    (state) => ({
                        compilation: {
                            ...state.compilation,
                            incrementalUpdateThreshold: threshold
                        }
                    }),
                    false,
                    'compilation.setIncrementalUpdateThreshold'
                ),
            setViewReady: (ready) =>
                set(
                    (state) => ({
                        compilation: {
                            ...state.compilation,
                            viewReady: ready
                        }
                    }),
                    false,
                    'compilation.setViewReady'
                ),
            logError: (error) =>
                set(
                    (state) => handleLogError(state, error),
                    false,
                    'compilation.logError'
                ),
            logWarn: (warn) =>
                set(
                    (state) => handleLogWarn(state, warn),
                    false,
                    'compilation.logWarn'
                ),
            clearLog: () => set(handleClearLog, false, 'compilation.clearLog')
        }
    });

/**
 * Handle compilation of a specification.
 *
 * - updates state with compilation result or errors
 * - clears previous runtime errors/warnings since we're starting fresh
 */
const handleCompile = (
    state: StoreState,
    options: CompileSpecOptions
): Partial<StoreState> => {
    const result = compileSpec(options);
    const hasErrors = (result.errors?.length ?? 0) > 0;

    return {
        debug: { ...state.debug, logAttention: hasErrors },
        compilation: {
            ...state.compilation,
            result,
            isCompiling: false,
            lastCompiled: Date.now(),
            // Clear runtime logs on new compilation - they'll be repopulated if errors occur during render
            runtimeErrors: [],
            runtimeWarnings: []
        }
    };
};

/**
 * Clear the current compilation result.
 */
const handleClear = (state: StoreState): Partial<StoreState> => ({
    compilation: {
        ...state.compilation,
        result: null
    }
});

/**
 * Reset compilation state to initial values.
 */
const handleReset = (state: StoreState): Partial<StoreState> => ({
    compilation: {
        ...state.compilation,
        ...initialState
    }
});

/**
 * Sync performance settings from external source (localStorage, Power BI properties).
 * Filters out undefined values and marks as hydrated.
 */
const handleSyncPerformanceSettings = (
    state: StoreState,
    payload: CompilationPerformanceSyncPayload
): Partial<StoreState> => {
    const definedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    return {
        compilation: {
            ...state.compilation,
            ...definedPayload,
            __hasHydrated__: true
        }
    };
};

/**
 * Record a (deduplicated) runtime error message.
 */
const handleLogError = (
    state: StoreState,
    message: string
): Partial<StoreState> => {
    const runtimeErrors = Array.from(
        new Set<string>([...state.compilation.runtimeErrors, message])
    );
    return {
        debug: { ...state.debug, logAttention: runtimeErrors.length > 0 },
        compilation: {
            ...state.compilation,
            runtimeErrors
        }
    };
};

/**
 * Record a runtime warning message. Deduplicates using Set.
 */
const handleLogWarn = (
    state: StoreState,
    message: string
): Partial<StoreState> => ({
    compilation: {
        ...state.compilation,
        runtimeWarnings: Array.from(
            new Set<string>([...state.compilation.runtimeWarnings, message])
        )
    }
});

/**
 * Clear all runtime errors and warnings.
 */
const handleClearLog = (state: StoreState): Partial<StoreState> => ({
    compilation: {
        ...state.compilation,
        runtimeErrors: [],
        runtimeWarnings: []
    }
});
