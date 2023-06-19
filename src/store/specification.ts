import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import isEqual from 'lodash/isEqual';
import uniqWith from 'lodash/uniqWith';

import { TStoreState } from '.';
import { ISpecification } from '../features/specification';

interface ISpecificationSliceProperties extends ISpecification {
    logError: (error: string) => void;
    logWarn: (warn: string) => void;
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
                )
        }
    };

export const createSpecificationSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    ISpecificationSlice
> = sliceStateInitializer;

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
