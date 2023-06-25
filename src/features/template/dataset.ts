import { IColumn } from '@fluentui/react/lib/DetailsList';
import { getI18nValue } from '../i18n';

export const getTemplateDatasetNameColumn = (): IColumn => ({
    key: 'name',
    name: getI18nValue('Template_Dataset_Field_Name'),
    fieldName: 'name',
    minWidth: 150,
    maxWidth: 250
});

export const getTemplateDatasetTypeColumn = (): IColumn => ({
    key: 'type',
    name: '',
    fieldName: 'type',
    minWidth: 15,
    maxWidth: 15
});
