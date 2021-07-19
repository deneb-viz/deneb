import { applyChanges } from '../../api/commands';
import store from '../../store';
import { toggleAutoApply } from '../../store/visualReducer';
import { setZoomLevel } from '../../store/zoomReducer';

export const toggleAutoApplyState = () => {
    applyChanges();
    store.dispatch(toggleAutoApply());
};

export const handleSetZoomLevel = (value: number) => {
    store.dispatch(setZoomLevel(value));
}
