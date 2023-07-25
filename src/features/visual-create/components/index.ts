import { makeStyles, shorthands } from '@fluentui/react-components';

/**
 * Create pane styles
 */
export const useCreateStyles = makeStyles({
    importRadioGroup: {
        ...shorthands.padding('10px'),
        paddingLeft: '0px'
    },
    radioButton: {
        marginLeft: '2px'
    },
    noTemplateMessage: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50%',
        fontStyle: 'italic'
    },
    templateInformationHeader: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%'
    },
    templateInformationContent: { flexGrow: 1 },
    templatePreviewImageContainer: { marginLeft: '10px', marginRight: '10px' },
    templateTitle: {
        paddingBottom: '1em'
    },
    templatePlaceholderMessage: {
        paddingTop: '1em',
        paddingBottom: '1em'
    }
});
