import powerbi from 'powerbi-visuals-api';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { POPOVER_Z_INDEX } from '../../constants';

import { getState } from '../../store';
import { PREVIEW_PANE_TOOLBAR_MIN_SIZE } from '@deneb-viz/app-core';

/**
 * UI theming utilities.
 */
export * as Themes from './theme';
export { AdvancedEditor } from './components/advanced-editor';
export { CappedTextField } from './components/capped-text-field';
export { StatusBarContainer } from './components/status-bar-container';
export { TooltipCustomMount } from './components/tooltip-custom-mount';
export { VisualInterface } from './components/visual-interface';

export type InterfaceTheme = 'light' | 'dark';

export const useInterfaceStyles = makeStyles({
    container: {
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        cursor: 'auto',
        '& .editor-heading': {
            cursor: 'pointer'
        },
        ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2)
    },
    editorContainer: {
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        width: '100%',
        ...shorthands.overflow('hidden')
    },
    statusBarContainer: {
        boxSizing: 'border-box',
        flexShrink: 0,
        width: '100%',
        height: `${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px}`,
        borderTopColor: tokens.colorNeutralStroke2,
        borderTopStyle: 'solid',
        borderTopWidth: '1px',
        ...shorthands.overflow('hidden')
    },
    tooltipMount: {
        zIndex: POPOVER_Z_INDEX
    },
    themeBackground: {
        backgroundColor: tokens.colorNeutralBackground1
    },
    visualBackground: {
        backgroundColor: 'transparent'
    }
});

/**
 * Confirms that specified events are not occurring in the advanced editor UI
 * and the JSON editor can have focus set to it (or other similar actions).
 */
export const shouldPrioritizeJsonEditor = () => {
    const {
        interface: { modalDialogRole }
    } = getState();
    const isPopover = modalDialogRole !== 'None';
    return !isPopover;
};
