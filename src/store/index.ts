import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { IDatasetSlice, createDatasetSlice } from './dataset';
import { IDebugSlice, createDebugSlice } from './debug';
import { IEditorSlice, createEditorSlice } from './editor';
import { IInterfaceSlice, createInterfaceSlice } from './interface';
import { ISpecificationSlice, createSpecificationSlice } from './specification';
import { ITemplateSlice, createTemplateSlice } from './template';
import { IVisualSlice, createVisualSlice } from './visual';
import { IVisualUpdateSlice, createVisualUpdateSlice } from './visual-update';
import { isFeatureEnabled } from '../core/utils/features';

export type TStoreState = IDatasetSlice &
    IDebugSlice &
    IEditorSlice &
    IInterfaceSlice &
    ISpecificationSlice &
    ITemplateSlice &
    IVisualSlice &
    IVisualUpdateSlice;

const store = create<TStoreState>()(
    devtools(
        (...a) => ({
            ...createDatasetSlice(...a),
            ...createDebugSlice(...a),
            ...createEditorSlice(...a),
            ...createInterfaceSlice(...a),
            ...createSpecificationSlice(...a),
            ...createTemplateSlice(...a),
            ...createVisualSlice(...a),
            ...createVisualUpdateSlice(...a)
        }),
        { enabled: isFeatureEnabled('developerMode') }
    )
);

const getState = () => store.getState();

export default store;
export { getState };
