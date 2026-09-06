import powerbi from 'powerbi-visuals-api';

let services: powerbi.extensibility.visual.VisualConstructorOptions;

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
    }
};

/**
 * Provides top-level access to the Power BI visual host services.
 */
export const getVisualHost = () => services?.host;
