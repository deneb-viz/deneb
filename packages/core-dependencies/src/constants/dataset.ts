/***
 * The name we use to denote a data point's selection status within the
 * dataset.
 * TODO: can be removed after refactor
 */
export const DATASET_CROSS_FILTER_NAME = '__selected__';

/**
 * The name we use to denote a field in the dataset that holds a selection ID
 * TODO: can be removed after refactor
 */
export const DATASET_IDENTITY_NAME = '__identity__';

/**
 * The name we use to denote a field in the dataset used to hold the stringified representation of the identity, and
 * therefore use for comparison operations and suchlike.
 * TODO: can be removed after refactor
 */
export const DATASET_KEY_NAME = '__key__';

/**
 * The name we use to denote a row in the datset, which is also used for reconciliation of selectors.
 * TODO: can be removed after refactor
 */
export const DATASET_ROW_NAME = '__row__';
