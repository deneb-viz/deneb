import React from 'react';
import { Pivot, PivotItem, IPivotStyles } from '@fluentui/react/lib/Pivot';
import { IStyleSet } from '@fluentui/react/lib/Styling';

import { useStoreProp } from '../../store';
import { TTemplateProvider } from '../../core/template';
import { i18nValue } from '../../core/ui/i18n';
import { resolveTemplateProviderPivotAria } from '../../core/ui/aria';
import { reactLog } from '../../core/utils/reactLog';

const pivotStyles: Partial<IStyleSet<IPivotStyles>> = {
    itemContainer: {
        marginTop: '10px',
        height: '100%'
    }
};

const CreateVisualDialogPivot = () => {
    const templateProvider: TTemplateProvider =
        useStoreProp('templateProvider');
    const updateSelectedTemplateProvider: (
        templateProvider: TTemplateProvider
    ) => void = useStoreProp('updateSelectedTemplateProvider');
    const getTabId = (itemKey: string) => {
        return `new-spec-pivot-${itemKey}`;
    };
    const handlePivotClick = (item: PivotItem) => {
        updateSelectedTemplateProvider(item.props.itemKey as TTemplateProvider);
    };
    reactLog('Rendering [CreateVisualDialogPivot]');
    return (
        <div className='new-spec-dialog-pivot'>
            <Pivot
                aria-label={resolveTemplateProviderPivotAria()}
                selectedKey={templateProvider}
                getTabId={getTabId}
                styles={pivotStyles}
                onLinkClick={handlePivotClick}
                headersOnly={true}
            >
                <PivotItem
                    headerText={i18nValue('Provider_VegaLite')}
                    itemKey='vegaLite'
                />
                <PivotItem
                    headerText={i18nValue('Provider_Vega')}
                    itemKey='vega'
                />
                <PivotItem
                    headerText={i18nValue('Provider_Import')}
                    itemKey='import'
                />
            </Pivot>
        </div>
    );
};

export default CreateVisualDialogPivot;
