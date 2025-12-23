import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';

/**
 * Available commands within the UI, which can be invoked via buttons or shortcuts.
 */
export type Command =
    | 'applyChanges'
    | 'autoApplyToggle'
    | 'debugPaneShowData'
    | 'debugPaneShowLogs'
    | 'debugPaneShowSignals'
    | 'debugPaneToggle'
    | 'discardChanges'
    | 'editorFocusOut'
    | 'editorPaneToggle'
    | 'fieldMappings'
    | 'navigateConfig'
    | 'navigateSettings'
    | 'navigateSpecification'
    | 'newSpecification'
    | 'exportSpecification'
    | 'helpSite'
    | 'themeToggle'
    | 'zoomFit'
    | 'zoomIn'
    | 'zoomLevel'
    | 'zoomOut'
    | 'zoomReset';

export type ExportSpecCommandTestOptions = {
    editorIsDirty: boolean;
    specification: CompiledSpecification;
};

/**
 * For other zoom commands, these are the things we need to test.
 */
export type ZoomOtherCommandTestOptions = {
    specification: CompiledSpecification;
};

/**
 * For zoom level-related commands, these are the things we need to test.
 */
export type ZoomLevelCommandTestOptions = {
    value: number;
    specification: CompiledSpecification;
};
