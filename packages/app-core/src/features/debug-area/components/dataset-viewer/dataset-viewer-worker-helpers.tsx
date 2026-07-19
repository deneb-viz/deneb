import { textMeasurementService } from 'powerbi-visuals-utils-formattingutils';

import { getDenebState } from '../../../../state';
import { getFieldDocumentationByName } from '../../../../lib/dataset';
import { DATA_TABLE_FONT_FAMILY, DATA_TABLE_FONT_SIZE } from '../../constants';
import type {
    IWorkerDatasetViewerDataTableRow,
    IWorkerDatasetViewerMaxDisplayWidths,
    IWorkerDatasetViewerTranslations
} from '../../workers';
import { DataTableCell } from '../data-table/data-table-cell';
import { DataTableHeaderCell } from '../data-table/data-table-header-cell';
import type { DataTableViewerColumn } from '../data-table/data-table-viewer-types';

/**
 * Shared worker + column helpers used by both the Source and Data tabs.
 * Extracted per the dual-maintenance learning — the two tabs previously
 * held near-identical copies of these helpers which is a drift hazard.
 * Kept in a `.tsx` file because `buildDatasetViewerColumns` produces JSX
 * for header/cell renderers.
 */

/**
 * Build the `DataTableViewer` column definitions for a processed set of
 * dataset rows. Widths are monospace-derived from the worker's per-column
 * `maxWidths`; header labels pull documentation tooltips from the field
 * registry so support fields render their descriptions. The `selector`
 * returns the raw value so sorting matches the previous rawValue-based
 * comparator (the visible text is produced by the `cell` renderer).
 */
export const buildDatasetViewerColumns = (
    rows: IWorkerDatasetViewerDataTableRow[],
    maxLengths: IWorkerDatasetViewerMaxDisplayWidths
): DataTableViewerColumn<IWorkerDatasetViewerDataTableRow>[] => {
    return Object.keys(rows?.[0] ?? {}).map((c) => ({
        id: c,
        name: (
            <DataTableHeaderCell
                label={c}
                tooltip={getFieldDocumentationByName(c)}
            />
        ),
        cell: (row, rowIndex) => (
            <DataTableCell
                displayValue={row[c]?.displayValue}
                field={c}
                rawValue={row[c]?.rawValue}
                valueType={row[c]?.valueType}
                rowIndex={rowIndex}
                tooLong={row[c]?.tooLong}
            />
        ),
        sortable: true,
        selector: (row) => row[c]?.rawValue,
        width: calculateDatasetViewerMaxWidth(c, maxLengths[c])
    }));
};

/**
 * We pre-compute the max width for each column from the worker-measured
 * value widths plus the header label width, and feed it to the DataGrid's
 * `columnSizingOptions` as the column's ideal width.
 */
export const calculateDatasetViewerMaxWidth = (
    fieldName: string,
    fieldDataMaxWidth: number
): number => {
    const charWidth = getDatasetViewerCharWidth();
    const pixelBuffer = charWidth * 4;
    const fieldWidth = (fieldName?.length || 0) * charWidth;
    return Math.max(fieldDataMaxWidth ?? 0, fieldWidth) + pixelBuffer;
};

/**
 * Measure a single character in the table font so the worker can project
 * display widths by character count. Uses OffscreenCanvas where available
 * (faster) with a Power BI formatting-utils fallback for older Safari
 * versions (< 16.2).
 */
export const getDatasetViewerCharWidth = (): number => {
    const textToMeasure = '-'; // MS APIs strip whitespace
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(100, 10);
        const ctx = canvas.getContext(
            '2d'
        ) as unknown as OffscreenCanvasRenderingContext2D;
        ctx.font = `${DATA_TABLE_FONT_SIZE}px ${DATA_TABLE_FONT_FAMILY}`;
        return ctx.measureText(textToMeasure).width;
    }
    return textMeasurementService.measureSvgTextRect({
        text: textToMeasure,
        fontFamily: DATA_TABLE_FONT_FAMILY,
        fontSize: `${DATA_TABLE_FONT_SIZE}px`
    }).width;
};

/**
 * Resolve translations the worker needs (the worker runs off the main
 * thread and can't reach the translate hook directly).
 */
export const getDatasetViewerWorkerTranslations =
    (): IWorkerDatasetViewerTranslations => {
        const { translate } = getDenebState().i18n;
        return {
            placeholderInfinity: translate('Table_Placeholder_Infinity'),
            placeholderNaN: translate('Table_Placeholder_NaN'),
            placeholderTooLong: translate('Table_Placeholder_TooLong'),
            selectedNeutral: translate('Text_Dataset_FieldSelectedNeutral'),
            selectedOn: translate('Text_Dataset_FieldSelectedOn'),
            selectedOff: translate('Text_Dataset_FieldSelectedOff')
        };
    };
