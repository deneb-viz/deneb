import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import cloneDeep from 'lodash/cloneDeep';

import { getState } from '../../store';

import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';
import { type DatasetValueRow } from '@deneb-viz/dataset/datum';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import { getVisualSettings } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Patch the data array in a spec to ensure that values from the visual
 * dataset are in the correct place.
 */
const getPatchedData = (spec: Vega.Spec, values: DatasetValueRow[]) => {
    const name = DATASET_DEFAULT_NAME;
    logDebug('getPatchedData', { spec, values });
    try {
        const newSpec = typeof spec === 'undefined' ? {} : spec;
        const data = newSpec?.data ?? [];
        const index = data.findIndex((ds) => ds.name == name);
        const patchedData =
            index >= 0
                ? [
                      ...newSpec.data.slice(0, index),
                      ...[
                          {
                              ...newSpec.data[index],
                              values
                          }
                      ],
                      ...newSpec.data.slice(index + 1)
                  ]
                : [
                      ...(newSpec.data ?? []),
                      ...[
                          {
                              name,
                              values
                          }
                      ]
                  ];
        return patchedData;
    } catch (e) {
        return [{ name, values }];
    }
};

/**
 * Merge the Vega spec and dataset values together.
 * @privateRemarks We've found some issues with react-vega, where if we supply
 * the dataset separately, we have a number of errors that don't take place if
 * we include the data directly (like we might normally do in a tool like Vega
 * Editor), so we do this here. We don;t do this in `getPatchedVegaSpec`, as
 * this creates too much overhead when parsing the spec.
 */
const getPatchedVegaSpecWithData = (
    spec: Vega.Spec,
    values: DatasetValueRow[]
) => {
    logTimeStart('getPatchedVegaSpecWithData');
    logDebug('getPatchedVegaSpecWithData', { spec, values });
    const merged = Object.assign(spec || {}, {
        data: getPatchedData(spec, values)
    });
    logTimeEnd('getPatchedVegaSpecWithData');
    return merged;
};

/**
 * Merge the Vega-Lite spec and dataset values together.
 * @privateRemarks We've found some issues with react-vega, where if we supply
 * the dataset separately, we have a number of errors that don't take place if
 * we include the data directly (like we might normally do in a tool like Vega
 * Editor), so we do this here. We don't do this in `getPatchedVegaLiteSpec`,
 * as this creates too much overhead when parsing the spec.
 */
const getPatchedVegaLiteSpecWithData = (
    spec: VegaLite.TopLevelSpec,
    values: DatasetValueRow[]
): any => {
    logTimeStart('getPatchedVegaLiteSpecWithData');
    const datasets = {
        ...(spec?.datasets ?? {}),
        [`${DATASET_DEFAULT_NAME}`]: values
    };
    const merged = Object.assign(spec || {}, {
        datasets
    });
    logTimeEnd('getPatchedVegaLiteSpecWithData');
    return merged;
};

export const getSpecificationForVisual = () => {
    const {
        dataset: { values },
        specification: { spec },
        visualSettings: {
            vega: {
                output: {
                    provider: { value: provider }
                }
            }
        }
    } = getState();
    /**
     * #369: if we don't clone values to a unique object, they get mutated in
     * the store and this breaks the dataset until we re-initialize.
     */
    const specValues = cloneDeep(values); // structuredClone doesn't work as intended here, so investigate later once we have sorted selectors out
    switch (provider) {
        case 'vega':
            return <Vega.Spec>(
                getPatchedVegaSpecWithData(<Vega.Spec>spec, specValues)
            );
        case 'vegaLite':
            return <VegaLite.TopLevelSpec>(
                getPatchedVegaLiteSpecWithData(
                    <VegaLite.TopLevelSpec>spec,
                    specValues
                )
            );
    }
};

/**
 * Determine if the current spec is 'unversioned', meaning that it's the same
 * as the default properties.
 */
export const isUnversionedSpec = () => !isNewSpec() && !isVersionedSpec();

/**
 * In order to determine if our current spec/config is the same as the default properties, indicating that
 */
const isNewSpec = () => {
    const defaults = DEFAULTS.vega;
    const {
        vega: {
            output: {
                jsonSpec: { value: jsonSpec },
                jsonConfig: { value: jsonConfig }
            }
        }
    } = getVisualSettings();
    return jsonSpec === defaults.jsonSpec && jsonConfig === defaults.jsonConfig;
};

/**
 * Determine if a visual is 'versioned' based on persisted properties.
 */
const isVersionedSpec = () => {
    const {
        visualSettings: {
            developer: {
                versioning: {
                    version: { value: denebVersion }
                }
            },
            vega: {
                output: {
                    version: { value: providerVersion }
                }
            }
        }
    } = getState();
    return (denebVersion && providerVersion) || false;
};
