import { logHost } from '@deneb-viz/utils/logging';
import powerbi from 'powerbi-visuals-api';

let services: powerbi.extensibility.visual.VisualConstructorOptions;
let events: powerbi.extensibility.IVisualEventService;
let selectionIdBuilder: () => powerbi.visuals.ISelectionIdBuilder;
let selectionManager: powerbi.extensibility.ISelectionManager;
let visualUpdateOptions: powerbi.extensibility.visual.VisualUpdateOptions;

/**
 * Use to bind the visual host services to this API for use in the application lifecycle.
 *
 * HOST SERVICES WILL NOT BE ACCESSIBLE UNLESS THIS IS BOUND.
 *
 * @remarks This has been moved in its singleton approach to ensure that we continue to support the app in its current
 * state and make refactoring as seamless as possibler. This approach will break in future versions so that Power BI
 * host services are injected as a dependency and we have a way of ignoring them in the core UI.
 */
export const VisualHostServices = {
    bind: (service: powerbi.extensibility.visual.VisualConstructorOptions) => {
        services = service;
        events = service.host.eventService;
        selectionIdBuilder = service.host.createSelectionIdBuilder;
        selectionManager = service.host.createSelectionManager();
    },
    update: (options: powerbi.extensibility.visual.VisualUpdateOptions) => {
        visualUpdateOptions = options;
    }
};

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
 * The visual host's selection manager, used for interactivity purposes, such as tooltips and cross-filtering.
 */
export const getVisualSelectionManager = () => selectionManager;

/**
 * Hyperlinks to external sites need to be managed by the visual host, in order to ensure that they are opened with
 * consent from the user. This method provides a wrapper around the Power BI visual host's `launchUrl` method.
 */
export const launchUrl = (url: string) => getVisualHost()?.launchUrl(url);

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
