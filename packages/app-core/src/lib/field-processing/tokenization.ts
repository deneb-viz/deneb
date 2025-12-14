import {
    getTokenPatternsReplacement,
    type TrackedFields
} from '@deneb-viz/json-processing/field-tracking';
import {
    type IDenebTokenizationResponseMessage,
    type IDenebJsonProcessingWorkerRequest,
    doDenebSpecJsonWorkerRequest,
    type IDenebRemapResponseMessage
} from '@deneb-viz/json-processing/spec-processing';
import {
    stringToUint8Array,
    uint8ArrayToString
} from '@deneb-viz/utils/type-conversion';
import { getDenebState } from '../../state';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

/**
 * Take a tokenized specification, tracked fields, and desired remapping information, and asynchronously update the
 * specification via another thread (using the necessary web worker).
 */
export const getRemappedSpecification = async (
    tokenizedSpecification: string | null,
    remapFields: UsermetaDatasetField[],
    trackedFields: TrackedFields
) => {
    const request: IDenebJsonProcessingWorkerRequest = {
        type: 'remapping',
        payload: {
            spec: stringToUint8Array(tokenizedSpecification ?? ''),
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
    } = getDenebState();
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
