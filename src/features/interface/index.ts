import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import {
    POPOVER_Z_INDEX,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '../../constants';

/**
 * UI theming utilities.
 */
export * as Themes from './theme';
export { AdvancedEditorInterface } from './components/advanced-editor-interface';
export { StatusBarContainer } from './components/status-bar-container';
export { TooltipCustomMount } from './components/tooltip-custom-mount';
export { VisualInterface } from './components/visual-interface';

export type InterfaceTheme = 'light' | 'dark';

export const useInterfaceStyles = () =>
    makeStyles({
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
        }
    })();
