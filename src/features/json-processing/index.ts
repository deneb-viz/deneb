import cloneDeep from 'lodash/cloneDeep';

import { getI18nValue } from '../i18n';
import { logTimeEnd, logTimeStart } from '../logging';
import {
    IDenebJsonProcessingWorkerRequest,
    IDenebRemapResponseMessage,
    IDenebTokenizationResponseMessage,
    IDenebTrackingResponseMessage,
    JSON_MAX_PRUNE_DEPTH,
    TrackedFields,
    UsermetaDatasetField
} from '@deneb-viz/core-dependencies';
import {
    stringToUint8Array,
    uint8ArrayToString
} from '@deneb-viz/utils/type-conversion';
import { doDenebSpecJsonWorkerRequest } from '@deneb-viz/worker-common';
import { getState } from '../../store';
import { getRemapEligibleFields } from '@deneb-viz/json-processing';
import {
    getTokenPatternsLiteral,
    getTokenPatternsReplacement
} from '@deneb-viz/json-processing/field-tracking';

export { getObjectFormattedAsText } from './formatting';

/**
 * Prune an object at a specified level of depth.
 */
export const getPrunedObject = (
    json: object,
    maxDepth = JSON_MAX_PRUNE_DEPTH
) => {
    logTimeStart('getPrunedObject clone');
    const newObj = cloneDeep(json);
    logTimeEnd('getPrunedObject clone');
    logTimeStart('getPrunedObject prune');
    const pruned = JSON.parse(stringifyPruned(newObj, maxDepth));
    logTimeEnd('getPrunedObject prune');
    return pruned;
};

/**
 * Take the current spec and tracked fields, and asynchronously update the tokenization info via another thread (using
 * the necessary web worker).
 */
export const updateFieldTokenization = async (
    specification: string,
    trackedFieldsCurrent: TrackedFields,
    isRemap = false
) => {
    const {
        fieldUsage: { applyTokenizationChanges },
        interface: { setIsTokenizingSpec }
    } = getState();
    setIsTokenizingSpec(true);
    const request: IDenebJsonProcessingWorkerRequest = {
        type: 'tokenization',
        payload: {
            spec: stringToUint8Array(specification),
            trackedFields: trackedFieldsCurrent,
            supplementaryReplacers: getTokenPatternsReplacement(),
            isRemap
        }
    };
    const tokenized = <IDenebTokenizationResponseMessage>(
        await doDenebSpecJsonWorkerRequest(request)
    );
    const { spec } = tokenized.payload;
    applyTokenizationChanges({ tokenizedSpec: uint8ArrayToString(spec) });
};

/**
 * Take the current spec and tracked fields, and asynchronously update the tracking info via another thread (using
 * the necessary web worker).
 */
export const updateFieldTracking = async (
    specification: string,
    trackedFieldsCurrent: TrackedFields,
    reset = false
) => {
    const {
        dataset: { fields, hasDrilldown },
        fieldUsage: { applyTrackingChanges },
        interface: { setIsTrackingFields }
    } = getState();
    setIsTrackingFields(true);
    const request: IDenebJsonProcessingWorkerRequest = {
        type: 'tracking',
        payload: {
            spec: stringToUint8Array(specification),
            fields,
            hasDrilldown,
            trackedFieldsCurrent,
            supplementaryPatterns: getTokenPatternsLiteral(),
            reset
        }
    };
    const tracking = <IDenebTrackingResponseMessage>(
        await doDenebSpecJsonWorkerRequest(request)
    );
    const { trackedFields, trackedDrilldown } = tracking.payload;
    const remapFields = getRemapEligibleFields(trackedFields);
    applyTrackingChanges({
        trackedFields,
        trackedDrilldown,
        remapFields
    });
};

/**
 * Take a tokenized specification, tracked fields, and desired remapping information, and asynchronously update the
 * specification via another thread (using the necessary web worker).
 */
export const getRemappedSpecification = async (
    tokenizedSpecification: string,
    remapFields: UsermetaDatasetField[],
    trackedFields: TrackedFields
) => {
    const request: IDenebJsonProcessingWorkerRequest = {
        type: 'remapping',
        payload: {
            spec: stringToUint8Array(tokenizedSpecification),
            remapFields,
            trackedFields
        }
    };
    const remapped = <IDenebRemapResponseMessage>(
        await doDenebSpecJsonWorkerRequest(request)
    );
    return uint8ArrayToString(remapped.payload.spec);
};

/**
 * Create a stringified representation of an object, pruned at a specified
 * level of depth.
 */
export const stringifyPruned = (
    json: object,
    maxDepth = JSON_MAX_PRUNE_DEPTH
) => JSON.stringify(json, prune(maxDepth));

/**
 * For a given object, prune at the specified level of depth. Borrowed and
 * adapted from vega-tooltip.
 */
const prune = (maxDepth = JSON_MAX_PRUNE_DEPTH) => {
    const stack: any[] = [];
    return function (this: any, key: string, value: any) {
        if (value === undefined) {
            return 'undefined';
        }
        if (value === null) {
            return 'null';
        }
        if (typeof value !== 'object') {
            return value;
        }
        const pos = stack.indexOf(this) + 1;
        stack.length = pos;
        /**
         * We're hitting memory limits when we try to stringify the dataflow,
         * as it contains the scenegraph (#352). We manually remove this from
         * our object to avoid this.
         */
        if (key === 'dataflow') {
            delete value._scenegraph;
        }
        if (stack.length > maxDepth) {
            return getI18nValue('Table_Placeholder_Object');
        }
        if (stack.indexOf(value) >= 0) {
            return getI18nValue('Table_Placeholder_Circular');
        }
        stack.push(value);
        return value;
    };
};
