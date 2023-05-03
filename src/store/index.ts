import { useCallback } from 'react';
import { create } from 'zustand';
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

const store = create<TStoreState>()(
    devtools(
        (...a) => ({
            ...createDatasetSlice(...a),
            ...createEditorSlice(...a),
            ...createTemplateSlice(...a),
            ...createVisualSlice(...a)
        }),
        { enabled: isFeatureEnabled('developerMode') }
    )
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
