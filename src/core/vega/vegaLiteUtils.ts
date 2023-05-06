// tslint:disable:export-name
import { TopLevelSpec } from 'vega-lite';
import { DATASET_NAME } from '../../constants';
import { getState } from '../../store';

export { getPatchedVegaLiteSpec };

/**
 * Apply specific patching operations to a supplied spec. This applies any
 * specific signals that we don't necessarily want the creator to worry about,
 * but will ensure that the visual functions as expected. We also patch in the
 * dataset, because we've found that binding this via react-vega causes some
 * issues with the data being available for certain calculations. This
 * essentially ensures that the data is processed in-line with the spec.
 */
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
