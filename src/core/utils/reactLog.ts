import { isFeatureEnabled } from './features';

/**
 * Provide simple logging in developer mode for React components.
 */
export const reactLog = (...args: any[]) => {
    const enabled = isFeatureEnabled('enableReactLogging');
    enabled && console.log(`[REACT]`, ...args);
};
