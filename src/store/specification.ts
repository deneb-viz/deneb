import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';
import { type StoreState, type SpecificationSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<StoreState>) =>
    <SpecificationSlice>{
        specification: {
            errors: [],
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
    };

export const createSpecificationSlice: StateCreator<
    StoreState,
    [['zustand/devtools', never]],
    [],
    SpecificationSlice
> = sliceStateInitializer;

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
        },
        visual4d3d3d: false
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
    },
    visual4d3d3d: false
});
