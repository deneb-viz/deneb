import powerbi from 'powerbi-visuals-api';

import { type SelectionMode } from '@deneb-viz/template-usermeta';
import { type DatasetValueRow, type IDatasetFields } from '../dataset';

/**
 * Options that can be supplied for advanced cross-filtering behavior.
 */
export type CrossFilterOptions = {
    /**
     * The type of filtering mode that we wish to apply
     */
    mode: SelectionMode;
    /**
     * Valid Vega expression to apply to the original dataset, in order to create a shortlist of data points to add to
     * the list of identities. The filter can contain a token in the format `_{fieldName}_` which represents the
     * corresponding field name from the current event's datum and can be used to reduce the amount of escaping needed
     * in the supplied expression. Or escape it. Or even mix them. You do you.
     */
    filterExpr?: string;
    /**
     * The maximum number of identities to return. If not supplied, the default limit will be used. This will also be
     * validated as between the current threshold values as defined in config (and similarly is a constraint for
     * simple filtering).
     */
    limit?: number;
    /**
     * Keys that should permit multi-select behavior. If not supplied, the default keys will be used.
     */
    multiSelect?: MultiSelectKey[];
};

/**
 * Specifies the assessed row numbers for a potential cross filter operation, along with any warning that may have been
 * generated during that assessment.
 */
export type CrossFilterSelectionAssessment = {
    /**
     * The row numbers that correspond to the identities in our InteractivityManager.
     */
    rowNumbers: number[];
    /**
     * Whether the selection will exceed the prescribed limit.
     */
    exceedsLimit?: boolean;
    /**
     * Any warnings that should be displayed to the user in the logging pane.
     */
    warning?: string;
};

/**
 * Provides all information needed to perform a cross-filter selection operation.
 */
export type CrossFilterSelectionDirective = CrossFilterSelectionAssessment & {
    /**
     * Whether multi-select behavior should be applied for this action.
     */
    multiSelect?: boolean;
};

/**
 * Options used to check whether cross-filtering is enabled and should be performed or data processed accordingly.
 */
export type CrossFilterPropCheckOptions = {
    enableSelection: boolean;
};

/**
 * Options used to check whether cross-highlighting is enabled and should be performed or data processed accordingly.
 */
export type CrossHighlightPropCheckOptions = {
    enableHighlight: boolean;
};

/**
 * Indicates how a cross-highlight value compares with its original (base)
 * value.
 */
export type DataPointHighlightComparator = 'lt' | 'eq' | 'gt' | 'neq';

/**
 * Indicates the internal selection state of a data point.
 */
export type DataPointSelectionStatus = 'off' | 'neutral' | 'on';

/**
 * Field and value information from the main dataset, used for interactivity lookups when we cannot directly resolve a
 * row number from a Vega datum.
 */
export type InteractivityLookupDataset = {
    fields: IDatasetFields;
    values: VegaDatum[];
};

/**
 * Options used when binding interactivity management to the visual.
 */
export type InteractivityManagerBindOptions = {
    /**
     * The Power BI visual host instance.
     */
    host: powerbi.extensibility.visual.IVisualHost;
    /**
     * Optional callback to notify when selection limit is exceeded.
     */
    limitExceededCallback?: (exceeded: boolean) => void;
    /**
     * Optional callback to notify when selector statuses are updated.
     */
    selectorUpdateCallback?: (selectorMap: SelectorStatus) => Promise<void>;
};

/**
 * Define which keys should invoke multi-select behavior (for advanced cross-filtering).
 */
export type MultiSelectKey = 'ctrl' | 'shift' | 'alt';

/**
 * A map of row numbers to their corresponding selection status; used for reconciling cross-filter state in the main
 * dataset.
 */
export type SelectorStatus = Map<number, DataPointSelectionStatus>;

/**
 * Contains everything needed to track cross-filter state for a particular data point.
 */
export type Selector = {
    /**
     * The generated Power BI selection ID for the data point.
     */
    id: powerbi.visuals.ISelectionId;
    /**
     * The current selection status of the data point.
     */
    status: DataPointSelectionStatus;
};

/**
 * A map of row numbers to their corresponding Selector; used for managing cross-filter state in the main dataset.
 */
export type SelectorMap = Map<number, Selector>;

/**
 * An entry for a semantic model column that should be enqueued (and used) when creating a selection ID for a dataset row.
 */
export type SelectionIdQueueCategoryEntry = {
    type: 'category';
    column: powerbi.DataViewCategoryColumn;
};

/**
 * An entry for a semantic model measure that should be enqueued (and used) when creating a selection ID for a dataset row.
 */
export type SelectionIdQueueMeasureEntry = {
    type: 'measure';
    queryName: string;
};

/**
 * An array of entries that should be enqueued (and used) when creating a selection ID for a dataset row.
 */
export type SelectionIdQueue = {
    entries: SelectionIdQueueEntry[];
    rowNumber: number;
};

/**
 * An array of entries that should be enqueued (and used) when creating a selection ID for a dataset row.
 */
export type SelectionIdQueueEntry =
    | SelectionIdQueueCategoryEntry
    | SelectionIdQueueMeasureEntry;

/**
 * Options that can be supplied to configure the Power BI tooltip handler.
 */
export type TooltipHandlerOptions = {
    fields: IDatasetFields;
    enabled: boolean;
    multiSelectDelay: number;
    values: DatasetValueRow[];
};

/**
 * Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.
 */
export type VegaDatum = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};
