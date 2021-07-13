import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Pivot, PivotItem } from '@fluentui/react';

import { state } from '../../store';
import { updateSelectedExportOperation } from '../../store/templateReducer';
import { TExportOperation } from '../../api/template';
import { exportPivotStyles } from '../../config/styles';
import { i18nValue } from '../../core/ui/i18n';

const ExportVisualDialogPivot = () => {
    const { selectedExportOperation } = useSelector(state).templates,
        dispatch = useDispatch(),
        getTabId = (itemKey: string) => {
            return `export-spec-pivot-${itemKey}`;
        },
        handlePivotClick = (item: PivotItem) => {
            dispatch(
                updateSelectedExportOperation(
                    item.props.itemKey as TExportOperation
                )
            );
        };

    return (
        <div className='export-spec-dialog-pivot'>
            <Pivot
                aria-label='Template Specific Details'
                selectedKey={selectedExportOperation}
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
