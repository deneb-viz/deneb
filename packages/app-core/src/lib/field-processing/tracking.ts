import { type TrackedFields } from '@deneb-viz/json-processing/field-tracking';
import {
    doDenebSpecJsonWorkerRequest,
    type IDenebJsonProcessingWorkerRequest,
    type IDenebTrackingResponseMessage
} from '@deneb-viz/json-processing/spec-processing';
import { stringToUint8Array } from '@deneb-viz/utils/type-conversion';
import { getRemapEligibleFields } from '@deneb-viz/json-processing';
import { getDenebState } from '../../state';
import { getTokenPatternsLiteral } from '@deneb-viz/data-core/field';

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
        dataset: { fields },
        fieldUsage: { applyTrackingChanges },
        interface: { setIsTrackingFields }
    } = getDenebState();
    setIsTrackingFields(true);
    const hasDrilldown = false;
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
