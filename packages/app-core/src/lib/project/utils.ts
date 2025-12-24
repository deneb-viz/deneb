import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { DenebProject } from './types';
import { logDebug } from '@deneb-viz/utils/logging';

export const isProjectInitialized = (project: DenebProject): boolean => {
    const isInitialized =
        project.config !== PROJECT_DEFAULTS.config ||
        project.spec !== PROJECT_DEFAULTS.spec;
    logDebug('isProjectInitialized', { project, isInitialized });
    return isInitialized;
};
