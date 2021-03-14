import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Pivot, PivotItem, IPivotStyles } from '@fluentui/react-tabs';
import { IStyleSet } from 'office-ui-fabric-react/lib/Styling';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { updateSelectedDialogProvider } from '../../store/templateReducer';
import { TSpecProvider } from '../../types';

const pivotStyles: Partial<IStyleSet<IPivotStyles>> = {
    itemContainer: {
        marginTop: '10px',
        height: '100%'
    }
};

const NewVisualDialogPivot = () => {
    Debugger.log('Rendering Component: [NewVisualDialogPivot]...');
    const { i18n } = useSelector(state).visual,
        { selectedProvider } = useSelector(state).templates,
        dispatch = useDispatch(),
        getTabId = (itemKey: string) => {
            return `new-spec-pivot-${itemKey}`;
        },
        handlePivotClick = (item: PivotItem) => {
            dispatch(
                updateSelectedDialogProvider(
                    item.props.itemKey as TSpecProvider
                )
            );
        };

    return (
        <div className='new-spec-dialog-pivot'>
            <Pivot
                aria-label='Separately Rendered Content Pivot Example'
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
            </Pivot>
        </div>
    );
};

export default NewVisualDialogPivot;
