import {
    IDataset,
    IDatasetField,
    IFieldUsageSliceProperties,
    TrackedDrilldownProperties,
    TrackedFieldCandidates,
    TrackedFieldProperties,
    TrackedFields,
    UsermetaDatasetField,
    utils
} from '@deneb-viz/core-dependencies';
import { getPowerBiTokenPatternsLiteral, getPowerBiTokenPatternsReplacement } from '@deneb-viz/integration-powerbi';
import { Node, applyEdits, findNodeAtLocation, getNodeValue, modify, parseTree, visit } from 'jsonc-parser';
import { parseExpression } from 'vega';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import merge from 'lodash/merge';
import reduce from 'lodash/reduce';
import values from 'lodash/values';
import { JSONPath } from 'jsonpath-plus';
import { Dictionary } from 'lodash';
import {
    areAllTemplateFieldsAssigned
} from './template-dataset';

/**
 * Confirms that all requirements for field mapping have been met.
 */
export const areAllRemapDataRequirementsMet = (options: {
    remapFields: UsermetaDatasetField[];
    drilldownProperties?: TrackedDrilldownProperties;
}): Partial<IFieldUsageSliceProperties> => {
    const remapAllFieldsAssigned = areAllTemplateFieldsAssigned(options.remapFields);
    const remapDrilldownAssigned = !options.drilldownProperties?.isMappingRequired;
    const remapAllDependenciesAssigned = remapAllFieldsAssigned && remapDrilldownAssigned;
    return {
        remapAllFieldsAssigned,
        remapDrilldownAssigned,
        remapAllDependenciesAssigned
    };
};

/**
 * For a Vega expression AST node, check if it has an occurrence of a field from the visual dataset.
 */
export const doesExpressionContainField = (json: object, fieldName: string) => {
    let found = false;
    JSONPath({
        json,
        path: '$..*',
        callback: (value, parentValue, context) => {
            if (found) return;
            found =
                (context.value?.type === 'Identifier' && doesLiteralContainField(context.value?.value, fieldName)) ||
                (context.value?.type === 'Literal' && doesLiteralContainField(context.value?.value, fieldName));
        }
    });
    return found;
};

/**
 * For a supplied literal from either a JSON AST or a Vega expression AST, check if it contains a field from the visual
 * dataset. This matches on an array of patterns that denote wehter a literal is a field or not - defined by
 * {@linkcode getTokenPatternsLiteral}.
 */
const doesLiteralContainField = (literal: string, fieldName: string) => {
    if (!isLiteralEligibleForTesting(literal)) return false;
    let found = false;
    if (literal === fieldName) return true;
    forEach(getTokenPatternsLiteral(fieldName), (pattern) => {
        const re = getFieldExpression(pattern);
        if (re.test(literal)) {
            found = true;
        }
    });
    return found;
};

/**
 * Produces a simple RegExp pattern for matching drilldown field usage.
 * TODO: should probably be in the Power BI-specific module.
 */
export const getDrilldownFieldExpression = () => new RegExp(`(__drilldown(_flat)?__)`);

/**
 * Logic to create a global matching RegEx for a supplied string-based expression.
 */
const getFieldExpression = (exp: string) => new RegExp(exp, 'g');

/**
 * Get the full RegEx pattern for a field placeholder.
 */
export const getFieldPattern = (index: number) =>
    getFieldExpression(utils.getEscapedReplacerPattern(getJsonPlaceholderKey(index)));

/**
 * For a given specification and fields that we should track, return an updated `TrackedFields` object that contains
 * the JSON paths for all fields that are  in use in the specification. Fields from the that are not in use from the
 * dataset will still be in the list, but flagged as not in use.
 */
