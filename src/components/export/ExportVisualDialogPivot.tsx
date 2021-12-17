import * as React from 'react';
import { Pivot, PivotItem, IPivotStyles } from '@fluentui/react/lib/Pivot';
import { IStyleSet } from '@fluentui/merge-styles';

import store from '../../store';
import { TExportOperation } from '../../core/template';
import { i18nValue } from '../../core/ui/i18n';
import { resolveTemplateExportPivotAria } from '../../core/ui/aria';

const exportPivotStyles: Partial<IStyleSet<IPivotStyles>> = {
    itemContainer: {
        marginTop: '10px',
        height: '100%'
    }
};

const ExportVisualDialogPivot = () => {
    const { templateSelectedExportOperation, updateSelectedExportOperation } =
            store(),
        getTabId = (itemKey: string) => {
            return `export-spec-pivot-${itemKey}`;
        },
        handlePivotClick = (item: PivotItem) => {
            updateSelectedExportOperation(
                item.props.itemKey as TExportOperation
            );
        };

    return (
        <div className='export-spec-dialog-pivot'>
            <Pivot
                aria-label={resolveTemplateExportPivotAria()}
                selectedKey={templateSelectedExportOperation}
                getTabId={getTabId}
                styles={exportPivotStyles}
                onLinkClick={handlePivotClick}
                headersOnly={true}
            >
                <PivotItem
                    headerText={i18nValue('Template_Export_Information')}
                    itemKey='information'
                />
                <PivotItem
                    headerText={i18nValue('Template_Export_Dataset')}
                    itemKey='dataset'
                />
                <PivotItem
                    headerText={i18nValue('Template_Export_Json')}
                    itemKey='template'
                />
            </Pivot>
        </div>
    );
};

export default ExportVisualDialogPivot;
