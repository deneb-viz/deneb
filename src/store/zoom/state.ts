export { IZoomSliceState, initialState };

import { getConfig } from '../../core/utils/config';

const config = getConfig().zoomLevel;

interface IZoomSliceState {
    min: number;
    max: number;
    step: number;
    default: number;
    value: number;
}

const initialState: IZoomSliceState = {
    ...config,
    value: config.default
};
