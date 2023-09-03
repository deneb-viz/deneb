import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import {
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    SPLIT_PANE_RESIZER_SIZE
} from '../../constants';

export { DebugAreaContent } from './components/debug-area-content';

/**
 * Font family to use for data table. We use a monospace font, to be able to
 * guarantee that display width can be reliably predicated without having to
 * spam a canvas renderer for every field and value and saves us a significant
 * amount of time and resource.
 */
export const DATA_TABLE_FONT_FAMILY = 'Consolas, "Courier New", monospace';

/**
 * Font size for the data table display.
 */
export const DATA_TABLE_FONT_SIZE = 12;

/**
 * The maximum permitted length of a value for a table cell before 'truncating'
 * it for display.
 */
export const DATA_TABLE_VALUE_MAX_LENGTH = 100;

/**
 * Styles used for debugging features.
 */
export const useDebugStyles = makeStyles({
    body: {
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.overflow('hidden')
    },
    container: {
        height: `calc(100% - ${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px - ${
            SPLIT_PANE_RESIZER_SIZE / 2
        }px)`
    },
    contentWrapper: {
        display: 'flex',
        height: '100%',
        maxHeight: '100%',
        flexDirection: 'column'
    },
    dataTableDetails: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        ...shorthands.overflow('auto')
    },
    dataTableNoDataMessage: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        flexShrink: 1000,
        ...shorthands.margin('5px'),
        ...shorthands.overflow('auto')
    },
    logDetails: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        height: '0px',
        ...shorthands.padding('5px'),
        ...shorthands.overflow('auto')
    },
    logLevelDropdown: {
        minWidth: '95px',
        width: '95px',
        maxWidth: '95px'
    },
    logLevelEntry0: {
        fontWeight: 'bold',
        color: tokens.colorNeutralForeground1
    },
    logLevelEntry1: {
        fontWeight: 'bold',
        color: tokens.colorPaletteRedForeground1
    },
    logLevelEntry2: {
        fontWeight: 'bold',
        color: tokens.colorPaletteYellowForeground1
    },
    logLevelEntry3: {
        fontWeight: 'bold',
        color: tokens.colorPaletteGreenForeground1
    },
    logLevelEntry4: {
        fontWeight: 'bold',
        color: tokens.colorNeutralForeground1
    },
    statusBarLog: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%',
        ...shorthands.margin('0px', '10px')
    },
    statusBarOptions: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%'
    },
    statusBarTable: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%',
        ...shorthands.margin('1px', '10px')
    },
    statusBarTableNavigation: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%'
    },
    tab: {
        paddingBottom: '1px'
    }
});
