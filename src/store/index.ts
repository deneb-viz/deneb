import create, { GetState, SetState, StateCreator } from 'zustand';
import { useCallback } from 'react';
import { devtools } from 'zustand/middleware';
import { IDatasetSlice, createDatasetSlice } from './dataset';
import { IEditorSlice, createEditorSlice } from './editor';
import { ITemplateSlice, createTemplateSlice } from './template';
import { IVisualSlice, createVisualSlice } from './visual';
import { isFeatureEnabled } from '../core/utils/features';

export type TStoreState = IDatasetSlice &
    IEditorSlice &
    ITemplateSlice &
    IVisualSlice;

const combinedSlices: StateCreator<
    TStoreState,
    SetState<TStoreState>,
    GetState<TStoreState>,
    any
> = (set, get) => ({
    ...createDatasetSlice(set, get),
    ...createEditorSlice(set, get),
    ...createTemplateSlice(set, get),
    ...createVisualSlice(set, get)
});
const store = create<TStoreState>(
    isFeatureEnabled('developerMode')
        ? devtools(combinedSlices)
        : combinedSlices
);

export default store;

const getState = () => store.getState();

const useStoreProp = (propname: string) => {
    const selector = useCallback((state) => state[propname], [propname]);
    return store(selector);
};

export { getState, useStoreProp };
