import { getDenebState, useDenebState } from '@deneb-viz/app-core';

// Provide wrappers around migrated store, while we transition codebase.
const store = useDenebState;
const getState = getDenebState;

export default store;
export { getState };
