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