export const getFieldsInUseFromSpecification = (options: {
    spec: string;
    dataset: IDataset;
    trackedFieldsCurrent: TrackedFields;
    reset?: boolean;
}) => {
    const { spec, dataset, trackedFieldsCurrent, reset = false } = options;
    const datasetFields = utils.getDatasetFieldsInclusive(dataset.fields);
    const trackedFields: TrackedFields = {};
    const trackedDrilldown: TrackedDrilldownProperties = {
        isCurrent: dataset.hasDrilldown,
        isMappingRequired: false
    };
    const fieldMapMerged = getTrackedFieldMapMerged(
        getTrackedFieldMapExisting(trackedFieldsCurrent),
        getTrackedFieldMapCurrent(datasetFields, trackedFieldsCurrent, reset)
    );
    visit(spec || '', {
        onLiteralValue(value, offset, length, startLine, startCharacter, pathSupplier) {
            // Dataset field tracking
            let fieldIndex = 0;
            map(fieldMapMerged, (f) => {
                const templateMetadata = f.templateMetadata as UsermetaDatasetField;
                const templateMetadataOriginal = f.templateMetadataOriginal as UsermetaDatasetField;
                const { key } = templateMetadata;
                const tracking: TrackedFieldProperties = trackedFields[key] || {
                    placeholder: getJsonPlaceholderKey(fieldIndex),
                    paths: [],
                    isInDataset: f.isCurrent,
                    isInSpecification: false,
                    isMappingRequired: false,
                    templateMetadata,
                    templateMetadataOriginal
                };
                const isExpression = isExpressionField(value);
                const isLiteralMatch = doesLiteralContainField(value, templateMetadata.name);
                const isLiteralMatchOriginal = doesLiteralContainField(value, templateMetadataOriginal.name);
                const isExpressionMatch =
                    isExpression && doesExpressionContainField(parseExpression(value), templateMetadata.name);
                const isExpressionMatchOriginal =
                    isExpression && doesExpressionContainField(parseExpression(value), templateMetadataOriginal.name);
                if (isLiteralMatch || isLiteralMatchOriginal || isExpressionMatch || isExpressionMatchOriginal) {
                    tracking.paths.push(pathSupplier());
                    tracking.isInSpecification = tracking.paths.length > 0;
                    tracking.isMappingRequired =
                        tracking.paths.length > 0 &&
                        (!f.isCurrent || templateMetadata.name !== templateMetadataOriginal.name);
                }
                const isIncluded = f.isCurrent || tracking.paths.length > 0;
                if (isIncluded) {
                    trackedFields[key] = tracking;
                }
                fieldIndex++;
            });
            // Drilldown tracking
            trackedDrilldown.isMappingRequired =
                trackedDrilldown.isMappingRequired ||
                (!trackedDrilldown.isCurrent && getDrilldownFieldExpression().test(value)) ||
                false;
        }
    });
    return {
        trackedFields,
        trackedDrilldown
    };
};

/**
 * Consistently format a supplied identity into a suitable placeholder. Placeholders are used to represent dataset
 * fields in the specification, so that they can be replaced with the actual values when the dataset is accessible.
 * - Decimal values are floored to the nearest integer.
 * - Negative values are converted to positive values.
 */
export const getJsonPlaceholderKey = (i: number) => `__${Math.floor(Math.abs(i))}__`;

/**
 * From the tracked fields, get those that are in the specification, and therefore eligible for re-mapping.
 */
export const getRemapEligibleFields = (fields: TrackedFields): UsermetaDatasetField[] =>
    reduce(
        fields,
        (result, value) =>
            value.isInSpecification
                ? result.concat({
                      ...value.templateMetadata,
                      name: value.templateMetadataOriginal.name,
                      namePlaceholder: value.templateMetadataOriginal.name,
                      suppliedObjectKey: value.isMappingRequired ? undefined : value.templateMetadata.key,
                      suppliedObjectName: value.isMappingRequired ? undefined : value.templateMetadata.name
                  })
                : result,
        <UsermetaDatasetField[]>[]
    ).sort((a, b) => (a.name?.toLowerCase() < b.name?.toLowerCase() ? -1 : 1));

/**
 * For the supplied tokenized specification and re-mapping information, traverse all re-mapping fields needed and
 * replace the placeholder with the supplied object name.
 */
export const getRemappedSpecification = (options: {
    specification: string;
    remapFields: UsermetaDatasetField[];
    trackedFields: TrackedFields;
}) => {
    const { remapFields, trackedFields } = options;
    let { specification } = options;
    forEach(remapFields, (field) => {
        const source = trackedFields[field.key];
        forEach(source?.paths || [], (p) => {
            const tree = parseTree(specification) as Node;
            const node = findNodeAtLocation(tree, p) as Node;
            const value = getNodeValue(node);
            const newValue = value.replaceAll(source?.placeholder ?? '', field.suppliedObjectName);
            const edit = modify(specification, p, newValue, {});
            specification = applyEdits(specification, edit);
        });
    });
    return specification;
};

/**
 * Ensure that we keep track of the correct template metadata for a field so that we can verify whether it's changed.
 * The `reset` property should be set after mapping has occurred so that we track from the correct field.
 */
const getTemplateMetadataOriginal = (trackedFields: TrackedFields, field: UsermetaDatasetField, reset = false) =>
    reset ? field : trackedFields[field.key]?.templateMetadataOriginal ?? field;

/**
 * For the supplied text-based specification, process it as a JSON AST and traverse it, replacing all field names with
 * placeholders. Returns the updated specification with placeholders based on the tracking information.
 */
