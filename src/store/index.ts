import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { visual } from './visual';
import { templates } from './templates';

const getNewStore = () => {
    const reducer = combineReducers({
        visual,
        templates
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
