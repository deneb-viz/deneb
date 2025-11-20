import { makeStyles, shorthands } from '@fluentui/react-components';

/**
 * Create pane styles
 */
export const useCreateStyles = makeStyles({
    additionalResourcesMessage: {
        height: '25%',
        ...shorthands.margin('25px')
    },
    radioButton: {
        marginLeft: '2px'
    },
    noTemplateMessage: {
        display: 'flex',
        alignItems: 'center',
        height: '25%',
        fontStyle: 'italic',
        marginLeft: '25px'
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
