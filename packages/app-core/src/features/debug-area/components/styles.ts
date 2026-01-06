import { makeStyles, tokens } from '@fluentui/react-components';

export const useDebugWrapperStyles = makeStyles({
    container: {
        borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        boxSizing: 'border-box',
        display: 'flex',
        height: '100%',
        width: '100%'
    },
    wrapper: {
        display: 'flex',
        height: '100%',
        maxHeight: '100%',
        flexDirection: 'column',
        width: '100%'
    },
    details: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: 'auto'
    }
});
