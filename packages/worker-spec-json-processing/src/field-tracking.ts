import {
    IDatasetField,
    IDenebTrackingRequestPayload,
    IDenebTrackingResponsePayload,
    TrackedDrilldownProperties,
    TrackedFieldCandidates,
    TrackedFieldProperties,
    TrackedFields,
    UsermetaDatasetField,
    getDatasetFieldsInclusive,
    getJsonPlaceholderKey,
    isBase64Image,
    merge
} from '@deneb-viz/core-dependencies';
import { JSONPath, visit } from 'jsonc-parser';
import { Dictionary } from 'lodash';
import { parseExpression } from 'vega-expression';
import { isString } from '@deneb-viz/utils/inspection';
import {
    getEscapedReplacerPattern,
    JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER
} from '@deneb-viz/json-processing/field-tracking';
import { uint8ArrayToString } from '@deneb-viz/utils/type-conversion';

/**
 * For a Vega expression AST node, check if it has an occurrence of a field from the visual dataset.
 */
export const doesExpressionContainField = (
    json: object,
    fieldName: string,
    supplementaryPatterns: string[]
) => {
    let found = false;
    JSON.stringify(json, (_, nestedValue) => {
        if (found) return;
        found =
            (nestedValue?.type === 'Identifier' &&
                doesLiteralContainField(
                    nestedValue?.value,
                    fieldName,
                    supplementaryPatterns
                )) ||
            (nestedValue?.type === 'Literal' &&
                doesLiteralContainField(
                    nestedValue?.value,
                    fieldName,
                    supplementaryPatterns
                ));
        return nestedValue;
    });
    return found;
};

/**
 * For a supplied literal from either a JSON AST or a Vega expression AST, check if it contains a field from the visual
 * dataset. This matches on an array of patterns that denote whether a literal is a field or not - defined by
 * {@linkcode getTokenPatternsLiteral}.
 */
const doesLiteralContainField = (
    literal: string,
    fieldName: string,
    supplementaryPatterns: string[]
) => {
    if (!isLiteralEligibleForTesting(literal)) return false;
    let found = false;
    if (literal === fieldName) return true;
    getTokenPatternsLiteral(fieldName, supplementaryPatterns).forEach(
        (pattern) => {
            const re = new RegExp(pattern, 'g');
            if (re.test(literal)) {
                found = true;
            }
        }
    );
    return found;
};

/**
 * Produces a simple RegExp pattern for matching drilldown field usage.
 * TODO: should probably be in the Power BI-specific module.
 */
export const getDrilldownFieldExpression = () =>
    new RegExp(`(__drilldown(_flat)?__)`);

/**
 * Ensure that we keep track of the correct template metadata for a field so that we can verify whether it's changed.
 * The `reset` property should be set after mapping has occurred so that we track from the correct field.
 */
const getTemplateMetadataOriginal = (
    trackedFields: TrackedFields,
    field: UsermetaDatasetField,
    reset = false
) =>
    reset
        ? field
        : (trackedFields[field.key]?.templateMetadataOriginal ?? field);

/**
 * For the current dataset fields, return an object that maps field names to a `TrackedFieldCandidate`, flagging that
 * they are in the current dataset.
 */
const getTrackedFieldMapCurrent = (
    datasetFields: Dictionary<IDatasetField>,
    trackedFields: TrackedFields,
    reset = false
): TrackedFieldCandidates =>
    Object.values(datasetFields).reduce(
        (acc, v) => {
            const templateMetadata = v.templateMetadata as UsermetaDatasetField;
            acc[templateMetadata.key] = {
                isCurrent: true,
                templateMetadata: v.templateMetadata,
                templateMetadataOriginal: getTemplateMetadataOriginal(
                    trackedFields,
                    templateMetadata,
                    reset
                )
            };
            return acc;
        },
        <TrackedFieldCandidates>{}
    );

/**
 * For a literal field name (i.e., an extracted property value from a JSON or Vega expression AST), returns an array of
 * RegEx patterns that can be used to test that the literal matches the given field name (allowing for field modifiers
 * such as highlights).
 */
const getTokenPatternsLiteral = (
    fieldName: string,
    supplementaryPatterns: string[]
) => {
    const namePattern = getEscapedReplacerPattern(fieldName);
    const replacers = supplementaryPatterns.map((p) =>
        p.replaceAll(JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER, namePattern)
    );
    return [`(^${namePattern}$)`, ...replacers];
};

/**
 * For a `TrackedFields` object, return an array of all fields that are flagged as present in the specification. Flag
 * these as being in the specification previously also, so that we can identify them as being eligible for re-mapping
 * if they are subsequently not in the dataset.
 */
const getTrackedFieldMapExisting = (
    trackedFields: TrackedFields
): TrackedFieldCandidates => {
    const reduction = Object.values(trackedFields).filter(
        (v) => v.isInSpecification
    );
    return reduction.reduce((acc, v) => {
        acc[v.templateMetadata.key] = {
            isCurrent: false,
            templateMetadata: v.templateMetadata,
            templateMetadataOriginal: getTemplateMetadataOriginal(
                trackedFields,
                v.templateMetadata
            )
        };
        return acc;
    }, {} as TrackedFieldCandidates);
};

