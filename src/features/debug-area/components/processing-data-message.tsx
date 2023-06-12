import React from 'react';
import { Spinner } from '@fluentui/react-components';

import { useDebugStyles } from '..';
import { StatusBarContainer } from '../../interface';
import { i18nValue } from '../../../core/ui/i18n';

/**
 * Displays when a dataset in the data table is being processed.
 */
export const ProcessingDataMessage: React.FC = () => {
    const classes = useDebugStyles();
    const message = i18nValue('Text_Debug_Data_Processing');
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
