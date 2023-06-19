import React from 'react';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';

import store from '../../../store';
import { openEditorPivotItem } from '../../../core/ui/commands';
import { i18nValue } from '../../../core/ui/i18n';
import { resolveEditorPanePivotAria } from '../../../core/ui/aria';
import { TEditorRole } from '../../../features/json-editor';
import { shallow } from 'zustand/shallow';
import { logRender } from '../../../features/logging';

const EditorPanePivot = () => {
    const { editorSelectedOperation } = store(
        (state) => ({
            editorSelectedOperation: state.editorSelectedOperation
        }),
        shallow
    );
    const getTabId = (itemKey: string) => {
        return `editor-pivot-${itemKey}`;
    };
    const handlePivotClick = (item: PivotItem) => {
        openEditorPivotItem(item.props.itemKey as TEditorRole);
    };
    logRender('EditorPanePivot');
    return (
        <div className='editor-pane-pivot'>
            <Pivot
                aria-label={resolveEditorPanePivotAria()}
                selectedKey={editorSelectedOperation}
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
