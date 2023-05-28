import React from 'react';
import {
    Pivot,
    PivotItem,
    IPivotStyles,
    IPivotItemProps
} from '@fluentui/react/lib/Pivot';
import { Icon } from '@fluentui/react/lib/Icon';

import store from '../../../store';
import { openPreviewPivotItem } from '../../../core/ui/commands';
import { i18nValue } from '../../../core/ui/i18n';
import { TPreviewPivotRole } from '../../../core/ui/advancedEditor';
import { reactLog } from '../../../core/utils/reactLog';
import { theme } from '../../../core/ui/fluent';
import { logHasErrors } from '../../debug-area';

const pivotStyles: Partial<IPivotStyles> = {
    root: {
        padding: null,
        paddingLeft: 5,
        paddingRight: 5
    },
    link: {
        lineHeight: 28,
        height: 28
    }
};

/**
 * Handles custom rendering of the log tab (showing any additional
 * notifications).
 */
const renderLogTab = (
    link?: IPivotItemProps,
    defaultRenderer?: (link?: IPivotItemProps) => JSX.Element | null
): JSX.Element | null => {
    if (!link || !defaultRenderer) {
        return null;
    }
    return (
        <span className='ms-Pivot-linkContent' style={{ flex: '0 1 100%' }}>
            <Icon
                iconName={link.itemIcon}
                className='ms-Pivot-Icon'
                style={{ marginRight: 4 }}
            />
            {defaultRenderer({ ...link, itemIcon: undefined })}
            {getTitleStatus()}
        </span>
    );
};

/**
 * Resolve what should be displayed as a suffix in the log tab.
 */
const getTitleStatus = () => {
    const error = logHasErrors();
    const { editorLogWarns } = store((state) => state);
    const verticalAlign = 'top';
    switch (true) {
        case error:
            return (
                <span style={{ color: theme.palette.redDark, verticalAlign }}>
                    &nbsp;({i18nValue('Pivot_Log_Error_Badge')})
                </span>
            );
        case editorLogWarns?.length > 0:
            return (
                <span style={{ color: theme.palette.themeDark, verticalAlign }}>
                    &nbsp;({editorLogWarns.length})
                </span>
            );
        default:
            return <span />;
    }
};

export const DebugModePivot = () => {
    const { editorPreviewAreaSelectedPivot } = store((state) => state);
    const getTabId = (itemKey: string) => {
        return `preview-toolbar-pivot-${itemKey}`;
    };
    const handlePivotClick = (item: PivotItem) => {
        openPreviewPivotItem(item.props.itemKey as TPreviewPivotRole);
    };
    reactLog('Rendering [DebugModePivot');
    return (
        <div className='preview-toolbar-pivot'>
            <Pivot
                aria-label={i18nValue('Pivot_Editor_Preview')}
                selectedKey={editorPreviewAreaSelectedPivot}
                onLinkClick={handlePivotClick}
                headersOnly={true}
                getTabId={getTabId}
                overflowBehavior='none'
                styles={pivotStyles}
            >
                <PivotItem
                    headerText={i18nValue('Pivot_Preview_Data')}
                    itemKey='data'
                    itemIcon='Table'
                />
                <PivotItem
                    headerText={i18nValue('Pivot_Preview_Sig')}
                    itemKey='signal'
                    itemIcon='NetworkTower'
                />
                <PivotItem
                    headerText={i18nValue('Pivot_Preview_Log')}
                    itemKey='log'
                    itemIcon='DietPlanNotebook'
                    onRenderItemLink={renderLogTab}
                />
            </Pivot>
        </div>
    );
};
