export type ToolbarRole = 'application' | 'debug';

/**
 * Denotes the command a toolbar button invokes, which allows us to drive the
 * rendering and logic whilst using a common component.
 */
export type ToolbarCommand =
    | 'editorPaneToggle'
    | 'formatJson'
    | 'fieldMappings'
    | 'newSpecification'
    | 'exportSpecification'
    | 'helpSite'
    | 'themeToggle'
    | 'debugAreaToggle'
    | 'zoomFit'
    | 'zoomIn'
    | 'zoomLevel'
    | 'zoomOut';
