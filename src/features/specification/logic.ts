import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';

import { getState } from '../../store';
import { getVegaSettings } from '../../core/vega';

import { type EditorPaneRole, monaco } from '@deneb-viz/app-core';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';
import { SpecificationComparisonOptions } from '@deneb-viz/json-processing/spec-processing';
import { type DatasetValueRow } from '@deneb-viz/dataset/datum';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import {
    persistProperties,
    resolveObjectProperties
} from '@deneb-viz/powerbi-compat/visual-host';

/**
 * For a given operation and string input, ensure that it's trimmed and replaced with suitable defaults if empty.
 */
const cleanJsonInputForPersistence = (
    operation: EditorPaneRole,
    input: string
): string => {
    const clean = input?.trim() || '';
    if (clean === '') {
        switch (operation) {
            case 'Spec':
                return DEFAULTS.vega.jsonSpec;
            case 'Config':
                return DEFAULTS.vega.jsonConfig;
        }
    }
    return clean;
};

/**
 * Further abstracts the `cleanJsonInputForPersistence` workflow so that calling functions are easier to follow.
 */
export const getCleanEditorJson = (
    role: EditorPaneRole,
    editor: monaco.editor.IStandaloneCodeEditor
) => cleanJsonInputForPersistence(role, editor?.getValue());

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
    const specValues = cloneDeep(values);
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
 * Looks at the active specification and config in the visual editors and
 * compares with persisted values in the visual properties. Used to set
 * the `isDirty` flag in the store.
 */
export const hasLiveSpecChanged = (
    specEditor: monaco.editor.IStandaloneCodeEditor,
    configEditor: monaco.editor.IStandaloneCodeEditor
) => {
    const {
            output: {
                jsonSpec: { value: jsonSpec },
                jsonConfig: { value: jsonConfig }
            }
        } = getVegaSettings(),
        liveSpec = getCleanEditorJson('Spec', specEditor),
        liveConfig = getCleanEditorJson('Config', configEditor);
    return liveSpec != jsonSpec || liveConfig != jsonConfig;
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
        jsonSpec: { value: jsonSpec },
        jsonConfig: { value: jsonConfig }
    } = getVegaSettings().output;
    return jsonSpec === defaults.jsonSpec && jsonConfig === defaults.jsonConfig;
};

/**
 * We only need to parse a specification if key information changes between
 * events. This is a simple equality check against that key information.
 *
 * @privateRemarks current events where a spec may need to be checked and re-
 * parsed if necessary are:
 *  - dataset updated (in dataset slice)
 *  - dataset selectors updated (in dataset slice)
 *  - visual properties change during update (spec, config, provider, viewport)
 *      and dataset has been processed
 */
export const isSpecificationVolatile = (
    prev: SpecificationComparisonOptions,
    next: SpecificationComparisonOptions
) => {
    const omitList = ['datasetHash', 'values'];
    const newPrev = omit(prev, omitList);
    const newNext = omit(next, omitList);
    logDebug('isSpecificationVolatile', { newPrev, newNext });
    return !isEqual(newPrev, newNext);
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

/**
 * Resolve the spec/config and use the `properties` API for persistence. Also
 * resets the `isDirty` flag in the store.
 */
export const persistSpecification = (
    specEditor: monaco.editor.IStandaloneCodeEditor,
    configEditor: monaco.editor.IStandaloneCodeEditor,
    stage = true
) => {
    const {
        editor: { stagedConfig, stagedSpec, updateChanges },
        fieldUsage: { dataset: trackedFieldsCurrent },
        visualSettings: {
            vega: {
                output: {
                    jsonConfig: { value: jsonConfig },
                    jsonSpec: { value: jsonSpec }
                }
            }
        }
    } = getState();
    const spec =
        (stage ? getCleanEditorJson('Spec', specEditor) : stagedSpec) ??
        jsonSpec;
    const config =
        (stage ? getCleanEditorJson('Config', configEditor) : stagedConfig) ??
        jsonConfig;
    // Tracking is now only used for export (#486)
    // updateFieldTracking(spec, trackedFieldsCurrent);
    updateChanges({ role: 'Spec', text: spec });
    updateChanges({ role: 'Config', text: config });
    persistProperties(
        resolveObjectProperties([
            {
                objectName: 'vega',
                properties: [
                    { name: 'jsonSpec', value: spec },
                    { name: 'jsonConfig', value: config }
                ]
            }
        ])
    );
};
