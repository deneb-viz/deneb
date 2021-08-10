export { getPatchedVegaSpec };

import { Signal } from 'vega';
import { getConfig } from '../utils/config';

// Apply specific patching operations to a supplied spec
const getPatchedVegaSpec = (spec: Object) => ({
    ...spec,
    ...getPatchedTopLevelDimensions(spec),
    ...getPatchedSignals(spec)
});

// Logic to patch height and/or width into a spec, if not supplied
const getPatchedTopLevelDimensions = (spec: Object) => ({
    height: spec['height'] || { signal: 'pbiContainerHeight' },
    width: spec['width'] || { signal: 'pbiContainerWidth' }
});

// Logic to patch helper signals into a Vega spec
const getPatchedSignals = (spec: Object) => ({
    signals: [...(spec['signals'] || []), ...customSignals]
});

// Custom signals that we wish to expose for Power BI vs. core Vega
const customSignals: Signal[] =
    getConfig()?.providerResources?.vega?.patch?.signals || [];
