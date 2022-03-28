import React from 'react';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';

import { useStoreProp } from '../../../store';
import { openEditorPivotItem } from '../../../core/ui/commands';
import { TEditorRole } from '../../../core/services/JsonEditorServices';
import { i18nValue } from '../../../core/ui/i18n';
import { resolveEditorPanePivotAria } from '../../../core/ui/aria';
import { reactLog } from '../../../core/utils/logger';

const EditorPanePivot = () => {
    const editorSelectedOperation = useStoreProp<TEditorRole>(
        'editorSelectedOperation'
    );
    const getTabId = (itemKey: string) => {
        return `editor-pivot-${itemKey}`;
    };
    const handlePivotClick = (item: PivotItem) => {
        openEditorPivotItem(item.props.itemKey as TEditorRole);
    };
    reactLog('Rendering [EditorPanePivot]');
    return (
        <div className='editor-pane-pivot'>
            <Pivot
                aria-label={resolveEditorPanePivotAria()}
                selectedKey={editorSelectedOperation}
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
