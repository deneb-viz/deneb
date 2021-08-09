import { configureStore, combineReducers } from '@reduxjs/toolkit';

import visualReducer from './visual';
import templateReducer from './templates';
import zoomReducer from './zoom';

const getNewStore = () => {
    const reducer = combineReducers({
        visual: visualReducer,
        templates: templateReducer,
        zoom: zoomReducer
    });
    return configureStore({
        reducer
    });
};

const store = getNewStore();

const state = (state: RootState) => state;

const getState = () => store.getState();

export type RootState = ReturnType<typeof store.getState>;
export { state, store, getState };
export default store;
