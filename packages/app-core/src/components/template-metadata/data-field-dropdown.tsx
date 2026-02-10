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
    const selectedFieldEntry = getDatasetFieldEntryFromFields(
        selectedKey,
        dialogType,
        fields
    );
    const options = getTemplateDatasetFieldEntries(fields);
    const dropdownOptionElements = getFieldOptions(options);
    const onOptionSelect: DropdownProps['onOptionSelect'] = (ev, data) => {
        logDebug('onOptionSelect', { dialogType, data });
        setSelectedKey(() => (data.optionValue as string) ?? undefined);
    };
    useEffect(() => {
        const option = options.find(
            ([key, field]) => (field.id ?? key) === selectedKey
        );
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
            suppliedObjectKey: option ? (option[1].id ?? option[0]) : undefined,
            suppliedObjectName: option ? option[0] : undefined
        });
    }, [selectedKey]);
    const dropdownId = useId('dataset-field');
    logRender(`DataFieldDropdown ${datasetField.key}`, {
        datasetField,
        dialogType,
        fields,
        selectedFieldEntry,
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
            value={selectedFieldEntry ? selectedFieldEntry[0] : ''}
        >
            {dropdownOptionElements}
        </Dropdown>
    );
};

/**
 * For the supplied lookup key, returns the dataset field entry [key, field] with the matching id.
 */
const getDatasetFieldEntryFromFields = (
    lookupKey: string | undefined,
    role: ModalDialogType,
    fields: DatasetFields
): [string, DatasetField] | undefined => {
    switch (role) {
        case 'new':
        case 'mapping':
            return getTemplateDatasetFieldEntries(fields).find(
                ([key, field]) => (field.id ?? key) === lookupKey
            );
        default:
            return undefined;
    }
};

/**
 * If we have a column in our dataset with a name matching a placeholder (and
 * this is not yet assigned), we should get the id (or key) for it. If not, we'll init
 * with an empty value and prompt the user to select, as normal.
 */
const getDefaultSelectedKey = (
    field: UsermetaDatasetField,
    fields: DatasetFields
) => {
    const matchingField = fields[field.name];
    if (!matchingField) return undefined;
    return matchingField.id ?? field.name;
};

/**
 * Returns a list of `Option` components, representing the available
 * fields from the dataset.
 */
const getFieldOptions = (entries: [string, DatasetField][]) => {
    return entries?.map(([key, df], i) => {
        const optionValue = df.id ?? key;
        return (
            <Option
                id={`field-${i}`}
                key={optionValue}
                value={optionValue}
                text={key}
            >
                <DataTypeIcon type={df.dataType} />
                {key}
            </Option>
        );
    });
};

/**
 * Get all field entries from a supplied set of metadata for dropdown selection.
 * Returns array of [key, field] tuples. Unlike template operations, the dropdown
 * should show ALL available fields, not just those with role/dataType defined.
 */
const getTemplateDatasetFieldEntries = (
    metadata: DatasetFields
): [string, DatasetField][] => {
    return Object.entries(metadata).filter(
        (entry): entry is [string, DatasetField] => entry[1] !== undefined
    );
};
