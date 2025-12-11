import { type SelectionMode } from '@deneb-viz/template-usermeta';
import { DATA_VIEWER_CONFIGURATION } from '@deneb-viz/configuration';

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
         * Whether to pass through the visual background effects in the preview area.
         */
        backgroundPassThrough: true,
        /**
         * Number of rows to display in the debug table.
         */
        dataTableRowsPerPage: DATA_VIEWER_CONFIGURATION.rowsPerPage.default,
        /**
         * Interval in milliseconds to debounce editor changes.
         */
        debouncePeriod: {
            default: 700,
            min: 0,
            max: 1000
        },
        /**
         * Font size for the JSON editor.
         */
        fontSize: {
            default: 10,
            min: 8,
            max: 30
        },
        /**
         * Maximum line length for the JSON editor.
         */
        maxLineLength: 40,
        /**
         * Preferred editor position within interface.
         */
        position: 'left',
        /**
         * Show scrollbars in advanced editor preview area.
         */
        previewScrollbars: false,
        /**
         * Show line numbers in the JSON editor.
         */
        showLineNumbers: true,
        /**
         * Show viewport marker in editor.
         */
        showViewportMarker: true,
        /**
         * Number of spaces to use for tab size in the JSON editor.
         */
        tabSize: 2,
        /**
         * The theme to use for the editor.
         */
        theme: 'light',
        /**
         * Whether to wrap text in the JSON editor or not.
         */
        wordWrap: true
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
    theme: {
        /**
         * Number of discrete colors to use when computing the `pbiColorOrdinal` scheme hues.
         */
        ordinalColorCount: {
            default: 10,
            min: 1,
            max: 100
        }
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
         * Whether the 'create' dialog should be open or not.
         */
        isNewDialogOpen: true,
        /**
         * The JSON editor content for specification.
         */
        jsonSpec: '{}',
        /**
         * The JSON editor content for configuration.
         */
        jsonConfig: '{}',
        /**
         * The level of logging to apply to the Vega parser.
         */
        logLevel: 3,
        /**
         * The Vega provider to use when parsing.
         */
        provider: 'vegaLite',
        /**
         * The default render mode.
         */
        renderMode: 'svg',
        /**
         * Maximum number of data points to include when cross-filtering
         */
        selectionMaxDataPoints: 50,
        /**
         * The mode of selection to use for the visual.
         */
        selectionMode: <SelectionMode>'simple',
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
