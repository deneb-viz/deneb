import powerbi from 'powerbi-visuals-api';
import VisualDataRoleKind = powerbi.VisualDataRoleKind;

import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';

import Debugger from '../../Debugger';
import { templateService } from '../../services';
import { ISpecDataPlaceHolderDropdownProps } from '../../types';
import { templatePickerDropdownStyles } from '../../config/styles';
import { state } from '../../store';
import { patchTemplatePlaceholder } from '../../store/templateReducer';

const SpecDataPlaceHolderDropdown: React.FC<ISpecDataPlaceHolderDropdownProps> = (
    props
) => {
    Debugger.log('Rendering component: [FieldDropDown]...');
    const [selectedItem, setSelectedItem] = React.useState<IDropdownOption>(),
        root = useSelector(state),
        { dataset } = root.visual,
        { metadata } = dataset,
        dispatch = useDispatch(),
        { placeholder } = props,
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
                    (v.isMeasure &&
                        placeholder.allowKind ===
                            VisualDataRoleKind.Grouping) ||
                    (v.isColumn &&
                        placeholder.allowKind === VisualDataRoleKind.Measure);
                return {
                    key: v.queryName,
                    text: k,
                    disabled: disabled,
                    data: {
                        placeholder: placeholder
                    }
                };
            });
        },
        placeholderText = templateService.getPlaceholderDropdownText(
            placeholder
        ),
        selectedKey = selectedItem ? selectedItem.key : undefined;
    return (
        <Dropdown
            label={placeholder.displayName}
            selectedKey={selectedKey}
            onChange={onChange}
            placeholder={placeholderText}
            options={options()}
            styles={templatePickerDropdownStyles}
        />
    );
};

export default SpecDataPlaceHolderDropdown;
