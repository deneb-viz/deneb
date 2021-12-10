import React, { useEffect } from 'react';

import {
    Dropdown,
    IDropdownOption,
    IDropdownStyles
} from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import reduce from 'lodash/reduce';

import store from '../../store';
import { resolveValueDescriptor } from '../../core/template';
import { ITemplateDatasetField } from '../../core/template/schema';
import { getDataTypeIcon } from '../../core/ui/icons';
import { getPlaceholderDropdownText } from '../../core/ui/labels';
import { templateTypeIconOptionStyles } from '../../core/ui/fluent';
import { TModalDialogType } from '../../core/ui/modal';
import { IVisualValueMetadata } from '../../core/data/dataset';

interface IDatasetFieldAssignmentDropdownProps {
    datasetField: ITemplateDatasetField;
    dialogType: TModalDialogType;
    dataset: ITemplateDatasetField[];
}

const templatePickerDropdownStyles: Partial<IDropdownStyles> = {
    dropdown: { width: 300 }
};

const getDropDownOptions = (
    datasetField: ITemplateDatasetField,
    metadata: IVisualValueMetadata
): IDropdownOption[] =>
    reduce(
        metadata,
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

const DatasetFieldAssignmentDropdown: React.FC<IDatasetFieldAssignmentDropdownProps> =
    ({ datasetField, dialogType }) => {
        const [selectedItem, setSelectedItem] =
                React.useState<IDropdownOption>(null),
            { dataset, updateTemplatePlaceholder, updateEditorFieldMapping } =
                store((state) => state),
            { metadata } = dataset,
            onChange = (
                event: React.FormEvent<HTMLDivElement>,
                item: IDropdownOption
            ): void => {
                setSelectedItem(item);
                const objectName = item.text;
                switch (dialogType) {
                    case 'new':
                        return updateTemplatePlaceholder({
                            key: item.data.placeholder.key,
                            objectName
                        });
                    case 'mapping':
                        return updateEditorFieldMapping({
                            key: datasetField.name,
                            objectName
                        });
                    default:
                        return null;
                }
            },
            options = () => getDropDownOptions(datasetField, metadata),
            onRenderOption = (option: IDropdownOption) => {
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
            },
            placeholderText = getPlaceholderDropdownText(datasetField),
            selectedKey = selectedItem
                ? selectedItem.key
                : dataset.metadata[datasetField.name]?.queryName || null;
        return (
            <Dropdown
                ariaLabel={datasetField.name}
                selectedKey={selectedKey}
                onChange={onChange}
                placeholder={placeholderText}
                options={options()}
                styles={templatePickerDropdownStyles}
                onRenderOption={onRenderOption}
            />
        );
    };

export default DatasetFieldAssignmentDropdown;
