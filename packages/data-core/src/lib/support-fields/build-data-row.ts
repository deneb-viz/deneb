import type { PrimitiveValue, VegaDatum } from '../value/types';
import type { ProcessingPlan, SupportFieldValueProvider } from './types';
import {
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    FORMAT_FIELD_SUFFIX,
    FORMATTED_FIELD_SUFFIX,
    ROW_INDEX_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
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
        const instruction = plan.fields[i];
        const { encodedName, sourceIndex } = instruction;
        const baseValue = baseValues[i];

        row[encodedName] = baseValue;

        const needsHighlightValue =
            instruction.emitHighlight ||
            instruction.emitHighlightStatus ||
            instruction.emitHighlightComparator;

        let highlightValue: PrimitiveValue | undefined;
        if (needsHighlightValue) {
            highlightValue = provider.getHighlightValue(
                sourceIndex,
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
            formatString = provider.getFormatString(sourceIndex, rowIndex);
        }

        if (instruction.emitFormat) {
            row[encodedName + FORMAT_FIELD_SUFFIX] = formatString;
        }

        if (instruction.emitFormatted) {
            row[encodedName + FORMATTED_FIELD_SUFFIX] =
                provider.getFormattedValue(baseValue, formatString!, locale);
        }
    }

    return row;
};
