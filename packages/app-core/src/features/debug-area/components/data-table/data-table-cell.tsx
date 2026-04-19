import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { makeStyles, Tooltip } from '@fluentui/react-components';
import { isDate, isFunction, isNumber } from 'vega';

import {
    isCrossHighlightComparatorField,
    isCrossHighlightStatusField,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/data-core/field';
import {
    getPrunedObject,
    getSanitizedTooltipValue
} from '@deneb-viz/utils/object';
import {
    type DataPointHighlightComparator,
    type DataPointSelectionStatus
} from '@deneb-viz/data-core/value';
import type { WorkerDatasetViewerValueType } from '../../workers/types';
import { getDenebState } from '../../../../state';
import { useDataTableInspector } from './inspector-popover-context';
import {
    buildCellId,
    useDataTableKeyboard
} from './data-table-keyboard-context';
import { useDataTableTooltip } from './data-table-tooltip-context';

const useDataTableCellStyles = makeStyles({
    cell: {
        cursor: 'pointer',
        // Display-only fallback when rendered without an inspectable wrapper
        // — kept explicit so the cell div doesn't look clickable when not.
        '&[aria-disabled="true"]': {
            cursor: 'default'
        }
    }
});

type DataTableCellProps = {
    displayValue: string;
    field: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawValue: any;
    valueType?: WorkerDatasetViewerValueType;
    rowIndex?: number;
    /**
     * When `false`, the cell renders without click/keyboard handlers,
     * tabIndex, or a button role — just the tooltip and display text. Used
     * by the signal viewer to skip the key column.
     */
    inspectable?: boolean;
};

/**
 * Handles rendering a cell in the data table. Every inspectable cell is a
 * focusable, clickable dispatch point to the shared inspector popover; the
 * Fluent `<Tooltip>` wrapper replaces the native `title` attribute so it can
 * coexist with the popover. Non-inspectable cells (e.g., signal names) fall
 * back to a plain tooltip-wrapped div.
 */
export const DataTableCell = ({
    displayValue,
    field,
    rawValue,
    valueType,
    rowIndex,
    inspectable = true
}: DataTableCellProps) => {
    const classes = useDataTableCellStyles();
    const tooltipMountNode = useDataTableTooltip();
    const tooltipContent = getCellTooltip(field, rawValue);

    const inspector = useDataTableInspector();
    const keyboard = useDataTableKeyboard();
    const cellRef = useRef<HTMLDivElement>(null);

    const canInspect =
        inspectable && valueType !== undefined && rowIndex !== undefined;

    const cellId = useMemo(
        () => (canInspect ? buildCellId(rowIndex!, field) : null),
        [canInspect, rowIndex, field]
    );

    // Register this cell with the keyboard provider for roving tabindex
    // tracking. Non-inspectable cells skip registration so arrow-key
    // navigation steps over them.
    useEffect(() => {
        if (!cellId || !keyboard) return;
        return keyboard.registerCell(cellId, cellRef);
    }, [cellId, keyboard]);

    if (!canInspect || !cellId) {
        return (
            <Tooltip
                content={tooltipContent ?? ''}
                relationship='description'
                withArrow
                mountNode={tooltipMountNode}
            >
                <div>{displayValue}</div>
            </Tooltip>
        );
    }

    const isActive = keyboard?.isActive(cellId) ?? true;
    const isOpen = inspector.isOpenForCell(cellId);

    const openForThisCell = () => {
        inspector.openInspector(cellRef, rawValue, valueType!, cellId);
    };

    const handleClick = () => {
        keyboard?.setActiveCell(cellId);
        openForThisCell();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                openForThisCell();
                return;
            case 'ArrowLeft':
                event.preventDefault();
                keyboard?.moveActive('left');
                return;
            case 'ArrowRight':
                event.preventDefault();
                keyboard?.moveActive('right');
                return;
            case 'ArrowUp':
                event.preventDefault();
                keyboard?.moveActive('up');
                return;
            case 'ArrowDown':
                event.preventDefault();
                keyboard?.moveActive('down');
                return;
            case 'Home':
                event.preventDefault();
                keyboard?.moveToRowEndpoint('home');
                return;
            case 'End':
                event.preventDefault();
                keyboard?.moveToRowEndpoint('end');
                return;
        }
    };

    const handleFocus = () => {
        keyboard?.setActiveCell(cellId);
    };

    return (
        <Tooltip
            content={tooltipContent ?? ''}
            relationship='description'
            withArrow
            mountNode={tooltipMountNode}
        >
            <div
                ref={cellRef}
                role='button'
                tabIndex={isActive ? 0 : -1}
                aria-haspopup='true'
                aria-expanded={isOpen}
                aria-label={getDenebState().i18n.translate(
                    'Table_Aria_InspectCell',
                    [field]
                )}
                className={classes.cell}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
            >
                {displayValue}
            </div>
        </Tooltip>
    );
};

