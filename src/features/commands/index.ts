import { getZoomToFitScale } from '../../core/ui/advancedEditor';
import { getConfig } from '../../core/utils/config';
import { getState } from '../../store';
import { InterfaceMode } from '../interface';
import { ISpecification } from '../specification';
import {
    Command,
    IExportSpecCommandTestOptions,
    IZoomOtherCommandTestOptions,
    IZoomLevelCommandTestOptions
} from './types';

export * from './types';

const ZOOM_CONFIG = getConfig().zoomLevel;

/**
 * Executes a command if:
 * - the command is valid
 * - the interface mode is valid
 * - the command callback is defined
 */
const executeCommand = (command: Command, callback: () => void) => {
    const {
        commands,
        interface: { mode }
    } = getState();
    mode === 'Editor' && commands[command] && callback();
};

/**
 * Displays the export specification dialog.
 */
export const handleExportSpecification = () =>
    executeCommand('exportSpecification', () => {
        getState().interface.setModalDialogRole('Export');
    });

/**
 * Fit the zoom level to the current preview area dimensions.
 */
export const handleZoomFit = () =>
    executeCommand('zoomFit', () => {
        getState().updateEditorZoomLevel(getZoomToFitScale());
    });

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by
 * step value.
 */
export const handleZoomIn = () =>
    executeCommand('zoomIn', () => {
        const value = getState().editorZoomLevel;
        const { step, max } = ZOOM_CONFIG,
            level = Math.min(max, Math.floor((value + step) / 10) * 10);
        const zoomLevel = (value < max && level) || level;
        getState().updateEditorZoomLevel(zoomLevel);
    });

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by
 * step value.
 */
export const handleZoomOut = () =>
    executeCommand('zoomOut', () => {
        const value = getState().editorZoomLevel;
        const { step, min } = ZOOM_CONFIG,
            level = Math.max(min, Math.ceil((value - step) / 10) * 10);
        const zoomLevel = (value > min && level) || level;
        getState().updateEditorZoomLevel(zoomLevel);
    });

/**
 * Resets the zoom level to the default value.
 */
export const handleZoomReset = () =>
    executeCommand('zoomReset', () => {
        getState().updateEditorZoomLevel(ZOOM_CONFIG.default);
    });

/**
 * Tests whether the export specification command is enabled.
 */
export const isExportSpecCommandEnabled = (
    options: IExportSpecCommandTestOptions
) =>
    !options.editorIsDirty &&
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Tests whether other zoom commands are enabled.
 */
export const isZoomOtherCommandEnabled = (
    options: IZoomOtherCommandTestOptions
) =>
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Tests whether the zoom in command is enabled.
 */
export const isZoomInCommandEnabled = (options: IZoomLevelCommandTestOptions) =>
    options.value !== ZOOM_CONFIG.max &&
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Tests whether the zoom out command is enabled.
 */
export const isZoomOutCommandEnabled = (
    options: IZoomLevelCommandTestOptions
) =>
    options.value !== ZOOM_CONFIG.min &&
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Confirms whether the interface mode is valid. A condition for many commands.
 */
const isInterfaceModeValid = (mode: InterfaceMode) => mode === 'Editor';

/**
 * Confirms whether the specification is valid. A condition for many commands.
 */
const isSpecificationValid = (specification: ISpecification) =>
    specification.status === 'valid';
