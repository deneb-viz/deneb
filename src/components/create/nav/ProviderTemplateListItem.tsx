import React from 'react';

import { getRTL } from '@fluentui/react/lib/Utilities';
import { Icon } from '@fluentui/react/lib/Icon';

import { templatePickerItemListStyles } from '../../../config/styles';
import store from '../../../store';
import { IDenebTemplateMetadata } from '../../../core/template/schema';
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
    const { updateSelectedTemplate } = store((state) => state),
        handleSelect = (item: Spec | TopLevelSpec, index: number) => {
            updateSelectedTemplate(index);
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
