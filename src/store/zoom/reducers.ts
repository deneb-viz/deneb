import { WritableDraft } from 'immer/dist/internal';
import { PayloadAction } from '@reduxjs/toolkit';
import { IZoomSliceState } from './state';

export const setZoomLevel = (
    state: WritableDraft<IZoomSliceState>,
    action: PayloadAction<number>
) => {
    state.value = action.payload;
};
