import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import isEqual from 'lodash/isEqual';
import uniqWith from 'lodash/uniqWith';

import { TStoreState } from '.';
import { ISpecification } from '../features/specification';

interface ISpecificationSliceProperties extends ISpecification {
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
    setSpecificationParseResults: (spec: ISpecification) => void;
}

export interface ISpecificationSlice {
    specification: ISpecificationSliceProperties;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <ISpecificationSlice>{
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
    ISpecificationSlice
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
        warns: uniqWith([...state.specification.warns, message], isEqual)
    }
});

const handleLogErrors = (
    state: TStoreState,
    message: string
): Partial<TStoreState> => {
    const errors = uniqWith([...state.specification.errors, message], isEqual);
    return {
        debug: { ...state.debug, logAttention: errors.length > 0 },
        specification: {
            ...state.specification,
            errors
        }
    };
};

const handleSetSpecificationParseResults = (
    state: TStoreState,
    spec: ISpecification
): Partial<TStoreState> => ({
    specification: {
        ...state.specification,
        ...spec
    }
});
