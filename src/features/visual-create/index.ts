import { ICreateSliceProperties } from '../../store/create';
import {
    IDenebTemplateMetadata,
    areAllTemplateFieldsAssigned
} from '../template';

export { CreateButton } from './components/create-button';
export { VisualCreatePane } from './components/visual-create-pane';

/**
 * Ensure that all requirements are tested and validated before we can create.
 */
export const areAllCreateDataRequirementsMet = (
    metadata: IDenebTemplateMetadata
): Partial<ICreateSliceProperties> => {
    const metadataAllFieldsAssigned = areAllTemplateFieldsAssigned(
        metadata?.dataset
    );
    const metadataAllDependenciesAssigned = metadataAllFieldsAssigned;
    return {
        metadataAllDependenciesAssigned,
        metadataAllFieldsAssigned
    };
};
