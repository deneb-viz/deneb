import React from 'react';

import { Stack, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { IColumn } from '@fluentui/react/lib/DetailsList';

import filter from 'lodash/filter';

import store, { getState } from '../../../store';

import { i18nValue } from '../../../core/ui/i18n';
import { Paragraph } from '../../../components/elements/Typography';
import {
    Dataset,
    getReducedPlaceholdersForMetadata,
    getTemplateDatasetTypeColumn,
    getTemplatedSpecification
} from '../../template';
import { buttonStyles } from '../../../core/ui/fluent';

import { getDatasetTemplateFields } from '../../../core/data/fields';
import {
    MODAL_DIALOG_STACK_INNER_TOKENS,
    MODAL_DIALOG_STACK_ITEM_STYLES,
    MODAL_DIALOG_STACK_STYLES
} from '../../modal-dialog';
import { specEditorService } from '../../../core/services/JsonEditorServices';
import { persistSpecification } from '../../specification';
import { logRender } from '../../logging';

const datasetItemStyles: IStackItemStyles = {
    root: {
        overflowY: 'auto'
    }
};

const getMapFieldAssignmentColumn = (): IColumn => ({
    key: 'map_field_assignment',
    name: i18nValue('Template_Dataset_Field_Assignment'),
    fieldName: 'assignment',
    minWidth: 300
});
const getMapNameOriginalColumn = (): IColumn => ({
    key: 'name',
    name: i18nValue('Map_Fields_Dataset_Original_Name'),
    fieldName: 'name',
    minWidth: 150,
    maxWidth: 250
});

const getMapColumns = (): IColumn[] => [
    getTemplateDatasetTypeColumn(),
    getMapNameOriginalColumn(),
    getMapFieldAssignmentColumn()
];

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

export const MapFieldsDialogBody = () => {
    const { editorFieldsInUse } = store((state) => state);
    const dataset = getDatasetTemplateFields(editorFieldsInUse);
    const remapDisabled =
        filter(
            editorFieldsInUse,
            (f) => f.templateMetadata?.suppliedObjectName === undefined
        ).length > 0;
    const handleRemap = () => {
        remapSpecificationFields();
    };
    logRender('MapFieldsDialogBody');
    return (
        <Stack
            styles={MODAL_DIALOG_STACK_STYLES}
            tokens={MODAL_DIALOG_STACK_INNER_TOKENS}
        >
            <Stack.Item shrink>
                <Paragraph>
                    {i18nValue('Map_Fields_Assistive_Introduction')}
                </Paragraph>
                <Paragraph>
                    {i18nValue('Map_Fields_Assistive_Instructions')}
                </Paragraph>
                <Paragraph>
                    {i18nValue('Map_Fields_Completion_Instructions')}
                </Paragraph>
            </Stack.Item>
            <Stack.Item verticalFill styles={datasetItemStyles}>
                <>
                    <Dataset dataset={dataset} columns={getMapColumns} />
                </>
            </Stack.Item>
            <Stack.Item
                shrink
                styles={MODAL_DIALOG_STACK_ITEM_STYLES}
                align='end'
            >
                <PrimaryButton
                    styles={buttonStyles}
                    onClick={handleRemap}
                    text={i18nValue('Button_Remap')}
                    disabled={remapDisabled}
                />
            </Stack.Item>
        </Stack>
    );
};
