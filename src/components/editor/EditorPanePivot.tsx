import * as React from 'react';
import { useSelector } from 'react-redux';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';

import { state } from '../../store';
import { openEditorPivotItem } from '../../core/ui/commands';
import { TEditorRole } from '../../core/services/JsonEditorServices';
import { i18nValue } from '../../core/ui/i18n';
import { resolveEditorPanePivotAria } from '../../core/ui/aria';

const EditorPanePivot = () => {
    const { selectedOperation } = useSelector(state).visual,
        getTabId = (itemKey: string) => {
            return `editor-pivot-${itemKey}`;
        },
        handlePivotClick = (item: PivotItem) => {
            openEditorPivotItem(item.props.itemKey as TEditorRole);
        };

    return (
        <div className='editor-pane-pivot'>
            <Pivot
                aria-label={resolveEditorPanePivotAria()}
                selectedKey={selectedOperation}
                // eslint-disable-next-line react/jsx-no-bind
                onLinkClick={handlePivotClick}
                headersOnly={true}
                getTabId={getTabId}
                overflowBehavior='menu'
            >
                <PivotItem
                    headerText={i18nValue('Editor_Role_Spec')}
                    itemKey='spec'
                    itemIcon='BarChartVertical'
                />
                <PivotItem
                    headerText={i18nValue('Editor_Role_Config')}
                    itemKey='config'
                    itemIcon='EditStyle'
                />
                <PivotItem
                    headerText={i18nValue('Editor_Role_Settings')}
                    itemKey='settings'
                    itemIcon='Settings'
                />
            </Pivot>
        </div>
    );
};

export default EditorPanePivot;
