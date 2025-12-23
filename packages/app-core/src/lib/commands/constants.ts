import { Options } from 'react-hotkeys-hook';

/**
 * Specifies `react-hotkeys-hook` bindings for particular HTML elements.
 */
export const HOTKEY_OPTIONS: Options = {
    enableOnFormTags: ['INPUT', 'SELECT', 'TEXTAREA'],
    splitKey: '|'
};

/**
 * Keyboard shortcuts for the application.
 */
export const HOTKEY_BINDINGS = {
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
        combination: 'ctrl|backquote',
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
        combination:
            'ctrl|alt|=,ctrl|alt|equal,ctrl|alt|+,ctrl|alt|plus,ctrl|alt|numpad_plus',
        functionalArea: 'other'
    },
    zoomOut: {
        combination: 'ctrl|alt|-,ctrl|alt|minus,ctrl|alt|numpad_minus',
        functionalArea: 'other'
    },
    zoomReset: {
        combination: 'ctrl|alt|0,ctrl|alt|num_0',
        functionalArea: 'other'
    },
    zoomFit: {
        combination: 'ctrl|alt|numpad_multiply',
        functionalArea: 'other'
    }
};
