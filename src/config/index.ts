import { TLocale, TSpecRenderMode } from '../types';
import { locales } from './locales';
import { theme } from './theme';
import { TSpecProvider } from '../api/specification';

/**
 * Core configuration that should be referenced by other files
 */
export {
    dataLimitDefaults,
    developerDefaults,
    exportFieldConstraints,
    locales,
    theme,
    vegaSettingsDefaults,
    visualFeatures
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
