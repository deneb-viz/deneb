import { Options } from 'react-hotkeys-hook';
import { getState } from '../../store';
import { persistSpecification } from '../specification';
import { setFocusToActiveEditor } from '../json-editor';
import {
    type Command,
    type SpecificationEditorRefs
} from '@deneb-viz/app-core';
import {
    type PersistenceProperty,
    persistProperties,
    resolveObjectProperties
} from '@deneb-viz/powerbi-compat/visual-host';

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

export const handleOpenCreateSpecificationDialog = () => {
    executeCommand('newSpecification', () => {
        setVisualProperty([{ name: 'isNewDialogOpen', value: true }]);
    });
};

/**
 * Handle toggling the editor theme.
 */
export const handleToggleEditorTheme = () => {
    executeCommand('themeToggle', () => {
        const {
            visualSettings: {
                editor: {
                    interface: {
                        theme: { value: theme }
                    }
                }
            }
        } = getState();
        const newValue = theme === 'dark' ? 'light' : 'dark';
        setVisualProperty([{ name: 'theme', value: newValue }], 'editor');
    });
};

/**
 * Manages persistence of a properties object to the store from an operation.
 */
export const setVisualProperty = (
    properties: PersistenceProperty[],
    objectName = 'vega'
) => persistProperties(resolveObjectProperties([{ objectName, properties }]));
