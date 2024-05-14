import capabilities from '../capabilities.json';
import features from './features.json';
import { devDependencies } from '../package.json';
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
    formatJson: {
        combination: 'ctrl|alt|r',
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
 * Default configuration for the preview pane (AKA the debug pane).
 */
export const PREVIEW_PANE_DEFAULTS = {
    areaMinSize: 100,
    toolbarMinSize: 28,
    toolbarInitialPercent: 40,
    viewportBorderSize: 2,
    logLevels: [
        {
            level: 0,
            i18n: 'Enum_LogLevel_None',
            color: 'black'
        },
        {
            level: 1,
            i18n: 'Enum_LogLevel_Error',
            color: 'redDark',
            icon: 'ErrorBadge'
        },
        {
            level: 2,
            i18n: 'Enum_LogLevel_Warn',
            color: 'themeDark',
            icon: 'Warning'
        },
        {
            level: 3,
            i18n: 'Enum_LogLevel_Info',
            color: 'greenDark',
            icon: 'Info'
        }
    ]
};

/**
 * Additional resources neede for each provider in the application (Vega,
 * Vega-Lite and Deneb). These are used to provide links to documentation,
 * examples, other resouces, and patching of specifications.
 */
export const PROVIDER_RESOURCES = {
    deneb: {
        interactivityDocumentationUrl:
            'https://deneb-viz.github.io/interactivity-overview',
        changelogDocumentationUrl: 'https://deneb-viz.github.io/changelog',
        examplesUrl: 'https://deneb-viz.github.io/community/resources'
    },
    vega: {
        documentationUrl: 'https://vega.github.io/vega/docs/',
        examplesUrl: 'https://vega.github.io/vega/examples/',
        schemaUrl: 'https://vega.github.io/schema/vega/v5.json',
        patch: {
            signals: [
                {
                    name: 'pbiContainerHeight',
                    update: 'containerSize()[1]'
                },
                {
                    name: 'pbiContainerWidth',
                    update: 'containerSize()[0]'
                }
            ]
        }
    },
    vegaLite: {
        documentationUrl: 'https://vega.github.io/vega-lite/docs/',
        examplesUrl: 'https://vega.github.io/vega-lite/examples/',
        schemaUrl: 'https://vega.github.io/schema/vega-lite/v5.json'
    }
};

/**
 * Provider versions, sourced from the `package.json` file. These are used to
 * track which version of Vega or Vega-Lite we're currently using, whether this
 * may have changed between visual versions, and potentially perform migrations
 * if necessary.
 */
export const PROVIDER_VERSIONS = {
    vega: devDependencies['vega'],
    vegaLite: devDependencies['vega-lite']
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
