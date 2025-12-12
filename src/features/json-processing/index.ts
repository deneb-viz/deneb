import {
    stringToUint8Array,
    uint8ArrayToString
} from '@deneb-viz/utils/type-conversion';
import {
    doDenebSpecJsonWorkerRequest,
    type IDenebJsonProcessingWorkerRequest,
    type IDenebRemapResponseMessage
} from '@deneb-viz/json-processing/spec-processing';
import { type TrackedFields } from '@deneb-viz/json-processing/field-tracking';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

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
