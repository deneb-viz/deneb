import React from 'react';
import { Stack, StackItem, IStackTokens } from '@fluentui/react/lib/Stack';
import { IColumn } from '@fluentui/react/lib/DetailsList';
import { Subtitle2, Title3 } from '@fluentui/react-components';

import store from '../../../store';
import {
    getTemplateDatasetNameColumn,
    getTemplateDatasetTypeColumn,
    IDenebTemplateMetadata
} from '../../template';
import { CreateVisualDatasetPlaceholders } from './CreateVisualDatasetPlaceholders';
import { CreateVisualPreviewImage } from './CreateVisualPreviewImage';
import { Dataset } from '../../template';

import { DATASET_NAME } from '../../../constants';
import { getI18nValue } from '../../i18n';

const stackTokens: IStackTokens = {
    childrenGap: 25
};

const getTemplateFieldAssignmentColumn = (): IColumn => ({
    key: 'field_assignment',
    name: getI18nValue('Template_Dataset_Field_Assignment'),
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
                    <Title3>{usermeta?.information?.name}</Title3>
                    <Subtitle2>
                        {usermeta?.information?.description ||
                            getI18nValue('Template_No_Description')}
                    </Subtitle2>
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
