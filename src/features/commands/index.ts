import { Options } from 'react-hotkeys-hook';
import { getState } from '../../store';
import { persistSpecification } from '../specification';
import { setFocusToActiveEditor } from '../json-editor';
import {
    type Command,
    type SpecificationEditorRefs
} from '@deneb-viz/app-core';

/**
 * Specifies `react-hotkeys-hook` bindings for particular HTML elements.
 */
export const HOTKEY_OPTIONS: Options = {
    enableOnFormTags: ['INPUT', 'SELECT', 'TEXTAREA'],
    combinationKey: '|'
};

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
 * Applies the changes to the specification.
 */
export const handleApplyChanges = (editorRefs: SpecificationEditorRefs) => {
    executeCommand('applyChanges', () =>
        persistSpecification(
            editorRefs?.spec.current,
            editorRefs?.config.current
        )
    );
    setFocusToActiveEditor(editorRefs);
};

/**
 * Toggles the auto-apply changes mode.
 */
export const handleAutoApplyChanges = (editorRefs: SpecificationEditorRefs) => {
    const {
        editor: { toggleApplyMode }
    } = getState();
    handleApplyChanges(editorRefs);
    executeCommand('autoApplyToggle', toggleApplyMode);
};
