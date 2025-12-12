import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';
import { type StoreState } from './state';
import { StateCreator } from 'zustand';

export type SpecificationSliceProperties = CompiledSpecification & {
    /**
     * Clear all current errors and warnings.
     */
    clearLog: () => void;
    /**
     * Record a new error message into the current array of errors.
     */
    logError: (error: string) => void;
    /**
     * Record a new warning message into the current array of warnings.
     */
    logWarn: (warn: string) => void;
    /**
     * Set the current specification and parse results.
     */
    setSpecificationParseResults: (spec: CompiledSpecification) => void;
};

export type SpecificationSlice = {
    specification: SpecificationSliceProperties;
};

export const createSpecificationSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        SpecificationSlice
    > =>
    (set) => ({
        specification: {
            errors: [],
            hashValue: null,
            spec: null,
            status: 'new',
            warns: [],
            clearLog: () =>
                set(handleClearLog, false, 'specification.clearLog'),
            logError: (error) =>
                set(
                    (state) => handleLogErrors(state, error),
                    false,
                    'specification.logErrors'
                ),
            logWarn: (warn) =>
                set(
                    (state) => handleLogWarns(state, warn),
                    false,
                    'specification.logWarns'
                ),
            setSpecificationParseResults: (spec) =>
                set(
                    (state) => handleSetSpecificationParseResults(state, spec),
                    false,
                    'specification.setSpecificationParseResults'
                )
        }
    });

const handleClearLog = (state: StoreState): Partial<StoreState> => ({
    specification: {
        ...state.specification,
        errors: [],
        warns: []
    }
});

const handleLogWarns = (
    state: StoreState,
    message: string
): Partial<StoreState> => ({
    specification: {
        ...state.specification,
        warns: Array.from(
            new Set<string>([...state.specification.warns, message])
        )
    }
});

const handleLogErrors = (
    state: StoreState,
    message: string
): Partial<StoreState> => {
    const errors = Array.from(
        new Set<string>([...state.specification.errors, message])
    );
    return {
        debug: { ...state.debug, logAttention: errors.length > 0 },
        specification: {
            ...state.specification,
            errors
        }
    };
};

const handleSetSpecificationParseResults = (
    state: StoreState,
    spec: CompiledSpecification
): Partial<StoreState> => ({
    debug: { ...state.debug, logAttention: spec.errors.length > 0 },
    specification: {
        ...state.specification,
        ...spec
    }
});
