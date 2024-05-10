/**
 * Represents the signal patched to the Vega view that contains the current state of the container. This can be used
 * within a specification to adjust the rendering of the visualization based on the current state of the container.
 */
export type PowerBIContainerSignal = {
    height: number;
    width: number;
    scrollHeight: number;
    scrollWidth: number;
    scrollTop: number;
    scrollLeft: number;
};

/**
 * Options for setting the PowerBI container signal. This can come from either the container itself or from the scroll
 * event in the container, which has its own properties.
 */
export type PowerBIContainerSignalSetterOptions = {
    /**
     * The container element that the signal is being set for (if known).
     */
    container?: HTMLElement;
    /**
     * The scroll event properties for the container (if known).
     */
    scroll?: PowerBIContainerSignal;
};

/**
 * Indicates the type of selection mode that is currently active.
 * `simple` = legacy selection mode (let Deneb do it for me);
 * `advanced` = advanced selection mode (let me do it for Deneb).
 */
export type SelectionMode = 'simple' | 'advanced';
