import powerbi from 'powerbi-visuals-api';
import { deepEqual } from 'fast-equals';

import { VisualUpdateComparisonOptions } from './types';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import {
    isSettingsChangeVolatile,
    VisualFormattingSettingsModel
} from '../properties';
import { persistProperties, resolveObjectProperties } from './persistence';

/**
 * Test that the supplied parameters mean that the visual host has the visual in a suitable state to display the editor
 * interface.
 */
export const isAdvancedEditor = (
    viewMode: powerbi.ViewMode | undefined,
    editMode: powerbi.EditMode | undefined,
    isInFocus: boolean
) =>
    (editMode === powerbi.EditMode.Advanced &&
        viewMode === powerbi.ViewMode.Edit &&
        isInFocus) ||
    false;

/**
 * Gets the categorical data view from the visual update options.
 */
export const getCategoricalDataViewFromOptions = (
    options: powerbi.extensibility.visual.VisualUpdateOptions
) => options?.dataViews?.[0]?.categorical || {};

/**
 * Confirms if the visual update options contain what we consider a volatile change to the visual and its data.
 *
 * @param options - The visual update options to check for volatility.
 * @returns True if the visual update options contain a volatile change, false otherwise.
 */
export const isVisualUpdateEventVolatile = (
    options: VisualUpdateComparisonOptions
) => {
    logTimeStart('isVisualUpdateEventVolatile');
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
        currentOptions.operationKind ===
        powerbi.VisualDataChangeOperationKind.Append;
    const dataViewIsEqual = deepEqual(categoricalPrevious, categoricalCurrent);
    const hasChanged =
        (typeIsVolatile && !dataViewIsEqual) || settingsAreVolatile;
    logDebug('isVisualUpdateEventVolatile', {
        previous: categoricalPrevious,
        current: categoricalCurrent,
        type: currentOptions.type,
        typeIsVolatile,
        settingsAreVolatile,
        operationIsAppend,
        dataViewIsEqual,
        hasChanged
    });
    logTimeEnd('isVisualUpdateEventVolatile');
    return currentProcessingFlag || hasChanged;
};

/**
 * Checks if a visual update type is data-related.
 */
export const isVisualUpdateTypeData = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.Data ===
          (type & powerbi.VisualUpdateType.Data)
        : false;

/**
 * Checks if a visual update type is a resize event.
 */
export const isVisualUpdateTypeResize = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.Resize ===
          (type & powerbi.VisualUpdateType.Resize)
        : false;

/**
 * Checks if a visual has finished resizing.
 */
export const isVisualUpdateTypeResizeEnd = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.ResizeEnd ===
          (type & powerbi.VisualUpdateType.ResizeEnd)
        : false;

/**
 * Checks if a visual update type is view mode change.
 */
export const isVisualUpdateTypeViewMode = (type: powerbi.VisualUpdateType) =>
    powerbi.VisualUpdateType.ViewMode ===
    (type & powerbi.VisualUpdateType.ViewMode);

/**
 * Check the visual update type to see if it is volatile.
 */
export const isVisualUpdateTypeVolatile = (
    options: powerbi.extensibility.visual.VisualUpdateOptions
) => isVisualUpdateTypeData(options.type);

/**
 * For suitable events, ensure that the visual viewport is correctly resolved and persisted. This will allow us to keep
 * the viewport upon re-initialisation (e.g. if swapping visuals out or reloading the dev visual).
 */
export const resolveAndPersistReportViewport = (
    options: powerbi.extensibility.visual.VisualUpdateOptions,
    settings: VisualFormattingSettingsModel
) => {
    const { editMode, type, viewMode, viewport } = options;
    if (
        isVisualUpdateTypeVolatile(options) ||
        isVisualUpdateTypeResizeEnd(type)
    ) {
        const newViewport: powerbi.IViewport = {
            height: Number.parseFloat(
                settings.stateManagement.viewport.viewportHeight.value
            ),
            width: Number.parseFloat(
                settings.stateManagement.viewport.viewportWidth.value
            )
        };
        const isEditEligible =
            editMode === powerbi.EditMode.Default &&
            viewMode === powerbi.ViewMode.Edit &&
            (newViewport.height !== viewport.height ||
                newViewport.width !== viewport.width);
        const isViewEligible =
            viewMode === powerbi.ViewMode.View &&
            (newViewport.height !== viewport.height ||
                newViewport.width !== viewport.width);
        if (isEditEligible || isViewEligible) {
            logDebug('Persisting viewport to properties...');
            persistProperties(
                resolveObjectProperties([
                    {
                        objectName: 'stateManagement',
                        properties: [
                            {
                                name: 'viewportHeight',
                                value: viewport.height
                            },
                            {
                                name: 'viewportWidth',
                                value: viewport.width
                            }
                        ]
                    }
                ])
            );
        }
    }
};
