import * as React from 'react';
import { useSelector } from 'react-redux';

import {
    DetailsList,
    DetailsListLayoutMode,
    IColumn,
    SelectionMode,
    IDetailsHeaderProps
} from '@fluentui/react/lib/DetailsList';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { ITemplateDatasetField } from '../../schema/template-v1';

import DataTypeIcon from '../elements/DataTypeIcon';
import CappedTextField from '../elements/CappedTextField';
import { exportFieldConstraints } from '../../config';
import { detailListStyles } from '../../config/styles';
import { i18nValue } from '../../core/ui/i18n';

const ExportDataFields: React.FC = () => {
    Debugger.log('Rendering Component: [ExportDataFields]...');
    const root = useSelector(state),
        { visual, templates } = root,
        { dataset } = visual,
        { metadata } = dataset,
        { templateExportMetadata: templateToGenerate } = templates,
        columns: IColumn[] = [
            {
                key: 'type',
                name: '',
                fieldName: 'type',
                minWidth: 15,
                maxWidth: 15
            },
            {
                key: 'name',
                name: i18nValue('Template_Export_Dataset_Field_Name'),
                fieldName: 'name',
                minWidth: 250
            },
            {
                key: 'description',
                name: i18nValue('Template_Export_Dataset_Field_Description'),
                fieldName: 'description',
                minWidth: 450
            }
        ],
        lookupMetadataColumn = (key: string) =>
            Object.entries(metadata).find(([k, v]) => v.queryName === key)?.[1],
        renderHeader = (headerProps: IDetailsHeaderProps, defaultRender) => {
            return defaultRender({
                ...headerProps,
                styles: {
                    root: {
                        borderBottom: 0
                    }
                }
            });
        },
        renderItem = (
            item: ITemplateDatasetField,
            index: number,
            column: IColumn
        ) => {
            const displayName =
                lookupMetadataColumn(item.key)?.displayName || '';
            switch (column.key) {
                case 'type':
                    return <DataTypeIcon datasetField={item} />;
                case 'name':
                    return (
                        <CappedTextField
                            id={`dataset[${index}].name`}
                            i18nLabel={`${item.name}`}
                            i18nPlaceholder={`${item.namePlaceholder}`}
                            maxLength={
                                exportFieldConstraints.dataset.name.maxLength
                            }
                            inline
                            description={`${i18nValue(
                                `Template_Export_Kind_${item.kind}`
                            )} ${item.namePlaceholder}`}
                        />
                    );
                case 'description':
                    return (
                        <CappedTextField
                            id={`dataset[${index}].description`}
                            i18nLabel='Field Description'
                            i18nPlaceholder='Template_Description_Optional_Placeholder'
                            maxLength={
                                exportFieldConstraints.dataset.description
                                    .maxLength
                            }
                            multiline
                            inline
                        />
                    );
                default:
                    return <span>{displayName}</span>;
            }
        };

    return (
        <DetailsList
            key={templateToGenerate.dataset.length}
            columns={columns}
            items={templateToGenerate.dataset}
            layoutMode={DetailsListLayoutMode.fixedColumns}
            selectionMode={SelectionMode.none}
            onRenderItemColumn={renderItem}
            onRenderDetailsHeader={renderHeader}
            styles={detailListStyles}
            compact
        />
    );
};

export default ExportDataFields;
