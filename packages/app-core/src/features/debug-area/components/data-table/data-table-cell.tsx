import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { makeStyles, Tooltip } from '@fluentui/react-components';

import {
    isCrossHighlightComparatorField,
    isCrossHighlightStatusField,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/data-core/field';
import {
    type DataPointHighlightComparator,
    type DataPointSelectionStatus
} from '@deneb-viz/data-core/value';
import type { WorkerDatasetViewerValueType } from '../../workers/types';
import { getDenebState } from '../../../../state';
import {
    isOpenForCellId,
    useDataTableInspector
} from './inspector-popover-context';
import {
    buildCellId,
    useDataTableKeyboardActions,
    useIsDataTableCellActive
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
     * Stable column identifier used to position the cell in the keyboard
     * grid. Defaults to `field`. Must be overridden when `field` varies by
     * row (e.g. the signal viewer's value column, where `field` is the
     * signal name but the column position is always `"value"`) — otherwise
     * arrow-key navigation can't map cells to a consistent column index.
     */
    columnId?: string;
    /**
     * When `true`, the cell's `displayValue` is a placeholder because the
     * raw value was truncated for inline display. The tooltip then
     * advertises that the inspector shows a shallow representation, rather
     * than the generic "Select to inspect" hint used for fully-displayed
     * values.
     */
    tooLong?: boolean;
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
    columnId,
    tooLong = false,
    inspectable = true
}: DataTableCellProps) => {
    const effectiveColumnId = columnId ?? field;
    const classes = useDataTableCellStyles();
    const tooltipMountNode = useDataTableTooltip();
    const tooltipContent = getCellTooltip(field, rawValue, tooLong);

    const inspector = useDataTableInspector();
    const keyboard = useDataTableKeyboardActions();
    const cellRef = useRef<HTMLDivElement>(null);

    // `inspector` may be null if the cell is rendered outside a
    // `DataTableInspectorProvider` (isolated test harness, signal-viewer key
    // column, etc.). In that case click-to-inspect is unavailable and the
    // cell renders in the non-inspectable branch below.
    const canInspect =
        inspectable &&
        inspector !== null &&
        valueType !== undefined &&
        rowIndex !== undefined;

    const cellId = useMemo(
        () => (canInspect ? buildCellId(rowIndex!, effectiveColumnId) : null),
        [canInspect, rowIndex, effectiveColumnId]
    );

    const isActiveCell = useIsDataTableCellActive(cellId);

    // Register this cell with the keyboard provider for roving tabindex
    // tracking. Non-inspectable cells skip registration so arrow-key
    // navigation steps over them. The actions object is identity-stable for
    // the provider's lifetime, so this effect runs only on mount/unmount of
    // the cell — not on every active-cell change.
    useEffect(() => {
        if (!cellId || !keyboard) return;
        return keyboard.registerCell(cellId, cellRef);
    }, [cellId, keyboard]);

    if (!canInspect || !cellId || !inspector) {
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

    // When the keyboard provider isn't present (e.g. cell rendered outside
    // `DataTableViewer`), fall back to always-tabbable so the cell is at
    // least reachable.
    const isActive = keyboard ? isActiveCell : true;
    const isOpen = isOpenForCellId(inspector, cellId);

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
                aria-haspopup='dialog'
                aria-expanded={isOpen}
                aria-label={getDenebState().i18n.translate(
                    'Table_Aria_InspectCell',
                    [field]
                )}
                data-inspector-cell=''
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
 * Returns the tooltip content for a cell. Support/interactivity fields
 * (cross-filter and cross-highlight) surface a translated explanation of
 * their enum value because the raw `on`/`off`/`eq`/`lt`/… display text is
 * meaningless on its own. Truncated cells (`tooLong`) advertise that the
 * inspector shows a shallow representation of the value, since the cell's
 * displayed placeholder (`{...}`) hides the real content. All other cells
 * get a generic discoverability hint directing the user to the inspector.
 */
const getCellTooltip = (
    field: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    tooLong: boolean
) => {
    const { translate } = getDenebState().i18n;
    switch (true) {
        case field === SELECTED_ROW_FIELD_NAME:
            return getCellCrossFilterTooltip(value);
        case isCrossHighlightComparatorField(field):
            return getCellHighlightComparatorTooltip(value);
        case isCrossHighlightStatusField(field):
            return getCellHighlightComparatorStatus(value);
        case tooLong:
            return translate('Table_Tooltip_InspectShallow');
        default:
            return translate('Table_Tooltip_Inspect');
    }
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
