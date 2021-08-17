import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './state';
import * as reducers from './reducers';

const slice = createSlice({
        name: 'zoom',
        initialState,
        reducers
    }),
    zoomReducer = slice.reducer;

export const { setZoomLevel } = slice.actions;

export default zoomReducer;
