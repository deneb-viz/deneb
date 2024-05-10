import {
    PowerBIContainerSignal,
    PowerBIContainerSignalSetterOptions,
    SIGNALS_POWERBI
} from '@deneb-viz/core-dependencies';

/**
 * Get the PowerBI container signal from the provided options.
 */
export const getPowerBiSignalContainer = (
    options?: PowerBIContainerSignalSetterOptions
): { name: string; value: PowerBIContainerSignal } => {
    return {
        name: SIGNALS_POWERBI.container,
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
