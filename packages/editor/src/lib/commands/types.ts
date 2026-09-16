import { type CompilationResult } from '@deneb-viz/vega-runtime/compilation';

/**
 * Available commands within the UI, which can be invoked via buttons or shortcuts.
 */
export type Command =
    | 'applyChanges'
    | 'autoApplyToggle'
    | 'debugPaneShowData'
    | 'debugPaneShowLogs'
    | 'debugPaneShowSignals'
    | 'debugPaneShowSource'
    | 'debugPaneToggle'
    | 'discardChanges'
    | 'editorFocusOut'
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

/**
 * The commands whose enabled state is derived on read (via the selectors
 * in `lib/commands/selectors.ts`) rather than stored in `state.commands`.
 * `CommandsSliceProperties` (state/commands.ts) excludes these — nothing
 * writes or reads them as stored flags any more; `selectCommandEnabled`
 * dispatches each to its selector instead of falling through to
 * `state.commands[command]`.
 */
export type DerivedCommand =
    | 'exportSpecification'
    | 'zoomFit'
    | 'zoomIn'
    | 'zoomOut'
    | 'zoomReset';

export type ExportSpecCommandTestOptions = {
    editorIsDirty: boolean;
    compilationResult: CompilationResult | null;
};

/**
 * For other zoom commands, these are the things we need to test.
 */
export type ZoomOtherCommandTestOptions = {
    compilationResult: CompilationResult | null;
};

/**
 * For zoom level-related commands, these are the things we need to test.
 */
export type ZoomLevelCommandTestOptions = {
    value: number;
    compilationResult: CompilationResult | null;
};