/**
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the current cell.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCellTooltip = (field: string, value: any) => {
    switch (true) {
        case field === SELECTED_ROW_FIELD_NAME:
            return getCellCrossFilterTooltip(value);
        case isCrossHighlightComparatorField(field):
            return getCellHighlightComparatorTooltip(value);
        case isCrossHighlightStatusField(field):
            return getCellHighlightComparatorStatus(value);
        case isDate(value):
            return new Date(value).toUTCString();
        case isNumber(value):
            return formatNumberValueForTable(value);
        case isFunction(value):
            return value.toString();
        default:
            return getSanitizedTooltipValue(value);
    }
};

/**
 * Handle the display and translation of number values for a table. Borrowed
 * and adapted from vega-editor.
 */
const formatNumberValueForTable = (value: number, tooltip = false) => {
    const { translate } = getDenebState().i18n;
    return isNaN(value)
        ? translate('Table_Placeholder_NaN')
        : value === Number.POSITIVE_INFINITY
          ? translate('Table_Placeholder_Infinity')
          : value === Number.NEGATIVE_INFINITY
            ? `-${translate('Table_Placeholder_Infinity')}`
            : getStringifiedDisplayValue(value, tooltip);
};

/**
 * If the column/cell relates to cross-filtering, return a tooltip value that
 * is contextual for the displayed value.
 */
const getCellCrossFilterTooltip = (value: DataPointSelectionStatus) => {
    const { translate } = getDenebState().i18n;
    switch (value) {
        case 'neutral':
            return translate('Text_Dataset_FieldSelectedNeutral');
        case 'on':
            return translate('Text_Dataset_FieldSelectedOn');
        case 'off':
            return translate('Text_Dataset_FieldSelectedOff');
    }
};

/**
 * If the column/cell relates to a cross-highlight status, return a tooltip
 * value that is contextual for the displayed value.
 */
const getCellHighlightComparatorStatus = (value: DataPointSelectionStatus) => {
    const { translate } = getDenebState().i18n;
    switch (value) {
        case 'neutral':
            return translate('Text_Dataset_FieldHighlightStatusNeutral');
        case 'on':
            return translate('Text_Dataset_FieldHighlightStatusOn');
        case 'off':
            return translate('Text_Dataset_FieldHighlightStatusOff');
    }
};

/**
 * If the column/cell relates to a cross-highlight comparator, return a tooltip
 * value that is contextual for the displayed value.
 */
const getCellHighlightComparatorTooltip = (
    value: DataPointHighlightComparator
) => {
    const { translate } = getDenebState().i18n;
    switch (value) {
        case 'eq':
            return translate('Text_Dataset_FieldHighlightComparatorEq');
        case 'lt':
            return translate('Text_Dataset_FieldHighlightComparatorLt');
        case 'gt':
            return translate('Text_Dataset_FieldHighlightComparatorGt');
        case 'neq':
            return translate('Text_Dataset_FieldHighlightComparatorNeq');
    }
};

/**
 * Handle the processing of a stringified value within a data table.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStringifiedDisplayValue = (value: any, tooltip = false) => {
    const pruned = getPrunedObject(value);
    return tooltip ? getSanitizedTooltipValue(pruned) : pruned;
};
