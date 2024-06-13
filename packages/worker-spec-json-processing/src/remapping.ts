import forEach from 'lodash/forEach';
import {
    Node,
    applyEdits,
    findNodeAtLocation,
    getNodeValue,
    modify,
    parseTree
} from 'jsonc-parser';
import {
    IDenebRemapRequestPayload,
    IDenebRemapResponsePayload,
    utils
} from '@deneb-viz/core-dependencies';

/**
 * For the supplied tokenized specification and re-mapping information, traverse all re-mapping fields needed and
 * replace the placeholder with the supplied object name.
 */
export const getRemappedSpecification = (
    options: IDenebRemapRequestPayload
): IDenebRemapResponsePayload => {
    let spec = utils.uint8ArrayToString(options.spec);
    const { remapFields, trackedFields } = options;
    forEach(remapFields, (field) => {
        const source = trackedFields[field.key];
        forEach(source?.paths || [], (p) => {
            const tree = parseTree(spec) as Node;
            const node = findNodeAtLocation(tree, p) as Node;
            const value = getNodeValue(node);
            const newValue = value.replaceAll(
                source?.placeholder ?? '',
                field.suppliedObjectName
            );
            const edit = modify(spec, p, newValue, {});
            spec = applyEdits(spec, edit);
        });
    });
    return { spec: utils.stringToUint8Array(spec) };
};
