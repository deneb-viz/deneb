import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/**
 * Main interface styles
 */
export const useModalDialogStyles = makeStyles({
    dialog: {
        maxHeight: 'calc(100vh - 24px)',
        height: 'calc(100vh - 24px)',
        maxWidth: 'calc(100vw - 24px)'
    },
    dialogBody: {
        maxHeight: 'calc(100vh - 24px - 48px)',
        height: '100%',
        width: '100%',
        maxWidth: '100%'
    },
    pane: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        height: '100%',
        width: 'auto',
        overflowY: 'hidden'
    },
    paneAssistiveText: {
        marginBottom: tokens.spacingVerticalL
    },
    paneContent: {
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        paddingTop: '10px',
        ...shorthands.borderColor(tokens.colorNeutralStroke2),
        ...shorthands.borderWidth('1px'),
        ...shorthands.borderStyle('solid'),
        ...shorthands.margin('0px')
    },
    paneContentField: {
        ...shorthands.padding(
            tokens.spacingVerticalNone,
            tokens.spacingHorizontalNone,
            tokens.spacingVerticalS
        )
    },
    paneContentFooter: {
        display: 'flex',
        width: '100%',
        paddingTop: '5px',
        paddingBottom: '5px',
        justifyContent: 'flex-end',
        borderTopColor: tokens.colorNeutralStroke2,
        borderTopWidth: '1px',
        borderTopStyle: 'solid'
    },
    paneContentHeading: {
        paddingBottom: tokens.spacingVerticalM
    },
    paneContentScrollable: {
        height: '100%',
        overflowY: 'auto',
        ...shorthands.padding('10px'),
        paddingTop: '0px'
    },
    paneContentSection: {
        paddingBottom: tokens.spacingVerticalXL
    },
    paneContentFooterButtonContainer: {
        paddingRight: '15px'
    },
    paneMenu: {
        width: '300px',
        minWidth: '300px',
        overflowY: 'auto',
        paddingBottom: '0px',
        paddingRight: '24px',
        marginRight: '5px'
    },
    paneRoot: {
        marginTop: '5px',
        marginBottom: '0px',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        width: 'auto',
        height: 'auto',
        boxSizing: 'border-box',
        overflowY: 'hidden'
    }
});
