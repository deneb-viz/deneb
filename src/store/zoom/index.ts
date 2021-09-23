import { createSlice } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';
import { PayloadAction } from '@reduxjs/toolkit';
import { initialState, IZoomSliceState } from './state';

const slice = createSlice({
    name: 'zoom',
    initialState,
    reducers: {
        setZoomLevel: (
            state: WritableDraft<IZoomSliceState>,
            action: PayloadAction<number>
        ) => {
            state.value = action.payload;
        }
    }
});

export const zoom = slice.reducer,
    { setZoomLevel } = slice.actions;
