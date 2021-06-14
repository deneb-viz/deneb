import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
    Dropdown,
    IDropdownOption,
    IDropdownProps
} from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';

import Debugger from '../../Debugger';
import { ISpecDataPlaceHolderDropdownProps } from '../../types';
import {
    templatePickerDropdownStyles,
    templateTypeIconOptionStyles
} from '../../config/styles';
import { state } from '../../store';
import { patchTemplatePlaceholder } from '../../store/templateReducer';
import DataFieldLabel from '../elements/DataFieldLabel';
import {
    getPlaceholderDropdownText,
    resolveTypeIcon,
    resolveValueDescriptor
} from '../../api/template';

const SpecDataPlaceHolderDropdown: React.FC<ISpecDataPlaceHolderDropdownProps> = (
    props
) => {
    Debugger.log('Rendering component: [SpecDataPlaceHolderDropdown]...');
    const [selectedItem, setSelectedItem] = React.useState<IDropdownOption>(),
        root = useSelector(state),
        { metadata } = root.visual.dataset,
        dispatch = useDispatch(),
        { datasetField } = props,
        onChange = (
            event: React.FormEvent<HTMLDivElement>,
            item: IDropdownOption
        ): void => {
            setSelectedItem(item);
            dispatch(
                patchTemplatePlaceholder({
                    key: item.data.placeholder.key,
                    objectName: item.text
                })
            );
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
                        icon: resolveTypeIcon(resolveValueDescriptor(v.type))
                    }
                };
            });
        },
        onRenderLabel = (props: IDropdownProps) => {
            return <DataFieldLabel datasetField={datasetField} />;
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
            label={datasetField.name}
            selectedKey={selectedKey}
            onChange={onChange}
            placeholder={placeholderText}
            options={options()}
            styles={templatePickerDropdownStyles}
            onRenderLabel={onRenderLabel}
            onRenderOption={onRenderOption}
        />
    );
};

export default SpecDataPlaceHolderDropdown;
