import React from 'react';
import { shallow } from 'zustand/shallow';
import { useDebugStyles } from '..';
import store from '../../../store';
import { StatusBarContainer } from '../../interface';
import { i18nValue } from '../../../core/ui/i18n';
// import { DatasetViewerOptions } from './dataset-viewer-options';

/**
 * Displays when no data is available in the data table.
 */
export const NoDataMessage: React.FC = () => {
    const { mode } = store(
        (state) => ({ mode: state.editorPreviewAreaSelectedPivot }),
        shallow
    );
    const classes = useDebugStyles();
    const message = i18nValue(
        mode === 'data'
            ? 'Text_Debug_Data_No_Data'
            : 'Text_Debug_Signal_No_Data'
    );
    const options = mode === 'data' ? /*<DatasetViewerOptions />*/ null : null;
    return (
        <div className={classes.container}>
            <div className={classes.contentWrapper}>
                <div className={classes.dataTableDetails}>
                    <div className={classes.dataTableNoDataMessage}>
                        {message}
                    </div>
                    <StatusBarContainer>
                        <div className={classes.statusBarTable}>{options}</div>
                    </StatusBarContainer>
                </div>
            </div>
        </div>
    );
};
