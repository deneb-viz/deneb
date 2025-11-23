import React from 'react';
import { Spinner } from '@fluentui/react-components';

import { useDebugStyles } from '..';
import { StatusBarContainer } from '@deneb-viz/app-core';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Displays when a dataset in the data table is being processed.
 */
export const ProcessingDataMessage: React.FC = () => {
    const classes = useDebugStyles();
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
