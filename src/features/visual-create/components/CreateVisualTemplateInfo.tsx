import React from 'react';
import { Stack, StackItem, IStackTokens } from '@fluentui/react/lib/Stack';
import { IColumn } from '@fluentui/react/lib/DetailsList';

import store from '../../../store';
import {
    getTemplateDatasetNameColumn,
    getTemplateDatasetTypeColumn,
    IDenebTemplateMetadata
} from '../../template';
import { i18nValue } from '../../../core/ui/i18n';
import { CreateVisualDatasetPlaceholders } from './CreateVisualDatasetPlaceholders';
import { CreateVisualPreviewImage } from './CreateVisualPreviewImage';
import {
    BodyHeading,
    SubHeading
} from '../../../components/elements/Typography';
import { Dataset } from '../../template';

import { DATASET_NAME } from '../../../constants';

const stackTokens: IStackTokens = {
    childrenGap: 25
};

const getTemplateFieldAssignmentColumn = (): IColumn => ({
    key: 'field_assignment',
    name: i18nValue('Template_Dataset_Field_Assignment'),
    fieldName: 'assignment',
    minWidth: 300
});

const getImportColumns = (): IColumn[] => [
    getTemplateDatasetTypeColumn(),
    getTemplateDatasetNameColumn(),
    getTemplateFieldAssignmentColumn()
];

export const CreateVisualTemplateInfo: React.FC = () => {
    const usermeta = store((state) => state).templateToApply
        .usermeta as IDenebTemplateMetadata;
    const hasPlaceholders = usermeta?.[DATASET_NAME]?.length > 0;
    return (
        <>
            <Stack horizontal tokens={stackTokens}>
                <StackItem grow>
                    <BodyHeading>{usermeta?.information?.name}</BodyHeading>
                    <SubHeading>
                        {usermeta?.information?.description ||
                            i18nValue('Template_No_Description')}
                    </SubHeading>
                    <CreateVisualDatasetPlaceholders />
                </StackItem>
                <CreateVisualPreviewImage />
            </Stack>
            {hasPlaceholders ? (
                <Dataset
                    dataset={usermeta?.[DATASET_NAME]}
                    columns={getImportColumns}
                />
            ) : (
                <></>
            )}
        </>
    );
};
