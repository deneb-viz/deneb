export { isDeveloperModeEnabled };

import { isFeatureEnabled } from '../features';

const isDeveloperModeEnabled = isFeatureEnabled('developerMode');
