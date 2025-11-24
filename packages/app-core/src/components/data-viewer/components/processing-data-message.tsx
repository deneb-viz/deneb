import { makeStyles, Spinner, tokens } from '@fluentui/react-components';

import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import {
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    SPLIT_PANE_HANDLE_SIZE
} from '../../../lib';
import { StatusBarContainer } from '../../ui';

const useProcessingDataMessageStyles = makeStyles({
    container: {
        height: `calc(100% - ${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px - ${
            SPLIT_PANE_HANDLE_SIZE / 2
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
        overflow: 'auto'
    },
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
    const message = getI18nValue('Text_Debug_Data_Processing');
    return (
        <div className={classes.container}>
            <div className={classes.contentWrapper}>
                <div className={classes.dataTableDetails}>
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
