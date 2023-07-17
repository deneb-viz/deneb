import powerbi from 'powerbi-visuals-api';
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualUpdateType = powerbi.VisualUpdateType;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;

import isEqual from 'lodash/isEqual';

import { isSettingsChangeVolatile } from '../settings';
import { IVisualUpdateComparisonOptions } from './types';
import { logDebug, logTimeEnd, logTimeStart } from '../logging';

export * from './types';

/**
 * Confirms if the visual update options contain what we consider a volatile
 * change to the visual and its data.
 * @param options - The visual update options to check for volatility.
 * @returns True if the visual update options contain a volatile change, false otherwise.
 */
export const isVisualUpdateVolatile = (
    options: IVisualUpdateComparisonOptions
) => {
    logTimeStart('isVisualUpdateVolatile');
    const {
        currentProcessingFlag,
        currentOptions,
        currentSettings,
        previousOptions,
        previousSettings
    } = options;
    const categoricalPrevious =
        getCategoricalDataViewFromOptions(previousOptions);
    const categoricalCurrent =
        getCategoricalDataViewFromOptions(currentOptions);
    const typeIsVolatile = isVisualUpdateTypeVolatile(currentOptions);
    const settingsAreVolatile = isSettingsChangeVolatile(
        previousSettings,
        currentSettings
    );
    const operationIsAppend =
        currentOptions.operationKind === VisualDataChangeOperationKind.Append;
    const dataViewIsEqual = isEqual(categoricalPrevious, categoricalCurrent);
    const hasChanged =
        (typeIsVolatile && !dataViewIsEqual) || settingsAreVolatile;
    logDebug('isDatasetVolatile', {
        previous: categoricalPrevious,
        current: categoricalCurrent,
        type: currentOptions.type,
        typeIsVolatile,
        settingsAreVolatile,
        operationIsAppend,
        dataViewIsEqual,
        hasChanged
    });
    logTimeEnd('isVisualUpdateVolatile');
    return currentProcessingFlag || hasChanged;
};

/**
 * Gets the categorical data view from the visual update options.
 */
export const getCategoricalDataViewFromOptions = (
    options: VisualUpdateOptions
) => options?.dataViews?.[0]?.categorical || {};

/**
 * Check the visual update type to see if it is volatile.
 */
const isVisualUpdateTypeVolatile = (options: VisualUpdateOptions) =>
    VisualUpdateType.Data === (options.type & VisualUpdateType.Data);
