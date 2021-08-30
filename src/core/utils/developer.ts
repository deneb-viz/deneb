export { isDeveloperModeEnabled };

import { isFeatureEnabled } from './features';

/** Convenience constant that confirms whether the `developerMode` feature switch is enabled via features */
const isDeveloperModeEnabled = isFeatureEnabled('developerMode');
