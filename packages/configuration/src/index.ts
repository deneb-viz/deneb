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
 * Default values for the panes in the advanced editor.
 */
export const SPLIT_PANE_CONFIGURATION = {
    minSize: 300,
    defaultSizePercent: 0.4,
    maxSizePercent: 0.5,
    collapsedSize: 36
};

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
