import { makeStyles, shorthands } from '@fluentui/react-components';

/**
 * Create pane styles
 */
export const useCreateStyles = makeStyles({
    radioButton: {
        marginLeft: '2px'
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
    }
});
