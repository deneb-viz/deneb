import { makeStyles, tokens } from '@fluentui/react-components';

import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { useDenebState } from '../../../state';
import {
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    SPLIT_PANE_HANDLE_SIZE
} from '../../../lib';
import { DatasetSelect } from './dataset-viewer/dataset-select';
import { StatusBarContainer } from '../../../components/ui';

const useNoDataMessageStyles = makeStyles({
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
    statusBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%',
        margin: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalMNudge}`
    }
});

/**
 * Displays when no data is available in the data table.
 */
export const NoDataMessage = () => {
    const { mode } = useDenebState((state) => ({
        mode: state.editorPreviewAreaSelectedPivot
    }));
    const classes = useNoDataMessageStyles();
    const message = getI18nValue(
        mode === 'data'
            ? 'Text_Debug_Data_No_Data'
            : 'Text_Debug_Signal_No_Data'
    );
    const options = mode === 'data' ? <DatasetSelect /> : null;
    return (
        <div className={classes.container}>
            <div className={classes.contentWrapper}>
                <div className={classes.dataTableDetails}>
                    <div className={classes.dataTableNoDataMessage}>
                        {message}
                    </div>
                    <StatusBarContainer>
                        <div className={classes.statusBar}>{options}</div>
                    </StatusBarContainer>
                </div>
            </div>
        </div>
    );
};
