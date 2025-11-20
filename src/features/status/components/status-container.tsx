import React from 'react';
import { logRender } from '../../logging';
import { FluentProvider } from '@fluentui/react-components';
import { useStatusStyles } from '.';
import { getDenebTheme, THEME_DEFAULT } from '@deneb-viz/app-core';

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
        <FluentProvider
            theme={getDenebTheme(THEME_DEFAULT)}
            className={classes.container}
        >
            <div className={classes.flexContainerVertical}>{children}</div>
        </FluentProvider>
    );
};
