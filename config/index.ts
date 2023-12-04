import capabilities from '../capabilities.json';
import features from './features.json';
import { dependencies } from '../package.json';

/**
 * This is an object that contains the capabilities of the visual.
 */
export const CAPABILITIES = capabilities;

/**
 * The primary set of feature switches for the packaged application. These are
 * loaded from the `config/features.json` file, so that we can hot-swap them
 * for different configurations as needed.
 */
export const FEATURES = features;

/**
 * The log level is used to provide debug-level logging throughout whilst
 * developing. This should be set to `0 (NONE)` for production builds. For more
 * information, see the `src/features/logging` directory.
 */
export const LOG_LEVEL: number = 0;

/**
 * Default values for the visual properties.
 */
export const PROPERTY_DEFAULTS = {
    dataLimit: {
        override: false,
        showCustomVisualNotes: true
    },
    developer: {
        locale: 'en-US',
        showVersionNotification: false
    },
    editor: {
        provider: 'jsoneditor',
        debounceInterval: 200,
        tabSize: 2,
        position: 'left',
        fontSize: {
            default: 10,
            min: 8,
            max: 30
        },
        wordWrap: true,
        showGutter: true,
        showLineNumbers: true,
        showViewportMarker: true,
        maxLineLength: 40,
        previewScrollbars: false
    },
    vega: {
        jsonSpec: null,
        jsonConfig: '{}',
        provider: 'vegaLite',
        logLevel: 3,
        renderMode: 'svg',
        enableContextMenu: true,
        enableTooltips: true,
        enableSelection: false,
        enableHighlight: false,
        selectionMaxDataPoints: 50,
        tooltipDelay: 0,
        isNewDialogOpen: true
    },
    theme: {
        ordinalColorCount: {
            default: 10,
            min: 1,
            max: 100
        }
    },
    display: {
        scrollbarColor: '#000000',
        scrollbarOpacity: 20,
        scrollbarRadius: {
            min: 0,
            max: 3,
            default: 0
        }
    },
    performance: {
        enableResizeRecalc: false
    }
};

export const PROVIDER_VERSIONS = {
    vega: dependencies['vega'],
    vegaLite: dependencies['vega-lite']
};
