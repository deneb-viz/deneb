import React from 'react';
import { FluentProvider, mergeClasses } from '@fluentui/react-components';
import { useStatusStyles } from '.';
import { getDenebTheme, THEME_DEFAULT } from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';

type StatusContainerProps = {
    /** Extra classes for the page's content, e.g. to inset it. */
    className?: string;
    children: React.ReactNode;
};

/**
 * Provides the standard (outer) layout for a status page.
 */
export const StatusContainer: React.FC<StatusContainerProps> = ({
    className,
    children
}) => {
    const classes = useStatusStyles();
    logRender('StatusContainer');
    return (
        <FluentProvider
            theme={getDenebTheme(THEME_DEFAULT)}
            className={classes.container}
        >
            <div
                // Only extra classes are merged: merging changes the class
                // string, and a plain container keeps its own.
                className={
                    className
                        ? mergeClasses(classes.flexContainerVertical, className)
                        : classes.flexContainerVertical
                }
            >
                {children}
            </div>
        </FluentProvider>
    );
};
