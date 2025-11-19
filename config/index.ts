import capabilities from '../capabilities.json';
import features from './features.json';

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
 * Keyboard shortcuts for the application.
 */
export const KEY_BINDINGS = {
    applyChanges: {
        combination: 'ctrl|enter',
        functionalArea: 'other'
    },
    autoApplyToggle: {
        combination: 'ctrl|shift|enter',
        functionalArea: 'other'
    },
    exportSpecification: {
        combination: 'ctrl|alt|t',
        functionalArea: 'other'
    },
    newSpecification: {
        combination: 'ctrl|alt|n',
        functionalArea: 'other'
    },
    fieldMappings: {
        combination: 'ctrl|alt|f',
        functionalArea: 'other'
    },
    helpSite: {
        combination: 'ctrl|alt|h',
        functionalArea: 'other'
    },
    themeToggle: {
        combination: 'ctrl|shift|alt|t',
        functionalArea: 'other'
    },
    navigateSpecification: {
        combination: 'ctrl|alt|1,ctrl|alt|num_1',
        functionalArea: 'other'
    },
    navigateConfig: {
        combination: 'ctrl|alt|2,ctrl|alt|num_2',
        functionalArea: 'other'
    },
    navigateSettings: {
        combination: 'ctrl|alt|3,ctrl|alt|num_3',
        functionalArea: 'other'
    },
    editorPaneToggle: {
        combination: 'ctrl|alt|space',
        functionalArea: 'other'
    },
    debugPaneToggle: {
        combination: 'ctrl|`',
        functionalArea: 'other'
    },
    debugPaneShowData: {
        combination: 'ctrl|alt|7,ctrl|alt|num_7',
        functionalArea: 'other'
    },
    debugPaneShowSignals: {
        combination: 'ctrl|alt|8,ctrl|alt|num_8',
        functionalArea: 'other'
    },
    debugPaneShowLogs: {
        combination: 'ctrl|alt|9,ctrl|alt|num_9',
        functionalArea: 'other'
    },
    zoomIn: {
        combination: 'ctrl|alt|+,ctrl|alt|=',
        functionalArea: 'other'
    },
    zoomOut: {
        combination: 'ctrl|alt|-',
        functionalArea: 'other'
    },
    zoomReset: {
        combination: 'ctrl|alt|0,ctrl|alt|num_0',
        functionalArea: 'other'
    },
    zoomFit: {
        combination: 'ctrl|alt|num_multiply',
        functionalArea: 'other'
    }
};

/**
 * Current major version of the template metadata. This is used to ensure that
 * we can handle migrations between versions, and that we can handle different
 * versions of the template metadata if needed.
 */
export const TEMPLATE_METADATA_VERSION = 1;

/**
 * Represents the max cap for any preview images generated from the Vega View
 * API.
 */
export const TEMPLATE_PREVIEW_IMAGE_MAX_SIZE = 150;
