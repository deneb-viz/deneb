import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import {
    POPOVER_Z_INDEX,
    PREVIEW_PANE_TOOLBAR_BUTTON_PADDING,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '../../../constants';

export const useToolbarStyles = makeStyles({
    buttonSmall: {
        ...shorthands.padding(`${PREVIEW_PANE_TOOLBAR_BUTTON_PADDING}px}`)
    },
    buttonZoomLevel: { minWidth: '50px' },
    buttonZoomIn: { marginLeft: '-8px' },
    buttonZoomOut: { marginRight: '-8px' },
    controlBaseZoomLevel: {
        display: 'flex',
        flexBasis: '100%',
        flexDirection: 'column',
        '> label': {
            marginBottom: tokens.spacingVerticalXXS
        }
    },
    menuButtonApply: {
        width: '165px',
        maxWidth: '165px',
        '& button': {
            minWidth: '145px',
            justifyContent: 'start',
            fontWeight: 'normal'
        }
    },
    menuButtonApplyList: {
        width: '155px',
        maxWidth: '155px',
        zIndex: POPOVER_Z_INDEX
    },
    slider: {
        minWidth: '75px',
        width: '75px',
        height: '100%',
        ...shorthands.margin('0px', '5px'),
        '& div::before': { backgroundImage: 'none' }
    },
    popoverZoomLevel: {
        zIndex: POPOVER_Z_INDEX
    },
    spinButtonZoomCustom: {
        marginLeft: '40px',
        width: '80px'
    },
    toolbarAdvancedEditor: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        justifyContent: 'space-between'
    },
    toolbarDebug: {
        display: 'flex',
        height: `${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px`,
        justifyContent: 'space-between',
        ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
        paddingBottom: '0px',
        paddingTop: '0px'
    },
    toolbarGroupAdvancedEditor: {
        columnGap: tokens.spacingHorizontalXXS,
        display: 'flex'
    },
    toolbarGroupDebug: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalXXS,
        display: 'flex'
    }
});
