import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Default values for Deneb's persistable properties, matching the structure of the visual capabilities from the Power
 * BI custom visual.
 */
export const DEFAULTS = {
    developer: {
        /**
         * Locale override for testing formatting and i18n
         */
        locale: 'en-US',
        /**
         * Visual version. Used to check for updates
         */
        version: null
    },
    dataLimit: {
        /**
         * Allow override of `dataReductionAlgorithm` limit.
         */
        override: false,
        /**
         * Display information about the custom visual limitations and recommendations for end users.
         */
        showCustomVisualNotes: true
    },
    display: {
        /**
         * Color of displayed scrollbars.
         */
        scrollbarColor: '#000000',
        /**
         * Opacity of displayed scrollbars.
         */
        scrollbarOpacity: {
            min: 0,
            max: 100,
            default: 20
        },
        /**
         * Radius of displayed scrollbars.
         */
        scrollbarRadius: {
            min: 0,
            max: 3,
            default: 0
        },
        /**
         * The time between throttling scroll events
         */
        scrollEventThrottle: {
            min: 0,
            max: 1000,
            default: 5
        }
    },
    editor: {
        /**
         * Maximum line length for the JSON editor.
         */
        maxLineLength: 40
    },
    stateManagement: {
        /**
         * Persisted height of visual viewport in view mode (should preserve height on re-init).
         */
        viewportHeight: null,
        /**
         * Persisted width of visual viewport in view mode (should preserve width on re-init)
         */
        viewportWidth: null
    },
    unitSymbols: {
        milliseconds: 'ms',
        percent: '%',
        pixels: 'px',
        pt: 'pt'
    },
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
         * The JSON editor content for specification.
         */
        jsonSpec: PROJECT_DEFAULTS.spec,
        /**
         * The JSON editor content for configuration.
         */
        jsonConfig: PROJECT_DEFAULTS.config,
        /**
         * The Vega provider to use when parsing.
         */
        provider: 'vegaLite',
        /**
         * Maximum number of data points to include when cross-filtering
         */
        selectionMaxDataPoints: 50,
        /**
         * The mode of selection to use for the visual.
         */
        selectionMode: 'simple',
        /**
         * The delay before showing a tooltip.
         */
        tooltipDelay: 0,
        /**
         * The default version to apply for new specifications.
         */
        version: ''
    }
};
