import * as ace from 'ace-builds';
import Ace = ace.Ace;

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
import { CommandService } from '../services/CommandService';

/**
 * Core configuration that should be referenced by other files
 */
export {
    dataLimitDefaults,
    developerDefaults,
    editorDefaults,
    editorKeyBindings,
    locales,
    splitPaneDefaults,
    theme,
    vegaResources,
    vegaSettingsDefaults,
    vegaVersions,
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
     * Enables debugger, which is basically a ton of logging.
     */
    debug: false,
    /**
     * Provides a means of enabling developer-specific functionality independent of debugging.
     */
    developerMode: false,
    /**
     * Enables the Fetch More Data API and Data Limit property menu functionality.
     */
    fetchMoreData: true,
    /**
     * Allows custom `TooltipHandler` to be enabled via Visual Editor settings. This will resolve
     * tooltips for data points using the Power BI tooltip APIs based on signals from Vega/Vega-Lite.
     */
    tooltipHandler: true,
    /**
     * Enables the Power BI context menu to display on data points (if they can be resolved) via
     * Visual Editor settings. This currently only works for single view Vega-Lite specifications
     * and needs further R&D.
     */
    selectionContextMenu: false,
    /**
     * Enables the Power BI selection manager to accept signals from Vega-Lite selections and (if
     * they resolve to the `dataView`) cross-highlight other visuals. Visual authors will need to
     * apply their own visual encoding of selections to indicate which points are currently selected.
     */
    selectionDataPoint: false,
    /**
     * Enable external URIs in specifications for data and images - if enabled, we'll preserve any
     * URI/URL-based content in specifications and config, although these will be subject to the
     * standard CORS limitations that custom visuals are subject to.
     * If disabled, then we process text for any occurrences of a URI and strip it out (except for
     * data: URIs). I had attempted this by creating a custom loader for Vega but it seems to work
     * for data and ignore images, so whilst this approach is crude, it works for our purposes.
     */
    enableExternalUri: false
};

/**
 * =================
 * Vega view spacing
 * =================
 *
 * How much spacing (in px) to apply to the Vega visual, within its visible area.
 */
const visualViewportAdjust = {
    top: 10,
    left: 10
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
 * ===================
 * Editor Key Bindings
 * ===================
 *
 * Ace editor (and JSONEditor) both have a whole bunch of standard key bindings/shortcuts. Our visual
 * has a few of its own, or replaces them, so this is where we configure them.
 */
const editorKeyBindings: Ace.Command[] = [
    {
        name: 'applyChanges',
        bindKey: {
            win: 'Ctrl-Enter',
            mac: 'Command-Enter'
        },
        exec: (editor, service: CommandService) => {
            service.applyChanges();
        }
    },
    {
        name: 'toggleAutoApplyChanges',
        bindKey: {
            win: 'Ctrl-Shift-Enter',
            mac: 'Command-Shift-Enter'
        },
        exec: (editor, service: CommandService) => {
            service.toggleAutoApply();
        }
    },
    {
        name: 'repairFormatJson',
        bindKey: {
            win: 'Ctrl-\\',
            mac: 'Command-\\'
        },
        exec: (editor, service: CommandService) => {
            service.repairFormatJson();
        }
    },
    {
        name: 'createNewSpec',
        bindKey: {
            win: 'Ctrl-Alt-n',
            mac: 'Command-Alt-n'
        },
        exec: (editor, service: CommandService) => {
            service.createNewSpec();
        }
    },
    {
        name: 'getHelp',
        bindKey: {
            win: 'Ctrl-Alt-h',
            mac: 'Command-Alt-h'
        },
        exec: (editor, service: CommandService) => {
            service.openHelpSite();
        }
    }
];

/**
 * ===================================
 * Visual object and property defaults
 * ===================================
 */

// `DataLimitSettings`
const dataLimitDefaults = {
    enabled: visualFeatures.fetchMoreData,
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
 * ========================
 * Vega/Vega-Lite Assistive
 * ========================
 *
 * Additional Vega-related things we need for the visual.
 */

// Embedded versions - read from `package.json`, so that we can automate the packaged Vega and Vega-Lite versions on the
// visual's landing page.
const vegaVersions = {
    vegaLite: devDependencies['vega-lite'],
    vega: devDependencies.vega
};

// URLs or resources that we might want to expose to the user within the visual.
const vegaResources = {
    vega: {
        documentationUrl: 'https://vega.github.io/vega/docs/'
    },
    vegaLite: {
        documentationUrl: 'https://vega.github.io/vega-lite/docs/'
    }
};
