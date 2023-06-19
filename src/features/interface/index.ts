import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { getConfig } from '../../core/utils/config';

/**
 * UI theming utilities.
 */
export * as Themes from './theme';
export { StatusBarContainer } from './components/status-bar-container';

export type InterfaceTheme = 'light' | 'dark';

export const useInterfaceStyles = () =>
    makeStyles({
        container: {
            height: 'calc(100% - 2px)',
            width: 'calc(100% - 2px)',
            cursor: 'auto',
            '& .editor-heading': {
                cursor: 'pointer'
            }
        },
        statusBarContainer: {
            boxSizing: 'border-box',
            flexShrink: 0,
            width: '100%',
            height: `${getConfig().previewPane.toolbarMinSize}px}`,
            borderTopColor: tokens.colorNeutralStroke2,
            borderTopStyle: 'solid',
            borderTopWidth: '1px',
            ...shorthands.overflow('hidden')
        }
    })();
