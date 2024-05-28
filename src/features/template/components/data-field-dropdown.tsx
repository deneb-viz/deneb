import React, { useEffect, useState } from 'react';
import {
    Dropdown,
    DropdownProps,
    Option,
    useId
} from '@fluentui/react-components';
import reduce from 'lodash/reduce';

import store, { getState } from '../../../store';
import { TModalDialogType } from '../../modal-dialog';
import { IVisualDatasetField, IVisualDatasetFields } from '../../../core/data';
import { logDebug, logRender } from '../../logging';
import { useTemplateStyles } from '.';
import { getI18nValue } from '../../i18n';
import { DataTypeIcon } from './data-type-icon';
import { UsermetaDatasetField, utils } from '@deneb-viz/core-dependencies';

interface IDatasetFieldAssignmentDropdownProps {
    datasetField: UsermetaDatasetField;
    dialogType: TModalDialogType;
}

export const DataFieldDropDown: React.FC<IDatasetFieldAssignmentDropdownProps> =
    ({ datasetField, dialogType }) => {
        const classes = useTemplateStyles();
        const {
            dataset: { fields }
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
            intendedItem !== selectedKey && setSelectedKey(() => intendedItem);
        };
        const onOptionSelect: DropdownProps['onOptionSelect'] = (ev, data) => {
            logDebug('onOptionSelect', { dialogType, data });
            setSelectedKey(() => data.optionValue);
        };
        resolveSelectedKey();
        useEffect(() => {
            if (!selectedField) {
                setSelectedKey(selectedKeyDefault);
            }
        }, [selectedField?.queryName]);
        useEffect(() => {
            const option = options.find((o) => o.queryName === selectedKey);
            getFieldAssignmentReducer(dialogType)?.({
                key: datasetField.key,
                suppliedObjectKey: option?.queryName,
                suppliedObjectName: option?.templateMetadata?.name
            });
        }, [selectedKey]);
        const dropdownId = useId('dataset-field');
        logRender(`DataFieldDropdown ${datasetField.key}`, {
            datasetField,
            dialogType,
            fields,
            selectedField,
            selectedKey,
            selectedKeyDefault,
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
                value={selectedField?.templateMetadata?.name || null}
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
    field: UsermetaDatasetField,
    fields: IVisualDatasetFields
) => fields[field.name]?.queryName || null;

/**
 * Based on the role, get the appropriate reducer for setting the field
 * mapping.
 */
const getFieldAssignmentReducer = (role: TModalDialogType) => {
    const store = getState();
    return store[getRoleToSlice(role)]?.setFieldAssignment;
};

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
 * Retrieve the name of the store slice we should use, based on the role.
 */
const getRoleToSlice = (role: TModalDialogType) => {
    switch (role) {
        case 'new':
            return 'create';
        case 'mapping':
            return 'fieldUsage';
        default:
            return null;
    }
};

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
const getTemplateDatasetFields = (metadata: IVisualDatasetFields) =>
    reduce(
        utils.getDatasetFieldsInclusive(metadata),
        (result, value) => {
            return result.concat(value);
        },
        [] as IVisualDatasetField[]
    );
