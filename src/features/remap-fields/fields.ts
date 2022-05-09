import { getDatasetTemplateFields } from '../../core/data/fields';
import { specEditorService } from '../../core/services/JsonEditorServices';
import { getState } from '../../store';
import { persistSpecification } from '../specification';
import {
    getReducedPlaceholdersForMetadata,
    getTemplatedSpecification
} from '../template';

/**
 * For a supplied template, substitute placeholder values and return a stringified representation of the object.
 */
export const remapSpecificationFields = () => {
    const { updateEditorMapDialogVisible } = getState();
    const dataset = getDatasetTemplateFields(getState().editorFieldsInUse);
    const spec = getTemplatedSpecification(
        specEditorService.getText(),
        dataset
    );
    const replaced = getReducedPlaceholdersForMetadata(dataset, spec);
    specEditorService.setText(replaced);
    updateEditorMapDialogVisible(false);
    persistSpecification();
};
