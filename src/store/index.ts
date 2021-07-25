import { store } from '../api/store';

const state = (state: RootState) => state;

export type RootState = ReturnType<typeof store.getState>;
export { state };
export default store;
