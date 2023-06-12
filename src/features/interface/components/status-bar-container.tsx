import React from 'react';

import { useInterfaceStyles } from '..';

interface IStatusBarContainerProps {
    children: React.ReactNode;
}

/**
 * PRovides a consisten container for a status bar in the interface. These are
 * used underneath the editor, and in the debug area.
 */
export const StatusBarContainer: React.FC<IStatusBarContainerProps> = ({
    children
}) => {
    const classes = useInterfaceStyles();
    return <div className={classes.statusBarContainer}>{children}</div>;
};
