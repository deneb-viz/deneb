import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { getRTL } from '@fluentui/react/lib/Utilities';
import { Icon } from '@fluentui/react/lib/Icon';

import { templatePickerItemListStyles } from '../../config/styles';
import { state } from '../../store';
import { updateSelectedTemplate } from '../../store/templates';
import { IDenebTemplateMetadata } from '../../core/template/schema';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';

interface IProviderTemplateListItemProps {
    item: Spec | TopLevelSpec;
    index: number | undefined;
}

const ProviderTemplateListItem: React.FC<IProviderTemplateListItemProps> = ({
    item,
    index
}) => {
    const root = useSelector(state),
        dispatch = useDispatch(),
        handleSelect = (item: Spec | TopLevelSpec, index: number) => {
            dispatch(updateSelectedTemplate(index));
        },
        iconName = getRTL() ? 'ChevronLeft' : 'ChevronRight',
        handleSelectWithIndex = () => {
            handleSelect(item, index);
        };
    return (
        <div
            className={templatePickerItemListStyles.itemCell}
            data-is-focusable
            onClick={handleSelectWithIndex}
            role='button'
        >
            <div className={templatePickerItemListStyles.itemContent}>
                <div className={templatePickerItemListStyles.itemName}>
                    {
                        (item?.usermeta as IDenebTemplateMetadata)?.information
                            ?.name
                    }
                </div>
            </div>
            <Icon
                className={templatePickerItemListStyles.chevron}
                iconName={iconName}
            />
        </div>
    );
};

export default ProviderTemplateListItem;
