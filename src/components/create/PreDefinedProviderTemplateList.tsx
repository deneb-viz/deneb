import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { FocusZone, FocusZoneDirection } from '@fluentui/react/lib/FocusZone';
import { getRTL } from '@fluentui/react/lib/Utilities';
import { Icon } from '@fluentui/react/lib/Icon';
import { List } from '@fluentui/react/lib/List';

import Debugger from '../../Debugger';
import { templatePickerItemListStyles } from '../../config/styles';
import { state } from '../../store';
import { updateSelectedTemplate } from '../../store/templates';
import { IDenebTemplateMetadata } from '../../core/template/schema';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';

const PreDefinedProviderTemplateList: React.FC = () => {
    Debugger.log('Rendering Component: [PreDefinedProviderTemplateList]...');
    const root = useSelector(state),
        { templates } = root,
        { templateProvider: selectedProvider } = templates,
        localTemplates = templates[selectedProvider],
        dispatch = useDispatch(),
        handleSelect = (item: Spec | TopLevelSpec, index: number) => {
            dispatch(updateSelectedTemplate(index));
        },
        onRenderCell = (
            item: Spec | TopLevelSpec,
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
                            {
                                (item?.usermeta as IDenebTemplateMetadata)
                                    ?.information?.name
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
    return (
        <FocusZone direction={FocusZoneDirection.vertical}>
            <List items={localTemplates} onRenderCell={onRenderCell} />
        </FocusZone>
    );
};

export default PreDefinedProviderTemplateList;
