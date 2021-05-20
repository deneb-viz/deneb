import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Pivot, PivotItem, IPivotStyles } from '@fluentui/react/lib/Pivot';
import { IStyleSet } from '@fluentui/react/lib/Styling';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { updateSelectedDialogProvider } from '../../store/templateReducer';
import { TTemplateProvider } from '../../types';

const pivotStyles: Partial<IStyleSet<IPivotStyles>> = {
    itemContainer: {
        marginTop: '10px',
        height: '100%'
    }
};

const NewVisualDialogPivot = () => {
    Debugger.log('Rendering Component: [NewVisualDialogPivot]...');
    const { i18n } = useSelector(state).visual,
        { templateProvider: selectedProvider } = useSelector(state).templates,
        dispatch = useDispatch(),
        getTabId = (itemKey: string) => {
            return `new-spec-pivot-${itemKey}`;
        },
        handlePivotClick = (item: PivotItem) => {
            Debugger.log(`${item.props.itemKey} selected. Dispatching...`);
            dispatch(
                updateSelectedDialogProvider(
                    item.props.itemKey as TTemplateProvider
                )
            );
        };

    return (
        <div className='new-spec-dialog-pivot'>
            <Pivot
                aria-label='Template Provider Selection'
                selectedKey={selectedProvider}
                getTabId={getTabId}
                styles={pivotStyles}
                onLinkClick={handlePivotClick}
                headersOnly={true}
            >
                <PivotItem
                    headerText={i18n.getDisplayName('Provider_VegaLite')}
                    itemKey='vegaLite'
                />
                <PivotItem
                    headerText={i18n.getDisplayName('Provider_Vega')}
                    itemKey='vega'
                />
                <PivotItem
                    headerText={i18n.getDisplayName('Provider_Import')}
                    itemKey='import'
                />
            </Pivot>
        </div>
    );
};

export default NewVisualDialogPivot;
