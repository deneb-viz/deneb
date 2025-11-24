import { getDenebState } from '../../state';
import { getZoomToFitScale } from '../interface';
import { type Command } from './types';

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
    } = getDenebState();
    if (mode === 'Editor' && commands[command]) {
        callback();
    }
};

/**
 * Allows the UI to discard changes after exiting the editor. As Monaco preserves state for the session, this will do
 * nothing.
 */
export const handleDiscardChanges = () => {
    executeCommand('discardChanges', () => {
        return;
    });
};

/**
 * Fit the zoom level to the current preview area dimensions.
 */
export const handleZoomFit = () =>
    executeCommand('zoomFit', () => {
        getDenebState().updateEditorZoomLevel(getZoomToFitScale());
    });
