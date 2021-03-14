import { configureStore, combineReducers } from '@reduxjs/toolkit';

import visualReducer from './visualReducer';
import templateReducer from './templateReducer';

const reducer = combineReducers({
    visual: visualReducer,
    templates: templateReducer
});

const store = configureStore({
    reducer
});

const state = (state: RootState) => state;

export type RootState = ReturnType<typeof store.getState>;
export { state };
export default store;
