import { applyChanges } from '../../api/commands';
import store from '../../store';
import { toggleAutoApply } from '../../store/visualReducer';

export const toggleAutoApplyState = () => {
    applyChanges();
    store.dispatch(toggleAutoApply());
};
