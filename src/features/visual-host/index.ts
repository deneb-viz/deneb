import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualUpdateType = powerbi.VisualUpdateType;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import isEqual from 'lodash/isEqual';

import { isSettingsChangeVolatile } from '../settings';
import { IVisualUpdateComparisonOptions } from './types';
import { logDebug, logHost, logTimeEnd, logTimeStart } from '../logging';

export * from './types';

let services: VisualConstructorOptions;
let events: IVisualEventService;
let selectionIdBuilder: () => ISelectionIdBuilder;
let selectionManager: ISelectionManager;
let visualUpdateOptions: VisualUpdateOptions;

/**
 * Use to bind the visual host services to this API for use in the application
 * lifecycle.
 *
 * HOST SERVICES WILL NOT BE ACCESSIBLE UNLESS THIS IS BOUND.
 */
export const VisualHostServices = {
    bind: (service: VisualConstructorOptions) => {
        services = service;
        events = service.host.eventService;
        selectionIdBuilder = service.host.createSelectionIdBuilder;
        selectionManager = service.host.createSelectionManager();
    },
    update: (options: VisualUpdateOptions) => {
        visualUpdateOptions = options;
    }
};

/**
 * Top-level DOM element that is available within the Power BI visual sandbox
 * (iframe).
 */
export const getVisualElement = () => services?.element;

/**
 * Provides top-level access to the Power BI visual host services.
 */
export const getVisualHost = () => services?.host;

/**
 * Whether or not the visual host has determined that interations are allowed.
 */
export const getVisualInteractionStatus = () =>
    services?.host?.hostCapabilities?.allowInteractions || false;

/**
 * The visual host's selection ID builder.
 */
export const getVisualSelectionIdBuilder = () => selectionIdBuilder();

/**
 * The visual host's selection manager, used for interactivity purposes, such
 * as tooltips and cross-filtering.
 */
export const getVisualSelectionManager = () => selectionManager;

/**
 * Get the latest update options from the visual host.
 */
export const getVisualUpdateOptions = () => visualUpdateOptions;

/**
 * Hyperlinks to external sites need to be managed by the visual host, in order
 * to ensure that they are opened with consent from the user. This method
 * provides a wrapper around the Power BI visual host's `launchUrl` method.
 */
export const launchUrl = (url: string) => getVisualHost()?.launchUrl(url);

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
 * Checks if a visual update type is a resize event.
 */
export const isVisualUpdateTypeResize = (type: VisualUpdateType) =>
    VisualUpdateType.Resize === (type & VisualUpdateType.Resize);

/**
 * Checks if a visual has finished resizing.
 */
export const isVisualUpdateTypeResizeEnd = (type: VisualUpdateType) =>
    VisualUpdateType.ResizeEnd === (type & VisualUpdateType.ResizeEnd);

/**
 * Checks if a visual update type is view mode change.
 */
export const isVisualUpdateTypeViewMode = (type: VisualUpdateType) =>
    VisualUpdateType.ViewMode === (type & VisualUpdateType.ViewMode);

/**
 * Check the visual update type to see if it is volatile.
 */
export const isVisualUpdateTypeVolatile = (options: VisualUpdateOptions) =>
    VisualUpdateType.Data === (options.type & VisualUpdateType.Data);

/**
 * Signal rendering has failed for visual host events.
 */
export const setRenderingFailed = (reason?: string) => {
    logHost('Rendering event failed:', reason);
    events.renderingFailed(visualUpdateOptions);
};

/**
 * Signal rendering has finished for visual host events.
 */
export const setRenderingFinished = () => {
    logHost('Rendering event finished.');
    events.renderingFinished(visualUpdateOptions);
};

/**
 * Signal rendering has begun for visual host events.
 */
export const setRenderingStarted = () => {
    logHost('Rendering event started.');
    events.renderingStarted(visualUpdateOptions);
};
