import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { getConfig } from '../../core/utils/config';

export { DebugAreaContent } from './components/debug-area-content';
export { getLogErrorForStatusDisplay, logHasErrors } from './logging';

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
        ...shorthands.overflow('hidden')
    },
    container: {
        height: `calc(100% - ${getConfig().previewPane.toolbarMinSize}px)`
    },
    contentWrapper: {
        display: 'flex',
        height: '100%',
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
        flexShrink: 1000,
        ...shorthands.margin('5px'),
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
        flexShrink: 1,
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
        ...shorthands.margin('0px', '10px')
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
    },
    toolbar: {
        justifyContent: 'space-between',
        ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
        paddingBottom: '0px',
        paddingTop: '0px'
    },
    toolbarGroup: { alignItems: 'center' },
    toolbarSlider: {
        minWidth: '75px',
        width: '75px',
        height: '100%',
        ...shorthands.margin('0px', '5px'),
        '& div::before': { backgroundImage: 'none' }
    },
    toolbarButton: { ...shorthands.padding('2px') },
    zoomLevelButton: { minWidth: '50px' },
    zoomLevelControlBase: {
        display: 'flex',
        flexBasis: '100%',
        flexDirection: 'column',
        '> label': {
            marginBottom: tokens.spacingVerticalXXS
        }
    },
    zoomLevelCustomSpinButton: {
        marginLeft: '40px',
        width: '80px'
    },
    zoomInButton: { marginLeft: '-8px' },
    zoomOutButton: { marginRight: '-8px' }
});
