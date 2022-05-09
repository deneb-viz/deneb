import React from 'react';

import { getRTL } from '@fluentui/react/lib/Utilities';
import { Icon } from '@fluentui/react/lib/Icon';

import store from '../../../store';
import { IDenebTemplateMetadata } from '../../template';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import { TEMPLATE_PICKER_LIST_ITEM_STYLES } from '../../template';

interface IProviderTemplateListItemProps {
    item: Spec | TopLevelSpec;
    index: number | undefined;
}

export const CreateVisualProviderTemplateListItem: React.FC<IProviderTemplateListItemProps> =
    ({ item, index }) => {
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
                className={TEMPLATE_PICKER_LIST_ITEM_STYLES.itemCell}
                data-is-focusable
                onClick={handleSelectWithIndex}
                role='button'
            >
                <div className={TEMPLATE_PICKER_LIST_ITEM_STYLES.itemContent}>
                    <div className={TEMPLATE_PICKER_LIST_ITEM_STYLES.itemName}>
                        {
                            (item?.usermeta as IDenebTemplateMetadata)
                                ?.information?.name
                        }
                    </div>
                </div>
                <Icon
                    className={TEMPLATE_PICKER_LIST_ITEM_STYLES.chevron}
                    iconName={iconName}
                />
            </div>
        );
    };
