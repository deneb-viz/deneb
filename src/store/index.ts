import { getState as appGetState, useState } from '@deneb-viz/app-core';

// Provide wrappers around migrated store, while we transition codebase.
const store = useState;
const getState = appGetState;

export default store;
export { getState };
