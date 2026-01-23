/**
 * Represents the Deneb container signal value, providing information about the visualization container's dimensions
 * and scroll position.
 */
export interface DenebContainerSignal {
    /** Container element height in pixels */
    height: number;
    /** Container element width in pixels */
    width: number;
    /** Total scrollable height in pixels */
    scrollHeight: number;
    /** Total scrollable width in pixels */
    scrollWidth: number;
    /** Current vertical scroll position in pixels */
    scrollTop: number;
    /** Current horizontal scroll position in pixels */
    scrollLeft: number;
}

/**
 * Options for creating the denebContainer signal.
 */
export interface DenebContainerSignalOptions {
    /** Container HTML element to read dimensions from */
    container?: HTMLElement;
    /** Scroll position information (alternative to container) */
    scroll?: {
        height?: number;
        width?: number;
        scrollHeight?: number;
        scrollWidth?: number;
        scrollTop?: number;
        scrollLeft?: number;
    };
}

/**
 * Signal name for the Deneb container (modern name).
 */
export const SIGNAL_DENEB_CONTAINER = 'denebContainer';

/**
 * Legacy signal name (deprecated).
 * @deprecated Use SIGNAL_DENEB_CONTAINER instead.
 */
export const SIGNAL_PBI_CONTAINER_LEGACY = 'pbiContainer';

/**
 * Get the `denebContainer` signal object with current container dimensions and scroll position. This signal provides
 * information about the visualization container that specs can reference.
 *
 * @param options Configuration for signal values
 * @returns Signal object with name and current value
 *
 * @example
 * ```typescript
 * const signal = getSignalDenebContainer({
 *   container: document.getElementById('viz-container')
 * });
 * view.signal(signal.name, signal.value);
 * ```
 */
export const getSignalDenebContainer = (
    options?: DenebContainerSignalOptions
): { name: string; value: DenebContainerSignal } => {
    return {
        name: SIGNAL_DENEB_CONTAINER,
        value: {
            height:
                options?.container?.clientHeight ||
                options?.scroll?.height ||
                0,
            width:
                options?.container?.clientWidth || options?.scroll?.width || 0,
            scrollHeight:
                options?.container?.scrollHeight ||
                options?.scroll?.scrollHeight ||
                0,
            scrollWidth:
                options?.container?.scrollWidth ||
                options?.scroll?.scrollWidth ||
                0,
            scrollTop:
                options?.container?.scrollTop ||
                options?.scroll?.scrollTop ||
                0,
            scrollLeft:
                options?.container?.scrollLeft ||
                options?.scroll?.scrollLeft ||
                0
        }
    };
};

/**
 * Get signal names that reference container dimensions (for patching specs).
 */
export const getContainerSignalReferences = () => ({
    width: `${SIGNAL_DENEB_CONTAINER}.width`,
    height: `${SIGNAL_DENEB_CONTAINER}.height`,
    scrollWidth: `${SIGNAL_DENEB_CONTAINER}.scrollWidth`,
    scrollHeight: `${SIGNAL_DENEB_CONTAINER}.scrollHeight`,
    scrollTop: `${SIGNAL_DENEB_CONTAINER}.scrollTop`,
    scrollLeft: `${SIGNAL_DENEB_CONTAINER}.scrollLeft`
});

/**
 * Container dimensions input type used by spec patching functions.
 */
export interface ContainerDimensions {
    width: number;
    height: number;
}

/**
 * Get the `denebContainer` signal object from container dimensions. This is a convenience wrapper around
 * `getSignalDenebContainer` for use in spec patching where only width/height are available.
 *
 * @param containerDimensions Container width and height (optional)
 * @returns Signal object with name and current value
 *
 * @example
 * ```typescript
 * const signal = getDenebContainerSignalFromDimensions({ width: 800, height: 600 });
 * // Use in Vega spec: spec.signals.push(signal)
 * // Use in Vega-Lite spec: spec.params.push(signal)
 * ```
 */
export const getDenebContainerSignalFromDimensions = (
    containerDimensions?: ContainerDimensions
): { name: string; value: DenebContainerSignal } => {
    return getSignalDenebContainer({
        scroll: containerDimensions
            ? {
                  height: containerDimensions.height,
                  width: containerDimensions.width
              }
            : undefined
    });
};
