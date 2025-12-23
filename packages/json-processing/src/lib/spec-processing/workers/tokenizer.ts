import {
    type IDenebTokenizationRequestPayload,
    type IDenebTokenizationResponsePayload
} from './types';
import {
    uint8ArrayToString,
    stringToUint8Array
} from '@deneb-viz/utils/type-conversion';
import {
    Node,
    applyEdits,
    findNodeAtLocation,
    getNodeValue,
    modify,
    parseTree
} from 'jsonc-parser';
import {
    getEscapedReplacerPattern,
    FIELD_TRACKING_METADATA_PLACEHOLDER,
    FIELD_TRACKING_TOKEN_PLACEHOLDER,
    type FieldPatternReplacer
} from '@deneb-viz/data-core/field';

/**
 * For the supplied text-based specification, process it as a JSON AST and traverse it, replacing all field names with
 * placeholders. Returns the updated specification with placeholders based on the tracking information.
 */
export const getTokenizedSpec = (
    options: IDenebTokenizationRequestPayload
): IDenebTokenizationResponsePayload => {
    const spec = uint8ArrayToString(options.spec);
    const { trackedFields, isRemap = false, supplementaryReplacers } = options;
    let updatedSpec = spec;
    Object.entries(trackedFields).forEach(([, v]) => {
        v.paths.forEach((p) => {
            const tree = <Node>parseTree(updatedSpec);
            const node = <Node>findNodeAtLocation(tree, p);
            let value = getNodeValue(node);
            const fieldName = isRemap
                ? v.templateMetadata.name
                : v.templateMetadataOriginal.name;
            const replacers = getTokenPatternsReplacement(
                fieldName,
                v.placeholder,
                supplementaryReplacers
            );
            replacers.forEach((r) => {
                value = value.replaceAll(
                    new RegExp(r.pattern, 'g'),
                    r.replacer
                );
            });
            const editResult = modify(updatedSpec, p, value, {});
            updatedSpec = applyEdits(updatedSpec, editResult);
        });
    });
    return { spec: stringToUint8Array(updatedSpec) };
};

/**
 * When performing a replacement of a field name with a placeholder, whilst we are walking the JSON spec as an AST (and
 * most regular assignments are easy to evaluate when they are properties), we still need to handle expression fields.
 * This provides suitable Regex patterns and replacements for all conditions in a spec for field replacement.
 */
const getTokenPatternsReplacement = (
    fieldName: string,
    placeholder: string,
    supplementaryReplacers: FieldPatternReplacer[]
) => {
    const namePattern = getEscapedReplacerPattern(fieldName);
    const replacers = supplementaryReplacers.map((r) => ({
        pattern: r.pattern.replaceAll(
            FIELD_TRACKING_TOKEN_PLACEHOLDER,
            namePattern
        ),
        replacer: r.replacer.replaceAll(
            FIELD_TRACKING_METADATA_PLACEHOLDER,
            placeholder
        )
    }));
    return [
        {
            pattern: `^(${namePattern})$`,
            replacer: `${placeholder}`
        },
        ...replacers
    ];
};
