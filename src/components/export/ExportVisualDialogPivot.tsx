import React from 'react';
import { Pivot, PivotItem, IPivotStyles } from '@fluentui/react/lib/Pivot';
import { IStyleSet } from '@fluentui/merge-styles';

import { useStoreProp } from '../../store';
import { TExportOperation } from '../../core/template';
import { i18nValue } from '../../core/ui/i18n';
import { resolveTemplateExportPivotAria } from '../../core/ui/aria';
import { reactLog } from '../../core/utils/logger';

const exportPivotStyles: Partial<IStyleSet<IPivotStyles>> = {
    itemContainer: {
        marginTop: '10px',
        height: '100%'
    }
};

const ExportVisualDialogPivot = () => {
    const templateSelectedExportOperation: TExportOperation = useStoreProp(
        'templateSelectedExportOperation'
    );
    const updateSelectedExportOperation: (
        templateSelectedExportOperation: TExportOperation
    ) => void = useStoreProp('updateSelectedExportOperation');

    const getTabId = (itemKey: string) => {
        return `export-spec-pivot-${itemKey}`;
    };
    const handlePivotClick = (item: PivotItem) => {
        updateSelectedExportOperation(item.props.itemKey as TExportOperation);
    };
    reactLog('Rendering [ExportVisualDialogPivot]');
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
