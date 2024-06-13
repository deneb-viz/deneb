import {
    IDenebTokenizationRequestPayload,
    IDenebTokenizationResponsePayload,
    JSON_FIELD_TRACKING_METADATA_PLACEHOLDER,
    JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER,
    TokenPatternReplacer,
    dataset,
    utils
} from '@deneb-viz/core-dependencies';
import {
    Node,
    applyEdits,
    findNodeAtLocation,
    getNodeValue,
    modify,
    parseTree
} from 'jsonc-parser';
import forEach from 'lodash/forEach';

/**
 * For the supplied text-based specification, process it as a JSON AST and traverse it, replacing all field names with
 * placeholders. Returns the updated specification with placeholders based on the tracking information.
 */
export const getTokenizedSpec = (
    options: IDenebTokenizationRequestPayload
): IDenebTokenizationResponsePayload => {
    const spec = utils.uint8ArrayToString(options.spec);
    const { trackedFields, isRemap = false, supplementaryReplacers } = options;
    let updatedSpec = spec;
    forEach(trackedFields, (v) => {
        forEach(v.paths, (p) => {
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
            forEach(replacers, (r) => {
                value = value.replaceAll(
                    new RegExp(r.pattern, 'g'),
                    r.replacer
                );
            });
            const editResult = modify(updatedSpec, p, value, {});
            updatedSpec = applyEdits(updatedSpec, editResult);
        });
    });
    return { spec: utils.stringToUint8Array(updatedSpec) };
};

/**
 * When performing a replacement of a field name with a placeholder, whilst we are walking the JSON spec as an AST (and
 * most regular assignments are easy to evaluate when they are properties), we still need to handle expression fields.
 * This provides suitable Regex patterns and replacements for all conditions in a spec for field replacement.
 */
const getTokenPatternsReplacement = (
    fieldName: string,
    placeholder: string,
    supplementaryReplacers: TokenPatternReplacer[]
) => {
    const namePattern = dataset.getEscapedReplacerPattern(fieldName);
    const replacers = supplementaryReplacers.map((r) => ({
        pattern: r.pattern.replaceAll(
            JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER,
            namePattern
        ),
        replacer: r.replacer.replaceAll(
            JSON_FIELD_TRACKING_METADATA_PLACEHOLDER,
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
