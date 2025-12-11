export { getDenebVisualState, useDenebVisualState } from './state';
export type * from './state';

// Proxy for legacy store access;
// TODO; remove when all components have been migrated to new store.
import { getDenebState, useDenebState } from '@deneb-viz/app-core';

// Provide wrappers around migrated store, while we transition codebase.
const store = useDenebState;
const getState = getDenebState;

export default store;
export { getState };
