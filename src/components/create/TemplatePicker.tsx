import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
    FocusZone,
    FocusZoneDirection
} from 'office-ui-fabric-react/lib/FocusZone';
import { getRTL } from 'office-ui-fabric-react/lib/Utilities';
import { Text } from 'office-ui-fabric-react/lib/Text';
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import { List } from 'office-ui-fabric-react/lib/List';
import { Stack } from 'office-ui-fabric-react/lib/Stack';

import Debugger from '../../Debugger';
import { templatePickerItemListStyles } from '../../config/styles';
import { state } from '../../store';
import { updateSelectedTemplate } from '../../store/templateReducer';
import { IVegaLiteTemplate, IVegaTemplate } from '../../types';
import {
    templatePickerStackStyles,
    templatePickerStackItemListStyles,
    templatePickerNonShrinkingStackItemStyles,
    templatePickerStackTokens
} from '../../config/styles';
import SpecDataPlaceHolderDropdown from './SpecDataPlaceHolderDropdown';

const TemplatePicker: React.FC = () => {
    Debugger.log('Rendering Component: [TemplatePicker]...');
    const root = useSelector(state),
        { templates } = root,
        {
            selectedProvider,
            selectedTemplateIndex,
            templateToApply
        } = templates,
        localTemplates = templates[selectedProvider],
        dispatch = useDispatch(),
        handleSelect = (
            item: IVegaTemplate | IVegaLiteTemplate,
            index: number
        ) => {
            dispatch(updateSelectedTemplate(index));
        },
        onRenderCell = (
            item: IVegaTemplate | IVegaLiteTemplate,
            index: number | undefined,
            containsFocus: boolean
        ): JSX.Element => {
            const iconName = getRTL() ? 'ChevronLeft' : 'ChevronRight',
                handleSelectWithIndex = (
                    event: React.MouseEvent<HTMLDivElement, MouseEvent>
                ) => {
                    handleSelect(item, index);
                };
            return (
                <div
                    className={templatePickerItemListStyles.itemCell}
                    data-is-focusable={true}
                    onClick={handleSelectWithIndex}
                    role='button'
                >
                    <div className={templatePickerItemListStyles.itemContent}>
                        <div className={templatePickerItemListStyles.itemName}>
                            {item.name}
                        </div>
                    </div>
                    <Icon
                        className={templatePickerItemListStyles.chevron}
                        iconName={iconName}
                    />
                </div>
            );
        };
    return (
        <Stack
            horizontal
            styles={templatePickerStackStyles}
            tokens={templatePickerStackTokens}
        >
            <Stack.Item
                grow
                disableShrink
                styles={templatePickerStackItemListStyles}
            >
                <FocusZone direction={FocusZoneDirection.vertical}>
                    <List items={localTemplates} onRenderCell={onRenderCell} />
                </FocusZone>
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={templatePickerNonShrinkingStackItemStyles}
            >
                <div>
                    <p>
                        <Text
                            variant='large'
                            className='ms-fontWeight-semibold'
                        >
                            {templateToApply?.name}
                        </Text>
                    </p>
                    <p>{templateToApply?.description}</p>
                    {enumeratePlaceholders()}
                </div>
            </Stack.Item>
        </Stack>
    );
};

function enumeratePlaceholders() {
    Debugger.log('Enumerating template placeholders...');
    const root = useSelector(state),
        { visual, templates } = root,
        { i18n } = visual,
        { templateToApply } = templates;
    switch (templateToApply?.placeholders?.length || 0) {
        case 0: {
            return (
                <p>
                    <Text variant='small'>
                        {i18n.getDisplayName(
                            'Data_Placeholder_Assistive_No_PH'
                        )}
                    </Text>
                </p>
            );
        }
        default: {
            return (
                <>
                    <p>
                        <Text variant='small'>
                            {i18n.getDisplayName(
                                'Data_Placeholder_Assistive_PH'
                            )}
                        </Text>
                    </p>
                    {templateToApply?.placeholders?.map((ph) => (
                        <div>
                            <SpecDataPlaceHolderDropdown placeholder={ph} />
                        </div>
                    ))}
                </>
            );
        }
    }
}

export default TemplatePicker;
