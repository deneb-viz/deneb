import create, { GetState, SetState, StateCreator } from 'zustand';
import { useCallback } from 'react';
import { devtools } from 'zustand/middleware';
import get from 'lodash/get';
import { IDatasetSlice, createDatasetSlice } from './dataset';
import { IEditorSlice, createEditorSlice } from './editor';
import { ITemplateSlice, createTemplateSlice } from './template';
import { IVisualSlice, createVisualSlice } from './visual';
import { isFeatureEnabled } from '../core/utils/features';
import { IVisualDataset } from '../core/data';

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

const getState = () => store.getState();

const useStoreProp = <T>(propname: string, path = ''): T => {
    const resolved = `${(path && `${path}.`) || ''}${propname}`;
    const selector = useCallback(
        (state) => get(state, `${resolved}`),
        [propname]
    );
    return store(selector);
};

const useStoreVegaProp = <T>(propname: string): T =>
    useStoreProp(propname, 'visualSettings.vega');

const useStoreDataset = (): IVisualDataset => useStoreProp('dataset');

export default store;
export { getState, useStoreProp, useStoreVegaProp, useStoreDataset };
