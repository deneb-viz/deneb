import capabilities from '../capabilities.json';
import features from './features.json';
import { dependencies } from '../package.json';
import { visual } from '../pbiviz.json';

/**
 * This is an object that contains the visual's metadata. This is used to
 * handle places we need to display this information in the UI, as well as
 * for versioning and other purposes.
 */
export const APPLICATION_INFORMATION = visual;

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

/**
 * Provider versions, sourced from the `package.json` file. These are used to
 * track which version of Vega or Vega-Lite we're currently using, whether this
 * may have changed between visual versions, and potentially perform migrations
 * if necessary.
 */
export const PROVIDER_VERSIONS = {
    vega: dependencies['vega'],
    vegaLite: dependencies['vega-lite']
};

/**
 * Default values for the panes in the advanced editor.
 */
export const SPLIT_PANE_DEFAULTS = {
    minSize: 200,
    defaultSizePercent: 0.4,
    maxSizePercent: 0.5,
    collapsedSize: 36
};

/**
 * Configuration for the zoom controls in the visual preview pane.
 */
export const VISUAL_PREVIEW_ZOOM = {
    min: 10,
    max: 400,
    step: 10,
    default: 100,
    customLevels: [
        {
            value: '400',
            isLevel: true
        },
        {
            value: '200',
            isLevel: true
        },
        {
            value: '100',
            isLevel: true
        },
        {
            value: '66',
            isLevel: true
        },
        {
            value: '50',
            isLevel: true
        },
        {
            value: '33',
            isLevel: true
        },
        {
            value: 'Fit',
            isFit: true
        },
        {
            value: 'Custom',
            isCustom: true
        }
    ]
};
