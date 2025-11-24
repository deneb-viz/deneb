import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { POPOVER_Z_INDEX } from '../../constants';

/**
 * UI theming utilities.
 */
export { AdvancedEditor } from './components/advanced-editor';
export { VisualInterface } from './components/visual-interface';

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
