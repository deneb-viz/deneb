import type { PrimitiveValue, VegaDatum } from '../value/types';
import type { ProcessingPlan, SupportFieldValueProvider } from './types';
import {
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    FORMAT_FIELD_SUFFIX,
    FORMATTED_FIELD_SUFFIX,
    ROW_INDEX_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME,
    PARAMETER_NAMES_SUFFIX
} from '../field/constants';
import {
    getHighlightStatusValue,
    getHighlightComparatorValue
} from '../value/highlight';

export type BuildDataRowParams = {
    plan: ProcessingPlan;
    provider: SupportFieldValueProvider;
    baseValues: PrimitiveValue[];
    rowIndex: number;
    selectionStatus?: string;
    locale: string;
};

export const buildDataRow = (params: BuildDataRowParams): VegaDatum => {
    const { plan, provider, baseValues, rowIndex, selectionStatus, locale } =
        params;
    const row: VegaDatum = {};

    row[ROW_INDEX_FIELD_NAME] = rowIndex;

    if (plan.emitSelected && selectionStatus !== undefined) {
        row[SELECTED_ROW_FIELD_NAME] = selectionStatus;
    }

    for (let i = 0; i < plan.fields.length; i++) {
        const instruction = plan.fields[i]!;
        const { encodedName } = instruction;

        if (instruction.kind === 'parameter') {
            const { componentIndices, namesArray } = instruction;

            // Assemble array of values from component fields
            const values: PrimitiveValue[] = componentIndices.map(
                (idx) => baseValues[idx] as PrimitiveValue
            );
            row[encodedName] = values;

            // Highlight arrays — per-component role-aware
            const needsHighlight =
                instruction.emitHighlight ||
                instruction.emitHighlightStatus ||
                instruction.emitHighlightComparator;
            if (needsHighlight) {
                const highlightValues = componentIndices.map((idx, j) => {
                    const base = baseValues[idx] as PrimitiveValue;
                    // Columns pass through — highlight doesn't apply
                    if (instruction.componentRoles[j] === 'grouping') {
                        return base;
                    }
                    return provider.getHighlightValue(idx, rowIndex, base);
                });
                if (instruction.emitHighlight) {
                    row[encodedName + HIGHLIGHT_FIELD_SUFFIX] = highlightValues;
                }
                if (instruction.emitHighlightStatus) {
                    row[encodedName + HIGHLIGHT_STATUS_SUFFIX] =
                        componentIndices.map((idx, j) => {
                            const base = baseValues[idx] as PrimitiveValue;
                            return getHighlightStatusValue(
                                plan.hasHighlights,
                                base,
                                highlightValues[j]!
                            );
                        });
                }
                if (instruction.emitHighlightComparator) {
                    row[encodedName + HIGHLIGHT_COMPARATOR_SUFFIX] =
                        componentIndices.map((idx, j) => {
                            const base = baseValues[idx] as PrimitiveValue;
                            return getHighlightComparatorValue(
                                base,
                                highlightValues[j]!
                            );
                        });
                }
            }

            // Reuse the pre-built names array (same reference every row)
            if (instruction.emitNames) {
                row[encodedName + PARAMETER_NAMES_SUFFIX] = namesArray;
            }

            // Format strings array
            if (instruction.emitFormat) {
                if (instruction.formatStringsArray) {
                    row[encodedName + FORMAT_FIELD_SUFFIX] =
                        instruction.formatStringsArray;
                } else {
                    row[encodedName + FORMAT_FIELD_SUFFIX] =
                        componentIndices.map((idx) =>
                            provider.getFormatString(idx, rowIndex)
                        );
                }
            }

            // Formatted values (always per-row via provider)
            if (instruction.emitFormatted) {
                const formatStrings =
                    instruction.formatStringsArray ??
                    componentIndices.map((idx) =>
                        provider.getFormatString(idx, rowIndex)
                    );
                row[encodedName + FORMATTED_FIELD_SUFFIX] =
                    componentIndices.map((idx, j) =>
                        provider.getFormattedValue(
                            baseValues[idx] as PrimitiveValue,
                            formatStrings[j]!,
                            locale
                        )
                    );
            }

            continue;
        }

        const baseValue = baseValues[
            instruction.baseValueIndex
        ] as PrimitiveValue;

        row[encodedName] = baseValue;

        if (instruction.kind === 'field') {
            const needsHighlightValue =
                instruction.emitHighlight ||
                instruction.emitHighlightStatus ||
                instruction.emitHighlightComparator;

            let highlightValue: PrimitiveValue | undefined;
            if (needsHighlightValue) {
                highlightValue = provider.getHighlightValue(
                    instruction.baseValueIndex,
                    rowIndex,
                    baseValue
                );
            }

            if (instruction.emitHighlight) {
                row[encodedName + HIGHLIGHT_FIELD_SUFFIX] = highlightValue;
            }

            if (instruction.emitHighlightStatus) {
                row[encodedName + HIGHLIGHT_STATUS_SUFFIX] =
                    getHighlightStatusValue(
                        plan.hasHighlights,
                        baseValue,
                        highlightValue!
                    );
            }

            if (instruction.emitHighlightComparator) {
                row[encodedName + HIGHLIGHT_COMPARATOR_SUFFIX] =
                    getHighlightComparatorValue(baseValue, highlightValue!);
            }

            let formatString: string | undefined;
            if (instruction.emitFormat || instruction.emitFormatted) {
                formatString = provider.getFormatString(
                    instruction.baseValueIndex,
                    rowIndex
                );
            }

            if (instruction.emitFormat) {
                row[encodedName + FORMAT_FIELD_SUFFIX] = formatString;
            }

            if (instruction.emitFormatted) {
                row[encodedName + FORMATTED_FIELD_SUFFIX] =
                    provider.getFormattedValue(
                        baseValue,
                        formatString!,
                        locale
                    );
            }
        }
    }

    return row;
};
