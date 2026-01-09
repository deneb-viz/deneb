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
         * The delay before showing a tooltip.
         */
        tooltipDelay: 0,
        /**
         * The default version to apply for new specifications.
         */
        version: ''
    }
};
