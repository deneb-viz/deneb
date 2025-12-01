import { getState } from '../../store';

/**
 * Retrieve all `powerbi.DataViewCategoryColumn[]` entries from the visual's data view, which are available from Deneb's store.
 */
export const getCategoryColumns = () => getState().datasetCategories || [];