export const getTrackingDataFromSpecification = (
    options: IDenebTrackingRequestPayload
): IDenebTrackingResponsePayload => {
    const spec = uint8ArrayToString(options.spec);
    const {
        hasDrilldown,
        fields,
        trackedFieldsCurrent,
        reset,
        supplementaryPatterns
    } = options;
    const datasetFields = <Dictionary<IDatasetField>>(
        getDatasetFieldsInclusive(fields)
    );
    const trackedFields: TrackedFields = {};
    const trackedDrilldown: TrackedDrilldownProperties = {
        isCurrent: hasDrilldown,
        isMappingRequired: false
    };
    const fieldMapMerged = getTrackedFieldMapMerged(
        getTrackedFieldMapExisting(trackedFieldsCurrent),
        getTrackedFieldMapCurrent(datasetFields, trackedFieldsCurrent, reset)
    );
    const pathsToAvoid: JSONPath[] = [];
    visit(spec || '', {
        onArrayBegin(offset, length, startLine, startCharacter, pathSupplier) {
            const path = pathSupplier();
            if (shouldAvoidPath(path, pathsToAvoid)) {
                return;
            }
            if (isExpensivePath(path)) {
                pathsToAvoid.push(path);
            }
        },
        onObjectBegin(offset, length, startLine, startCharacter, pathSupplier) {
            const path = pathSupplier();
            if (shouldAvoidPath(path, pathsToAvoid)) {
                return;
            }
            if (isExpensivePath(path)) {
                pathsToAvoid.push(path);
            }
        },
        onLiteralValue(
            value,
            offset,
            length,
            startLine,
            startCharacter,
            pathSupplier
        ) {
            const path = pathSupplier();
            if (shouldAvoidPath(path, pathsToAvoid)) {
                return;
            }
            // Dataset field tracking
            let fieldIndex = 0;
            const isExpression = isExpressionField(value);
            Object.entries(fieldMapMerged).forEach(([, f]) => {
                const templateMetadata =
                    f.templateMetadata as UsermetaDatasetField;
                const templateMetadataOriginal =
                    f.templateMetadataOriginal as UsermetaDatasetField;
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
                const isLiteralMatch = doesLiteralContainField(
                    value,
                    templateMetadata.name,
                    supplementaryPatterns
                );
                const isLiteralMatchOriginal = doesLiteralContainField(
                    value,
                    templateMetadataOriginal.name,
                    supplementaryPatterns
                );
                const isExpressionMatch =
                    isExpression &&
                    doesExpressionContainField(
                        parseExpression(value),
                        templateMetadata.name,
                        supplementaryPatterns
                    );
                const isExpressionMatchOriginal =
                    isExpression &&
                    doesExpressionContainField(
                        parseExpression(value),
                        templateMetadataOriginal.name,
                        supplementaryPatterns
                    );
                if (
                    isLiteralMatch ||
                    isLiteralMatchOriginal ||
                    isExpressionMatch ||
                    isExpressionMatchOriginal
                ) {
                    tracking.paths.push(pathSupplier());
                    tracking.isInSpecification = tracking.paths.length > 0;
                    tracking.isMappingRequired =
                        tracking.paths.length > 0 &&
                        (!f.isCurrent ||
                            templateMetadata.name !==
                                templateMetadataOriginal.name);
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
                (!trackedDrilldown.isCurrent &&
                    getDrilldownFieldExpression().test(value)) ||
                false;
        }
    });
    return {
        trackedFields,
        trackedDrilldown
    };
};

/**
 * A spec may contain known paterns that create a lot of JSON that doesn't need to be inspected for field tracking.
 * An example might be where geojson is inlined. These can be massive objects, but we know that fields can't be
 * included in their declaration, so we should avoid inspecting them. This method tests the path to see if it's a
 * candidate for avoiding inspection, so that we can take note of it for later on.
 */
export const isExpensivePath = (path: JSONPath) => {
    switch (true) {
        // Vega data[]/values constructor
        case path.length > 2 &&
            path[path.length - 1] === 'values' &&
            path[path.length - 3] === 'data':
            return true;
        // Vega-Lite data/values constructor
        case path.length > 1 &&
            path[path.length - 1] === 'values' &&
            path[path.length - 2] === 'data':
            return true;
        // Vega-Lite datasets
        case path.length > 0 && path[path.length - 1] === 'datasets':
            return true;
        default:
            return false;
    }
};

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
const isLiteralEligibleForTesting = (value: string) =>
    isString(value) && !isBase64Image(value) && value?.length > 0;

/**
 * For previous and current field candidate maps, get a merged object that should be used for testing against the
 * specification.
 */
export const getTrackedFieldMapMerged = (
    fieldMapPrev: TrackedFieldCandidates,
    fieldMapCurrent: TrackedFieldCandidates
) => merge(fieldMapPrev, fieldMapCurrent);

/**
 * Test if a path should be avoided when inspecting a JSON object for field tracking. If a path being tested contains
 * the same elements at the start of the path as an expensive path, then we should avoid inspecting it.
 */
export const shouldAvoidPath = (path: JSONPath, expensivePaths: JSONPath[]) =>
    expensivePaths.some((p) => p.every((v, i) => v === path[i]));
