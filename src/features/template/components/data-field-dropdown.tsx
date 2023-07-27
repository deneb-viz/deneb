import React, { useEffect, useState } from 'react';
import {
    Dropdown,
    DropdownProps,
    Option,
    useId
} from '@fluentui/react-components';
import reduce from 'lodash/reduce';

import store, { getState } from '../../../store';
import { ITemplateDatasetField } from '..';
import { TModalDialogType } from '../../modal-dialog';
import { IVisualDatasetField, IVisualDatasetFields } from '../../../core/data';
import { getDatasetFieldsInclusive } from '../../../core/data/fields';
import { logRender } from '../../logging';
import { useTemplateStyles } from '.';
import { getI18nValue } from '../../i18n';
import { DataTypeIcon } from './data-type-icon';

interface IDatasetFieldAssignmentDropdownProps {
    datasetField: ITemplateDatasetField;
    dialogType: TModalDialogType;
}

export const DataFieldDropDown: React.FC<IDatasetFieldAssignmentDropdownProps> =
    ({ datasetField, dialogType }) => {
        const classes = useTemplateStyles();
        const {
            dataset: { fields },
            create: { setFieldAssignment },
            updateEditorFieldMapping
        } = store((state) => state);
        const selectedKeyDefault = getDefaultSelectedKey(datasetField, fields);
        const [selectedKey, setSelectedKey] =
            useState<string>(selectedKeyDefault);
        const selectedField = getDatasetField(selectedKey, dialogType);
        const options = getTemplateDatasetFields(fields);
        const dropdownOptionElements = getFieldOptions(options);
        const resolveSelectedKey = () => {
            const intendedItem = selectedKey
                ? selectedKey
                : fields[datasetField.name]?.queryName || null;
            intendedItem !== selectedKey && setSelectedKey(intendedItem);
        };
        const onOptionSelect: DropdownProps['onOptionSelect'] = (ev, data) => {
            setSelectedKey(() => data.optionValue);
        };
        resolveSelectedKey();
        useEffect(() => {
            const option = options.find((o) => o.queryName === selectedKey);
            switch (dialogType) {
                case 'new':
                    return setFieldAssignment({
                        key: datasetField.key,
                        suppliedObjectName: option?.templateMetadata?.name
                    });
                case 'mapping':
                    return updateEditorFieldMapping({
                        key: datasetField.name,
                        objectName: option?.templateMetadata?.name
                    });
                default:
                    return null;
            }
        }, [selectedKey]);
        const dropdownId = useId('dataset-field');
        logRender('DataFieldDropdown', {
            datasetField,
            dialogType,
            fields,
            selectedKey,
            options
        });
        return (
            <Dropdown
                id={dropdownId}
                inlinePopup
                defaultSelectedOptions={[selectedKey]}
                className={classes.datasetAssignmentDropdown}
                placeholder={getI18nValue(
                    'Text_Placeholder_Create_Assigned_Field'
                )}
                onOptionSelect={onOptionSelect}
                value={selectedField?.templateMetadata?.name}
            >
                {dropdownOptionElements}
            </Dropdown>
        );
    };

/**
 * For the supplied lookup name, returns the dataset field with the same name.
 */
const getDatasetField = (
    lookupKey: string,
    role: TModalDialogType
): IVisualDatasetField => {
    const { dataset } = getState();
    switch (role) {
        case 'new':
        case 'mapping':
            return getTemplateDatasetFields(dataset.fields).find(
                (df) => df.queryName === lookupKey
            );
        default:
            return null;
    }
};

/**
 * If we have a column in our dataset with a name matching a placeholder (and
 * this is not yet assigned), we should get the key for it. If not, we'll init
 * with an empty value and prompt the user to select, as normal.
 */
const getDefaultSelectedKey = (
    field: ITemplateDatasetField,
    fields: IVisualDatasetFields
) => fields[field.name]?.queryName || null;

/**
 * Returns a list of `Option` components, representing the available
 * fields from the dataset.
 */
const getFieldOptions = (fields: IVisualDatasetField[]) => {
    return fields?.map((df, i) => {
        return (
            <Option
                id={`field-${i}`}
                key={df.queryName}
                value={df.queryName}
                text={df.displayName}
            >
                <DataTypeIcon type={df.templateMetadata.type} />
                {df.templateMetadata.name}
            </Option>
        );
    });
};

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
const getTemplateDatasetFields = (metadata: IVisualDatasetFields) =>
    reduce(
        getDatasetFieldsInclusive(metadata),
        (result, value) => {
            return result.concat(value);
        },
        [] as IVisualDatasetField[]
    );
