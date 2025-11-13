import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';
import { type SpecificationSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
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
    TStoreState,
    [['zustand/devtools', never]],
    [],
    SpecificationSlice
> = sliceStateInitializer;

const handleClearLog = (state: TStoreState): Partial<TStoreState> => ({
    specification: {
        ...state.specification,
        errors: [],
        warns: []
    }
});

const handleLogWarns = (
    state: TStoreState,
    message: string
): Partial<TStoreState> => ({
    specification: {
        ...state.specification,
        warns: Array.from(
            new Set<string>([...state.specification.warns, message])
        )
    }
});

const handleLogErrors = (
    state: TStoreState,
    message: string
): Partial<TStoreState> => {
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
    state: TStoreState,
    spec: CompiledSpecification
): Partial<TStoreState> => ({
    debug: { ...state.debug, logAttention: spec.errors.length > 0 },
    specification: {
        ...state.specification,
        ...spec
    },
    visual4d3d3d: false
});
