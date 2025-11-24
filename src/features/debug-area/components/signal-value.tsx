import React, { useEffect, useState } from 'react';

import { usePrevious } from '../../../hooks';
import { DataTableCell } from './data-table-cell';
import { DATA_TABLE_VALUE_MAX_LENGTH } from '..';
import { VegaViewServices } from '../../vega-extensibility';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { stringifyPruned } from '@deneb-viz/utils/object';

interface IDataTableCellSignalValueProps {
    signalName: string;
    initialValue: string;
    renderId?: string;
}

/**
 * Renders similar output as a `DataTableCell`, but instead will bind to the
 * specified signal in the Vega view, and will update the cell value when the
 * signal changes.
 *
 * @privateRemarks [DM-P]: there is some technical debt here, where we're using
 * `signalValue` as a triggering mechanism for renders, but not for displaying
 * its actual value (opting to go directly to the view instead).
 *
 * There seem to be some edge cases where the correct value is not returned,
 * despite events and hooks lining-up correctly. This needs more time to
 * investigate (and is likely programmer error on my part), but as the render
 * happens anyway and it only affects dynamic signal values, this is an
 * acceptable risk for now.
 */
// eslint-disable-next-line max-lines-per-function
export const SignalValue: React.FC<IDataTableCellSignalValueProps> = ({
    signalName,
    initialValue,
    renderId
}) => {
    const previousSignalName = usePrevious(signalName);
    const [signalValue, setSignalValue] = useState<any>(initialValue);
    /**
     * Attempt to add specified signal listener to the Vega view.
     */
    const addListener = () => {
        try {
            VegaViewServices.getView()?.addSignalListener(
                signalName,
                signalListener
            );
        } catch (e) {
            logDebug(`Listener for signal ${signalName} could not be added.`);
        }
    };
    /**
     * Attempt to remove specified signal listener from the Vega view.
     */
    const removeListener = () => {
        try {
            VegaViewServices.getView()?.removeSignalListener(
                signalName,
                signalListener
            );
        } catch (e) {
            logDebug(`Listener for signal ${signalName} could not be removed.`);
        }
    };
    /**
     * Attempt to cycle (add/remove) listeners for the specified signal.
     */
    const cycleListeners = () => {
        logDebug(`Cycling listeners for signal: ${signalName}...`);
        removeListener();
        addListener();
    };
    /**
     * Handler for signal listener events.
     */
    const signalListener = (name: string, value: any) => {
        setSignalValue(() => value);
        logDebug(`[${renderId}] Signal value for ${name} has changed`, value);
    };
    SignalValue;
    const getSignalValue = () => {
        const value = stringifyPruned(
            VegaViewServices.getSignalByName(signalName)
        );
        return value?.length > DATA_TABLE_VALUE_MAX_LENGTH
            ? getI18nValue('Table_Placeholder_TooLong')
            : value;
    };
    /**
     * Ensure that listener is added/removed when the view changes between
     * renders.
     */
    useEffect(() => {
        logDebug(`Render ID has changed to ${renderId}. Updating...`);
        cycleListeners();
        return () => {
            removeListener();
        };
    }, [renderId]);
    /**
     * Ensure that if the name changes (i.e. # of signals or a sort), then we
     * update value and cycle listeners.
     */
    useEffect(() => {
        logDebug(
            `Signal name has changed from ${previousSignalName} to ${signalName}. Updating...`
        );
        setSignalValue(() => getSignalValue());
        cycleListeners();
        return () => {
            removeListener();
        };
    }, [signalName]);
    /**
     * If supplying a new value, we just need to update state and not cycle
     * listeners (as they are still OK).
     */
    useEffect(() => {
        logDebug(
            `Initial value for signal ${signalName} has changed. Updating...`,
            { prev: signalValue, next: initialValue }
        );
        setSignalValue(() => getSignalValue());
    }, [initialValue]);
    logRender('DataTableCellSignalValue', {
        signalName,
        initialValue,
        signalValue,
        viewValue: getSignalValue()
    });
    return (
        <DataTableCell
            field={signalName}
            displayValue={getSignalValue()}
            rawValue={getSignalValue()}
        />
    );
};
