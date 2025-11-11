import { dataRoles } from '../../capabilities.json';

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

/**
 * The name we wish to use for handling the Drilldown data role from the data
 * view.
 */
export const DATASET_ROLE_DRILLDOWN = dataRoles[1]?.name;

/**
 * Because Drilldown can be multi-level, and we don't know how many there are,
 * we provide a special column which concatenates and formats the supplied
 * columns, which can be used like how core charts tend to do this.
 */
export const DATASET_ROLE_DRILLDOWN_FLAT = DATASET_ROLE_DRILLDOWN?.replace(
    /(__$)/,
    '_flat$1'
);
