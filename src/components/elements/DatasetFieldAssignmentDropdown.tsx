import * as React from 'react';

import {
    Dropdown,
    IDropdownOption,
    IDropdownStyles
} from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';

import store from '../../store';
import { resolveValueDescriptor } from '../../core/template';
import { ITemplateDatasetField } from '../../core/template/schema';
import { getDataTypeIcon } from '../../core/ui/icons';
import { getPlaceholderDropdownText } from '../../core/ui/labels';
import { templateTypeIconOptionStyles } from '../../core/ui/fluent';

interface IDatasetFieldAssignmentDropdownProps {
    datasetField: ITemplateDatasetField;
}

const templatePickerDropdownStyles: Partial<IDropdownStyles> = {
    dropdown: { width: 300 }
};

const DatasetFieldAssignmentDropdown: React.FC<IDatasetFieldAssignmentDropdownProps> =
    (props) => {
        const [selectedItem, setSelectedItem] =
                React.useState<IDropdownOption>(),
            { dataset, updateTemplatePlaceholder } = store((state) => state),
            { metadata } = dataset,
            { datasetField } = props,
            onChange = (
                event: React.FormEvent<HTMLDivElement>,
                item: IDropdownOption
            ): void => {
                setSelectedItem(item);
                updateTemplatePlaceholder({
                    key: item.data.placeholder.key,
                    objectName: item.text
                });
            },
            options = (): IDropdownOption[] => {
                return Object.entries(metadata).map(([k, v]) => {
                    let disabled =
                        (v.isMeasure && datasetField.kind === 'column') ||
                        (v.isColumn && datasetField.kind === 'measure');
                    return {
                        key: v.queryName,
                        text: k,
                        disabled: disabled,
                        data: {
                            placeholder: datasetField,
                            icon: getDataTypeIcon(
                                resolveValueDescriptor(v.type)
                            )
                        }
                    };
                });
            },
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
            selectedKey = selectedItem ? selectedItem.key : undefined;
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