export const getTokenizedSpec = (options: { textSpec: string; trackedFields: TrackedFields; isRemap?: boolean }) => {
    const { textSpec, trackedFields, isRemap = false } = options;
    let updatedSpec = textSpec;
    forEach(trackedFields, (v) => {
        forEach(v.paths, (p) => {
            const tree = <Node>parseTree(updatedSpec);
            const node = <Node>findNodeAtLocation(tree, p);
            let value = getNodeValue(node);
            const replacers = getTokenPatternsReplacement(
                isRemap ? v.templateMetadata.name : v.templateMetadataOriginal.name,
                v.placeholder
            );
            forEach(replacers, (r) => {
                value = value.replaceAll(getFieldExpression(r.pattern), r.replacer);
            });
            const editResult = modify(updatedSpec, p, value, {});
            updatedSpec = applyEdits(updatedSpec, editResult);
        });
    });
    return updatedSpec;
};

/**
 * For a literal field name (i.e., an extracted property value from a JSON or Vega expression AST), returns an array of
 * RegEx patterns that can be used to test that the literal matches the given field name (allowing for field modifiers
 * such as highlights).
 * @privateRemarks
 * The Power BI-specific replacement should be injected as a dependency, but for now we will just import it directly.
 */
const getTokenPatternsLiteral = (fieldName: string) => {
    const namePattern = utils.getEscapedReplacerPattern(fieldName);
    return [`(^${namePattern}$)`, ...getPowerBiTokenPatternsLiteral(fieldName)];
};

/**
 * When performing a replacement of a field name with a placeholder, whilst we are walking the JSON spec as an AST (and
 * most regular assignments are easy to evaluate when they are properties), we still need to handle expression fields.
 * This provides suitable Regex patterns and replacements for all conditions in a spec for field replacement.
 * @privateRemarks
 * The Power BI-specific replacement should be injected as a dependency, but for now we will just import it directly.
 */
const getTokenPatternsReplacement = (fieldName: string, placeholder: string) => {
    const namePattern = utils.getEscapedReplacerPattern(fieldName);
    return [
        {
            pattern: `^(${namePattern})$`,
            replacer: `${placeholder}`
        },
        ...getPowerBiTokenPatternsReplacement(fieldName, placeholder)
    ];
};

/**
 * For the current dataset fields, return an object that maps field names to a `TrackedFieldCandidate`, flagging that
 * they are in the current dataset.
 */
const getTrackedFieldMapCurrent = (
    datasetFields: Dictionary<IDatasetField>,
    trackedFields: TrackedFields,
    reset = false
): TrackedFieldCandidates =>
    reduce(
        values(datasetFields),
        (acc, v) => {
            const templateMetadata = v.templateMetadata as UsermetaDatasetField;
            acc[templateMetadata.key] = {
                isCurrent: true,
                templateMetadata: v.templateMetadata,
                templateMetadataOriginal: getTemplateMetadataOriginal(trackedFields, templateMetadata, reset)
            };
            return acc;
        },
        <TrackedFieldCandidates>{}
    );

/**
 * For a `TrackedFields` object, return an array of all fields that are flagged as present in the specification. Flag
 * these as being in the specification previously also, so that we can identify them as being eligible for re-mapping
 * if they are subsequently not in the dataset.
 */
const getTrackedFieldMapExisting = (trackedFields: TrackedFields): TrackedFieldCandidates => {
    const reduction = values(trackedFields).filter((v) => v.isInSpecification);
    return reduce(
        reduction,
        (acc, v) => {
            acc[v.templateMetadata.key] = {
                isCurrent: false,
                templateMetadata: v.templateMetadata,
                templateMetadataOriginal: getTemplateMetadataOriginal(trackedFields, v.templateMetadata)
            };
            return acc;
        },
        {} as TrackedFieldCandidates
    );
};

/**
 * For previous and current field candidate maps, get a merged object that should be used for testing against the
 * specification.
 */
export const getTrackedFieldMapMerged = (
    fieldMapPrev: TrackedFieldCandidates,
    fieldMapCurrent: TrackedFieldCandidates
) => merge(fieldMapPrev, fieldMapCurrent);

/**
 * Tests the supplied string to see if it evaluates as a valid Vega expression.
 */
export const isExpressionField = (detail: string) => {
    if (!isLiteralEligibleForTesting(detail)) return false;
    try {
        const node = parseExpression(detail);
        return node?.type?.indexOf('Expression') > -1;
    } catch {
        return false;
    }
};

/**
 * When processing JSON, we can waste valuable time/resources checking literals for fields that aren't eligible. This
 * methods validates that the literal is worth checking further.
 */
const isLiteralEligibleForTesting = (value: string) => utils.isString(value) && value?.length > 0;

/**
 * Test to see if the tracking information contains and fields that require mapping (which should trigger the mapping
 * modal dialog).
 */
export const isMappingDialogRequired = (options: {
    trackedFields: TrackedFields;
    drilldownProperties?: TrackedDrilldownProperties;
}) =>
    values(options.trackedFields).filter((v) => v.isMappingRequired).length > 0 ||
    options.drilldownProperties?.isMappingRequired;
