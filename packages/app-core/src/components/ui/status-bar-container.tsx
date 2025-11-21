import { type ReactNode } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

import { PREVIEW_PANE_TOOLBAR_MIN_SIZE } from '../../lib';

type StatusBarContainerProps = {
    children: ReactNode;
};

const useStatusBarContainerStyles = makeStyles({
    root: {
        boxSizing: 'border-box',
        flexShrink: 0,
        width: '100%',
        height: `${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px}`,
        borderTopColor: tokens.colorNeutralStroke2,
        borderTopStyle: 'solid',
        borderTopWidth: '1px',
        ...shorthands.overflow('hidden')
    }
});

/**
 * Provides a consistent container for a status bar in the interface. These are used underneath the editor, and in the
 * debug area.
 */
export const StatusBarContainer = ({ children }: StatusBarContainerProps) => {
    const classes = useStatusBarContainerStyles();
    return <div className={classes.root}>{children}</div>;
};
