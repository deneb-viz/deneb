// tslint:disable:export-name
import { TopLevelSpec } from 'vega-lite';
import { DATASET_NAME } from '../../constants';
import { getState } from '../../store';

export { getPatchedVegaLiteSpec };

// Apply specific patching operations to a supplied spec
const getPatchedVegaLiteSpec = (spec: TopLevelSpec): TopLevelSpec => ({
    ...spec,
    ...{
        height: spec['height'] ?? 'container',
        width: spec['width'] ?? 'container',
        datasets: {
            ...(spec.datasets ?? {}),
            [`${DATASET_NAME}`]: getState().dataset?.values ?? []
        }
    }
});
