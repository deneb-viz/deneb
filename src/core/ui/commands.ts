import { applyChanges } from '../../api/commands';
import store, { getState } from '../../store';
import { toggleAutoApply } from '../../store/visual';
import { setZoomLevel } from '../../store/zoom';
import { getConfig } from '../utils/config';
import { getZoomToFitScale } from './advancedEditor';

export const toggleAutoApplyState = () => {
    applyChanges();
    store.dispatch(toggleAutoApply());
};

export const handleResetZoomLevel = () => {
    handleSetZoomLevel(getConfig().zoomLevel.default);
};

export const handleZoomIn = () => {
    const { value, step, max } = getState().zoom,
        level = Math.min(max, value + step);
    value < max && handleSetZoomLevel(level);
};

export const handleZoomOut = () => {
    const { value, step, min } = getState().zoom,
        level = Math.max(min, value - step);
    value > min && handleSetZoomLevel(level);
};

export const handleSetZoomToFit = () => {
    handleSetZoomLevel(getZoomToFitScale());
};

export const handleSetZoomLevel = (value: number) => {
    store.dispatch(setZoomLevel(value));
};
