import { useEffect, useState } from 'react';
import {
    Dropdown,
    DropdownProps,
    makeStyles,
    Option,
    useId
} from '@fluentui/react-components';

import {
    type DatasetField,
    type DatasetFields,
    type UsermetaDatasetField
} from '@deneb-viz/data-core/field';
import { getDatasetFieldsInclusive } from '@deneb-viz/data-core/field';
import { type ModalDialogType } from '../ui';
import { DataTypeIcon } from './data-type-icon';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../state';

type DatasetFieldAssignmentDropdownProps = {
    datasetField: UsermetaDatasetField;
    dialogType: ModalDialogType;
};

const useDataFieldDropdownStyles = makeStyles({
    root: {
        width: '300px',
        '& [role="listbox"]': {
            zIndex: 2000000
        }
    }
});

export const DataFieldDropdown = ({
    datasetField,
    dialogType
}: DatasetFieldAssignmentDropdownProps) => {
    const classes = useDataFieldDropdownStyles();
    const fields = useDenebState((state) => state.dataset.fields);
    const translate = useDenebState((state) => state.i18n.translate);
    const createSliceReducer = useDenebState(
        (state) => state.create.setFieldAssignment
    );
    const fieldUsageSliceReducer = useDenebState(
        (state) => state.fieldUsage.setFieldAssignment
    );
    const selectedKeyDefault = getDefaultSelectedKey(datasetField, fields);
    const [selectedKey, setSelectedKey] = useState<string | undefined>(
        selectedKeyDefault
    );
    const selectedField = getDatasetFieldFromFields(
        selectedKey,
        dialogType,
        fields
    );
    const options = getTemplateDatasetFields(fields);
    const dropdownOptionElements = getFieldOptions(options);
    const onOptionSelect: DropdownProps['onOptionSelect'] = (ev, data) => {
        logDebug('onOptionSelect', { dialogType, data });
        setSelectedKey(() => (data.optionValue as string) ?? undefined);
    };
    useEffect(() => {
        const option = options.find((o) => o.id === selectedKey);
        let reducer:
            | typeof createSliceReducer
            | typeof fieldUsageSliceReducer
            | undefined;
        if (dialogType === 'new') {
            reducer = createSliceReducer;
        } else if (dialogType === 'mapping') {
            reducer = fieldUsageSliceReducer;
        }
        reducer?.({
            key: datasetField.key,
            suppliedObjectKey: option?.id,
            suppliedObjectName: getFieldDisplayName(option)
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
            selectedOptions={selectedKey ? [selectedKey] : []}
            className={classes.root}
            placeholder={translate('Text_Placeholder_Create_Assigned_Field')}
            onOptionSelect={onOptionSelect}
            value={getFieldDisplayName(selectedField)}
        >
            {dropdownOptionElements}
        </Dropdown>
    );
};

/**
 * For the supplied lookup name, returns the dataset field with the same name.
 */
const getDatasetFieldFromFields = (
    lookupKey: string | undefined,
    role: ModalDialogType,
    fields: DatasetFields
): DatasetField | undefined => {
    switch (role) {
        case 'new':
        case 'mapping':
            return getTemplateDatasetFields(fields).find(
                (df) => df.id === lookupKey
            );
        default:
            return undefined;
    }
};

/**
 * If we have a column in our dataset with a name matching a placeholder (and
 * this is not yet assigned), we should get the key for it. If not, we'll init
 * with an empty value and prompt the user to select, as normal.
 */
const getDefaultSelectedKey = (
    field: UsermetaDatasetField,
    fields: DatasetFields
) => fields[field.name]?.id || undefined;

/**
 * Get the display name for a given field, preferring template metadata if available.
 */
const getFieldDisplayName = (field: DatasetField | undefined) => {
    return field?.templateMetadata?.name || field?.name || '';
};

/**
 * Returns a list of `Option` components, representing the available
 * fields from the dataset.
 */
const getFieldOptions = (fields: DatasetField[]) => {
    return fields?.map((df, i) => {
        const displayValue = getFieldDisplayName(df);
        return (
            <Option
                id={`field-${i}`}
                key={df.id}
                value={df.id}
                text={displayValue}
            >
                <DataTypeIcon type={df.templateMetadata?.type} />
                {displayValue}
            </Option>
        );
    });
};

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
const getTemplateDatasetFields = (metadata: DatasetFields) => {
    return Object.values(getDatasetFieldsInclusive(metadata)).reduce<
        DatasetField[]
    >((acc, value) => {
        if (!value) return acc;
        if (Array.isArray(value)) {
            acc.push(...value);
        } else {
            acc.push(value as DatasetField);
        }
        return acc;
    }, []);
};
