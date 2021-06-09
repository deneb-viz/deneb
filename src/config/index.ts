import { visual } from '../../pbiviz.json';
import { devDependencies } from '../../package.json';
import {
    TEditorPosition,
    TLocale,
    TSpecProvider,
    TSpecRenderMode
} from '../types';
import { locales } from './locales';
import { theme } from './theme';

/**
 * Core configuration that should be referenced by other files
 */
export {
    dataLimitDefaults,
    developerDefaults,
    editorDefaults,
    exportFieldConstraints,
    locales,
    metaVersion,
    splitPaneDefaults,
    theme,
    vegaResources,
    vegaSettingsDefaults,
    visualFeatures,
    visual as visualMetadata,
    visualViewportAdjust
};

/**
 * =======================
 * Visual feature switches
 * =======================
 */
const visualFeatures = {
    /**
     * Enables debugger, which is basically a ton of logging. TODO: Remove this as we migrate across
     * to a more functional programming-based approach.
     */
    debug: false
};

/**
 * ======
 * Template metadata version
 * ======
 */
const metaVersion = 1;

/**
 * =================
 * Vega view spacing
 * =================
 *
 * How much spacing (in px) to apply to the Vega visual, within its visible area.
 */
const visualViewportAdjust = {
    top: 5,
    left: 5
};

/**
 * ======================
 * Editor Pane (re)Sizing
 * ======================
 *
 * For the Editor pane, we're using `react-split-pane` to allow the author to resize it. This object
 * specifies the sizes we should allow for this pane within the visual viewport.
 */
const splitPaneDefaults = {
    // Minimum allowed size of expanded editor pane (px).
    minSize: 350,
    // Default percentage of viewport to allocate for the expanded editor pane.
    defaultSizePercent: 0.4,
    // Maximum percentage of viewport to allow for the expanded editor pane.
    maxSizePercent: 0.6,
    // The width of the collapsed editor pane (px).
    collapsedSize: 36
};

/**
 * =======================
 * Developer Mode Defaults
 * =======================
 *
 * When developer mode is enabled, we have a specific object and properties available, so we'll add any
 * suitable defaults to this object.
 */
const developerDefaults = {
    locale: <TLocale>'en-US'
};

/**
 * ===============
 * Editor Defaults
 * ===============
 *
 * For the Ace editor used with `jsoneditor`, this object tracks any configuration values that aren't
 * covered in any logic or properties elsewhere.
 */
const editorDefaults = {
    // Time (in ms) before debouncing user input to Redux, the longer the interval, the less chatty
    // things are, but the longer the perceived lag for things to happen after the user finishes
    // typing in the editor.
    debounceInterval: 200,
    // Number of tabs to apply per level when formatting JSON.
    tabSize: 2,
    // Position in the pane
    position: <TEditorPosition>'left'
};

/**
 * ===================================
 * Visual object and property defaults
 * ===================================
 */

// `DataLimitSettings`
const dataLimitDefaults = {
    override: false,
    showCustomVisualNotes: true
};

// `VegaSettings`
const vegaSettingsDefaults = {
    jsonSpec: null,
    jsonConfig: '{}',
    provider: <TSpecProvider>'vegaLite',
    renderMode: <TSpecRenderMode>'canvas',
    enableContextMenu: true,
    enableTooltips: true,
    enableSelection: false,
    isNewDialogOpen: true
};

/**
 * TODO: doc and figure out if we can token this into the schema somewhere
 */
const exportFieldConstraints = {
    dataset: {
        name: {
            maxLength: 100
        },
        description: {
            maxLength: 300
        }
    },
    information: {
        name: {
            maxLength: 100
        },
        description: {
            maxLength: 300
        },
        author: {
            maxLength: 100
        }
    }
};

/**
 * ========================
 * Vega/Vega-Lite Assistive
 * ========================
 *
 * Additional Vega-related things we need for the visual.
 */

// Embedded versions - read from `package.json`, so that we can automate the packaged Vega and Vega-Lite versions on the
// visual's landing page, plus URLs or resources that we might want to expose to the user within the visual.
const vegaResources = {
    vega: {
        version: devDependencies.vega,
        documentationUrl: 'https://vega.github.io/vega/docs/',
        schemaUrl: 'https://vega.github.io/schema/vega/v5.json'
    },
    vegaLite: {
        version: devDependencies['vega-lite'],
        documentationUrl: 'https://vega.github.io/vega-lite/docs/',
        schemaUrl: 'https://vega.github.io/schema/vega-lite/v5.json'
    }
};
