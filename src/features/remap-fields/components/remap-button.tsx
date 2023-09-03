import React from 'react';
import { Button } from '@fluentui/react-components';

import { getI18nValue } from '../../i18n';
import store from '../../../store';
import { logRender } from '../../logging';
import { isMappingDialogRequired } from '..';
import { getDatasetTemplateFields } from '../../../core/data/fields';
import { IVisualDatasetFields } from '../../../core/data';
import {
    getReducedPlaceholdersForMetadata,
    getTemplatedSpecification
} from '../../template';
import { specEditorService } from '../../../core/services/JsonEditorServices';
import { persistSpecification } from '../../specification';

/**
 * Button for applying field mapping changes via the modal dialog.
 */
export const RemapButton: React.FC = () => {
    const { editorFieldsInUse, setModalDialogRole } = store((state) => ({
        editorFieldsInUse: state.editorFieldsInUse,
        setModalDialogRole: state.interface.setModalDialogRole
    }));
    const remapDisabled = isMappingDialogRequired(editorFieldsInUse);
    const onRemap = () => {
        remapSpecificationFields(editorFieldsInUse);
        setModalDialogRole('None');
    };
    logRender('RemapButton', { remapDisabled });
    return (
        <Button disabled={remapDisabled} appearance='primary' onClick={onRemap}>
            {getI18nValue('Button_Remap')}
        </Button>
    );
};

/**
 * For a supplied template, substitute placeholder values and return a stringified representation of the object.
 */
const remapSpecificationFields = (editorFieldsInUse: IVisualDatasetFields) => {
    const dataset = getDatasetTemplateFields(editorFieldsInUse);
    const spec = getTemplatedSpecification(
        specEditorService.getText(),
        dataset
    );
    const replaced = getReducedPlaceholdersForMetadata(dataset, spec);
    specEditorService.setText(replaced);
    persistSpecification();
};
