import React from 'react';
import { logRender } from '../../logging';
import { FluentProvider } from '@fluentui/react-components';
import { Themes } from '../../interface';
import { useStatusStyles } from '.';

type StatusContainerProps = {
    children: React.ReactNode;
};

/**
 * Provides the standard (outer) layout for a status page.
 */
export const StatusContainer: React.FC<StatusContainerProps> = ({
    children
}) => {
    const classes = useStatusStyles();
    logRender('StatusContainer');
    return (
        <FluentProvider theme={Themes.light} className={classes.container}>
            <div className={classes.flexContainerVertical}>{children}</div>
        </FluentProvider>
    );
};
