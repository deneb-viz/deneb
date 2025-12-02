import { type VegaDatum } from './types';

/**
 * Take an item from a Vega event and attempt to resolve its datum, accounting for Vega-Lite specific scenarios like
 * faceting.
 */
export const resolveDatumFromItem = (item: any): VegaDatum[] | null => {
    switch (true) {
        case item === undefined:
            return null;
        case item?.context?.data?.facet?.values?.value:
            return item?.context?.data?.facet?.values?.value?.slice();
        default:
            return [{ ...item?.datum }];
    }
};
