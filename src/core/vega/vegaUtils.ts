import { Signal, Spec } from 'vega';
import { DATASET_NAME } from '../../constants';
import { getState } from '../../store';
import { getConfig } from '../utils/config';

export { getPatchedVegaSpec };

/**
 * Apply specific patching operations to a supplied spec. This applies any
 * specific signals that we don't necessarily want the creator to worry about,
 * but will ensure that the visual functions as expected. We also patch in the
 * dataset, because we've found that binding this via react-vega causes some
 * issues with the data being available for certain calculations. This
 * essentially ensures that the data is processed in-line with the spec.
 */
const getPatchedVegaSpec = (spec: Spec): Spec => ({
    ...spec,
    ...{
        height: spec['height'] ?? { signal: 'pbiContainerHeight' },
        width: spec['width'] ?? { signal: 'pbiContainerWidth' },
        data: getPatchedData(spec)
    },
    ...getPatchedSignals(spec)
});

/**
 * Patch the data array in a spec to ensure that values from the visual
 * dataset are in the correct place.
 */
const getPatchedData = (spec: Spec) => {
    const name = DATASET_NAME;
    const index = spec?.data?.findIndex((ds) => ds.name == name);
    const values = getState().dataset?.values ?? [];
    return index >= 0
        ? [
              ...spec.data.slice(0, index),
              ...[
                  {
                      ...spec.data[index],
                      values
                  }
              ],
              ...spec.data.slice(index + 1)
          ]
        : [
              ...(spec.data ?? []),
              ...[
                  {
                      name,
                      values
                  }
              ]
          ];
};

// Logic to patch helper signals into a Vega spec
const getPatchedSignals = (spec: object) => ({
    signals: [...(spec['signals'] || []), ...customSignals]
});

// Custom signals that we wish to expose for Power BI vs. core Vega
const customSignals: Signal[] =
    getConfig()?.providerResources?.vega?.patch?.signals || [];
