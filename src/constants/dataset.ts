import { dataRoles } from '../../capabilities.json';

/**
 * The name to use for the dataset in Deneb, bound from the data view, into the
 * Vega view as a named reference.
 */
export const DATASET_NAME = dataRoles[0].name;

/**
 * The name we use to denote a row in the datset, which is also used for
 * reconciliation of selectors.
 */
export const DATASET_ROW_NAME = '__row__';

/**
 * The name we use to denote a field in the dataset that holds a selection ID
 */
export const DATASET_IDENTITY_NAME = '__identity__';

/**
 * The name we use to denote a field in the dataset used to hold the string-
 * ified representation of the identity, and therefore use for comparison
 * operations and suchlike.
 */
export const DATASET_KEY_NAME = '__key__';

/***
 * The name we use to denote a data point's selection status within the
 * dataset.
 */
export const DATASET_SELECTED_NAME = '__selected__';
