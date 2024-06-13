import { InterfaceMode } from '../interface';
import { ISpecification } from '../specification';

/**
 * Denotes the command a toolbar button invokes, which allows us to drive the
 * rendering and logic whilst using a common component.
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

export interface IExportSpecCommandTestOptions {
    editorIsDirty: boolean;
    specification: ISpecification;
    interfaceMode: InterfaceMode;
}

/**
 * For other zoom commands, these are the things we need to test.
 */
export interface IZoomOtherCommandTestOptions {
    specification: ISpecification;
    interfaceMode: InterfaceMode;
}

/**
 * For zoom level-related commands, these are the things we need to test.
 */
export interface IZoomLevelCommandTestOptions {
    value: number;
    specification: ISpecification;
    interfaceMode: InterfaceMode;
}
