import { SelectionMode } from '../definitions';
/**
 * Default values for Deneb's persistable properties, matching the structure of the visual capabilities from the Power
 * BI custom visual.
 */
export const PROPERTIES_DEFAULTS = {
    vega: {
        /**
         * Indicates whether the context menu should include Power BI selection ID functionality, which permits data
         * point-centric operations, like drillthrough, drilldown and include/exclude.
         */
        enableContextMenu: true,
        /**
         * Indicates whether a custom tooltip handler should be used, rather than Vega's inbuilt one. This currently
         * only consideres Power BI tooltips.
         */
        enableTooltips: true,
        /**
         * Whether to enable support fields in the main dataset to manage cross-filtering in Power BI, and leverage the
         * cross-filtering APIs for data points.
         */
        enableSelection: false,
        /**
         * Whether to enable support fields in the main dataset to manage highlighting in Power BI, and leverage the
         * highlighting APIs for data points.
         */
        enableHighlight: false,
        /**
         * Maximum number of data points to include when cross-filtering
         */
        selectionMaxDataPoints: 50,
        /**
         * The mode of selection to use for the visual.
         */
        selectionMode: <SelectionMode>'simple'
    }
};
