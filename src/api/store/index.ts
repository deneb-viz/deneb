export { getState, getStore };

import store from '../../store';

const getState = () => store.getState();

const getStore = () => store;
