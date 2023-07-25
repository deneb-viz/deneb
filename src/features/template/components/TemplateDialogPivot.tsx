import React from 'react';
import { Pivot, PivotItem, IPivotStyles } from '@fluentui/react/lib/Pivot';
import { IStyleSet } from '@fluentui/react/lib/Styling';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { TExportOperation, TTemplateProvider } from '../types';
import { TModalDialogType } from '../../modal-dialog';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';

const PIVOT_STYLES: Partial<IStyleSet<IPivotStyles>> = {
    itemContainer: {
        marginTop: '10px',
        height: '100%'
    }
};

const PIVOT_ITEMS_EXPORT: IPivotItemData[] = [
    { i18nKey: 'Template_Export_Information', itemKey: 'information' },
    { i18nKey: 'Template_Export_Dataset', itemKey: 'dataset' },
    { i18nKey: 'Template_Export_Json', itemKey: 'template' }
];

const PIVOT_ITEMS_NEW: IPivotItemData[] = [
    { i18nKey: 'Provider_VegaLite', itemKey: 'vegaLite' },
    { i18nKey: 'Provider_Vega', itemKey: 'vega' },
    { i18nKey: 'Provider_Import', itemKey: 'import' }
];

interface ITemplateDialogPivotProps {
    type: TModalDialogType;
}

interface IPivotItemData {
    i18nKey: string;
    itemKey: TTemplateProvider | TExportOperation;
}

const getPivotAria = (type: TModalDialogType) => {
    switch (type) {
        case 'new':
            return getI18nValue('Pivot_Editor_Create');
        case 'export':
            return getI18nValue('Pivot_Editor_Export');
    }
};

const getPivotData = (type: TModalDialogType) => {
    switch (type) {
        case 'new':
            return getPivotItems(PIVOT_ITEMS_NEW);
        case 'export':
            return getPivotItems(PIVOT_ITEMS_EXPORT);
    }
};

const getPivotItems = (items: IPivotItemData[]) =>
    items.map((i) => (
        <PivotItem headerText={getI18nValue(i.i18nKey)} itemKey={i.itemKey} />
    ));

export const TemplateDialogPivot: React.FC<ITemplateDialogPivotProps> = ({
    type
}) => {
    const { templateSelectedExportOperation, updateSelectedExportOperation } =
        store(
            (state) => ({
                templateSelectedExportOperation:
                    state.templateSelectedExportOperation,
                updateSelectedExportOperation:
                    state.updateSelectedExportOperation
            }),
            shallow
        );
    const getTabId = (itemKey: string) => {
        return `${type}-spec-pivot-${itemKey}`;
    };
    const handlePivotClick = (item: PivotItem) => {
        switch (type) {
            case 'export':
                return updateSelectedExportOperation(
                    item.props.itemKey as TExportOperation
                );
        }
    };
    const getSelectedKey = () => {
        switch (type) {
            case 'export':
                return templateSelectedExportOperation;
        }
    };
    const ariaLabel = getPivotAria(type);
    logRender('TemplateDialogPivot');
    return (
        <div className='new-spec-dialog-pivot'>
            <Pivot
                aria-label={ariaLabel}
                selectedKey={getSelectedKey()}
                getTabId={getTabId}
                styles={PIVOT_STYLES}
                onLinkClick={handlePivotClick}
                headersOnly={true}
            >
                {getPivotData(type)}
            </Pivot>
        </div>
    );
};
