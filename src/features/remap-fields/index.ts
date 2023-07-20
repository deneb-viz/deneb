import filter from 'lodash/filter';

import { IVisualDatasetFields } from '../../core/data';

export { FieldRemapPane } from './components/field-remap-pane';
export { RemapButton } from './components/remap-button';

/**
 * Test to see if the tracking information conatins and fields that require
 * mapping (which should trigger the mapping modal dialog).
 */
export const isMappingDialogRequired = (dataset: IVisualDatasetFields) =>
    filter(dataset, (f) => f.templateMetadata?.suppliedObjectName === undefined)
        .length > 0;
