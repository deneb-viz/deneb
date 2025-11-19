import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import { logHost } from '../logging';

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
 * Gets the categorical data view from the visual update options.
 */
export const getCategoricalDataViewFromOptions = (
    options: VisualUpdateOptions
) => options?.dataViews?.[0]?.categorical || {};

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
