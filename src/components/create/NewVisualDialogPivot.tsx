import * as React from 'react';
import { Pivot, PivotItem, IPivotStyles } from '@fluentui/react/lib/Pivot';
import { IStyleSet } from '@fluentui/react/lib/Styling';

import store from '../../store';
import { TTemplateProvider } from '../../core/template';
import { i18nValue } from '../../core/ui/i18n';
import { resolveTemplateProviderPivotAria } from '../../core/ui/aria';

const pivotStyles: Partial<IStyleSet<IPivotStyles>> = {
    itemContainer: {
        marginTop: '10px',
        height: '100%'
    }
};

const NewVisualDialogPivot = () => {
    const { templateProvider, updateSelectedTemplateProvider } = store(),
        getTabId = (itemKey: string) => {
            return `new-spec-pivot-${itemKey}`;
        },
        handlePivotClick = (item: PivotItem) => {
            updateSelectedTemplateProvider(
                item.props.itemKey as TTemplateProvider
            );
        };

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

export default NewVisualDialogPivot;
