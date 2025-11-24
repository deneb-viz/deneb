import {
    stringToUint8Array,
    uint8ArrayToString
} from '@deneb-viz/utils/type-conversion';
import {
    doDenebSpecJsonWorkerRequest,
    type IDenebJsonProcessingWorkerRequest,
    type IDenebRemapResponseMessage,
    type IDenebTokenizationResponseMessage,
    type IDenebTrackingResponseMessage
} from '@deneb-viz/json-processing/spec-processing';
import { getState } from '../../store';
import { getRemapEligibleFields } from '@deneb-viz/json-processing';
import {
    getTokenPatternsLiteral,
    getTokenPatternsReplacement,
    type TrackedFields
} from '@deneb-viz/json-processing/field-tracking';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

export { getObjectFormattedAsText } from './formatting';

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
