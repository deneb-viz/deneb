import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getConfig } from '../core/utils/config';

export interface IZoomSliceState {
    min: number;
    max: number;
    step: number;
    default: number;
    value: number;
}

const name = 'zoom',
    config = getConfig().zoomLevel,
    initialState: IZoomSliceState = {
        ...config,
        value: config.default
    };

const zoomSlice = createSlice({
    name,
    initialState,
    reducers: {
        setZoomLevel: (state, action: PayloadAction<number>) => {
            state.value = action.payload;
        }
    }
});

const zoomReducer = zoomSlice.reducer;

export const { setZoomLevel } = zoomSlice.actions;

export default zoomReducer;
