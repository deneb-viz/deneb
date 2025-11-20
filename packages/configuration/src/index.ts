import { devDependencies } from '../../../package.json';
import { visual } from '../../../pbiviz.json';

/**
 * This is an object that contains the visual's metadata. This is used to handle places we need to display this
 * information in the UI, as well as for versioning and other purposes.
 * @remarks
 * POTENTIAL TECH DEBT
 */
export const APPLICATION_INFORMATION_CONFIGURATION = visual;

/**
 * Default values for the data table in the debug pane.
 */
export const DATA_VIEWER_CONFIGURATION = {
    rowsPerPage: {
        default: 50,
        values: [10, 25, 50, 100, 150, 200]
    }
};

/**
 * Default configuration for the preview pane (AKA the debug pane).
 */
export const DEBUG_PANE_CONFIGURATION = {
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
 * Additional resources needed for each provider in the application (Vega, Vega-Lite and Deneb). These are used to
 * provide links to documentation, examples, other resources, and patching of specifications.
 */
export const PROVIDER_RESOURCE_CONFIGURATION = {
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
 * Provider versions, sourced from the `package.json` file. These are used to track which version of Vega or Vega-Lite
 * we're currently using, whether this may have changed between visual versions, and potentially perform migrations
 * if necessary.
 * @remarks
 * POTENTIAL TECH DEBT
 */
export const PROVIDER_VERSION_CONFIGURATION = {
    vega: devDependencies['vega'],
    vegaLite: devDependencies['vega-lite']
};

/**
 * Default values for the panes in the advanced editor.
 */
export const SPLIT_PANE_CONFIGURATION = {
    minSize: 300,
    defaultSizePercent: 0.4,
    maxSizePercent: 0.5,
    collapsedSize: 36
};

/**
 * Represents the max cap for any preview images generated from the Vega View API.
 */
export const TEMPLATE_PREVIEW_IMAGE_MAX_SIZE = 150;

/**
 * Configuration for the zoom controls in the visual preview pane.
 */
export const VISUAL_PREVIEW_ZOOM_CONFIGURATION = {
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
