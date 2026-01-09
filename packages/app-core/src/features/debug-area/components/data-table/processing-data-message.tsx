import { makeStyles, Spinner, tokens } from '@fluentui/react-components';

import { StatusBarContainer } from '../../../../components/ui';
import { useDenebState } from '../../../../state';
import { useDebugWrapperStyles } from '../styles';

const useProcessingDataMessageStyles = makeStyles({
    dataTableNoDataMessage: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        flexShrink: 1000,
        margin: tokens.spacingVerticalXS,
        overflow: 'auto'
    },
    statusBarTable: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%',
        margin: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalMNudge}`
    }
});

/**
 * Displays when a dataset in the data table is being processed.
 */
export const ProcessingDataMessage = () => {
    const classes = useProcessingDataMessageStyles();
    const wrapperClasses = useDebugWrapperStyles();
    const translate = useDenebState((state) => state.i18n.translate);
    const message = translate('Text_Debug_Data_Processing');
    return (
        <div className={wrapperClasses.container}>
            <div className={wrapperClasses.wrapper}>
                <div className={wrapperClasses.details}>
                    <div className={classes.dataTableNoDataMessage}>
                        <Spinner size='small' label={message} />
                    </div>
                    <StatusBarContainer>
                        <div className={classes.statusBarTable} />
                    </StatusBarContainer>
                </div>
            </div>
        </div>
    );
};
