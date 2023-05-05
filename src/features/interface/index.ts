import { makeStyles } from '@fluentui/react-components';

/**
 * UI theming utilities.
 */
export * as Themes from './theme';

export type InterfaceTheme = 'light' | 'dark';

export const useInterfaceStyles = (theme: InterfaceTheme) =>
    makeStyles({
        container: {
            height: 'calc(100% - 2px)',
            width: 'calc(100% - 2px)',
            cursor: 'auto',
            '& .editor-heading': {
                cursor: 'pointer'
            }
        }
    })();
