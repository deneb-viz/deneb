import React, { useEffect } from 'react';

import {
    Dropdown,
    IDropdownOption,
    IDropdownStyles
} from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import reduce from 'lodash/reduce';

import store from '../../../store';
import { ITemplateDatasetField } from '..';
import { getDataTypeIcon } from '../../../core/ui/icons';
import { getPlaceholderDropdownText } from '../../../core/ui/labels';
import { templateTypeIconOptionStyles } from '../../../core/ui/fluent';
import { TModalDialogType } from '../../modal-dialog';
import { IVisualDatasetFields } from '../../../core/data';
import { getDatasetFieldsInclusive } from '../../../core/data/fields';
import { resolveValueDescriptor } from '../fields';

interface IDatasetFieldAssignmentDropdownProps {
    datasetField: ITemplateDatasetField;
    dialogType: TModalDialogType;
    dataset: ITemplateDatasetField[];
}

interface IDropdownOptionDatum {
    placeholder: ITemplateDatasetField;
    icon: string;
}

const templatePickerDropdownStyles: Partial<IDropdownStyles> = {
    dropdown: { width: 300 }
};

const getDropDownOptions = (
    datasetField: ITemplateDatasetField,
    fields: IVisualDatasetFields
): IDropdownOption<IDropdownOptionDatum>[] =>
    reduce(
        fields,
        (result, value, key) => {
            return result.concat({
                key: value.queryName,
                text: key,
                data: {
                    placeholder: datasetField,
                    icon: getDataTypeIcon(resolveValueDescriptor(value.type))
                }
            });
        },
        [] as IDropdownOption[]
    );

const onRenderOption = (option: IDropdownOption) => {
    return (
        <div>
            {option.data && option.data.icon && (
                <Icon
                    styles={templateTypeIconOptionStyles}
                    iconName={option.data.icon}
                    aria-hidden='true'
                    title={option.data.placeholder.description}
                />
            )}
            <span>{option.text}</span>
        </div>
    );
};

const DatasetFieldAssignmentDropdown: React.FC<IDatasetFieldAssignmentDropdownProps> =
    ({ datasetField, dialogType }) => {
        const [selectedItem, setSelectedItem] = React.useState<string>(null);
        const { dataset, updateTemplatePlaceholder, updateEditorFieldMapping } =
            store((state) => state);
        const options = () =>
            getDropDownOptions(
                datasetField,
                getDatasetFieldsInclusive(dataset.fields)
            );
        const placeholderText = getPlaceholderDropdownText(datasetField);
        const resolveSelectedItem = () => {
            const intendedItem = selectedItem
                ? selectedItem
                : dataset.fields[datasetField.name]?.queryName || null;
            intendedItem !== selectedItem && setSelectedItem(intendedItem);
        };
        const onChange = (
            event: React.FormEvent<HTMLDivElement>,
            item: IDropdownOption
        ): void => {
            setSelectedItem(item.key.toString());
        };
        resolveSelectedItem();
        useEffect(() => {
            const option = options().find((o) => o.key === selectedItem);
            switch (dialogType) {
                case 'new':
                    return updateTemplatePlaceholder({
                        key: option?.data?.placeholder?.key,
                        objectName: option?.text
                    });
                case 'mapping':
                    return updateEditorFieldMapping({
                        key: datasetField.name,
                        objectName: option?.text
                    });
                default:
                    return null;
            }
        }, [selectedItem]);

        return (
            <Dropdown
                ariaLabel={datasetField.name}
                selectedKey={selectedItem}
                onChange={onChange}
                placeholder={placeholderText}
                options={options()}
                styles={templatePickerDropdownStyles}
                onRenderOption={onRenderOption}
            />
        );
    };

export default DatasetFieldAssignmentDropdown;
