import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import React, { ComponentProps } from 'react';

/**
 * Class name for the container holding far items in the status bar.
 */
const STATUS_BAR_CONTAINER_FAR_ITEMS_CLASS_NAME = 'status-bar-far-items';

/**
 * Class name for the container holding near items in the status bar.
 */
const STATUS_BAR_CONTAINER_NEAR_ITEMS_CLASS_NAME = 'status-bar-near-items';

/**
 * Class name for the container holding center items in the status bar.
 */
const STATUS_BAR_CONTAINER_CENTER_ITEMS_CLASS_NAME = 'status-bar-center-items';

const useStatusBarStyles = makeStyles({
    root: {
        alignItems: 'center',
        backgroundColor: tokens.colorNeutralBackground1,
        borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        boxSizing: 'border-box',
        color: tokens.colorNeutralForeground3,
        columnGap: tokens.spacingHorizontalS,
        display: 'flex',
        height: `${DEBUG_PANE_CONFIGURATION.toolbarMinSize}px`,
        justifyContent: 'space-between',
        padding: `${tokens.spacingVerticalNone} ${tokens.spacingHorizontalS}`,
        userSelect: 'none'
    },
    nearContainer: {
        display: 'flex',
        minWidth: 0,
        overflow: 'hidden'
    },
    nearBalanced: {
        flex: '1 1 0'
    },
    nearCompact: {
        flex: '0 1 auto'
    },
    centerContainer: {
        display: 'flex',
        flex: '0 0 auto',
        justifyContent: 'center'
    },
    farContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginLeft: 'auto',
        minWidth: 0,
        overflow: 'hidden'
    },
    farBalanced: {
        flex: '1 1 0'
    },
    farCompact: {
        flex: '0 0 auto'
    }
});

export type StatusBarProps = ComponentProps<'div'> & {
    nearItems?: React.ReactNode;
    centerItems?: React.ReactNode;
    farItems?: React.ReactNode;
};

export const StatusBarContainer = ({
    nearItems,
    centerItems,
    farItems,
    ...props
}: StatusBarProps) => {
    const classes = useStatusBarStyles();
    const rootClasses = mergeClasses(classes.root, props.className);
    const hasCenter = !!centerItems;
    return (
        <div {...props} className={rootClasses}>
            {nearItems && (
                <div
                    className={mergeClasses(
                        STATUS_BAR_CONTAINER_NEAR_ITEMS_CLASS_NAME,
                        classes.nearContainer,
                        hasCenter
                            ? classes.nearBalanced
                            : classes.nearCompact
                    )}
                >
                    {nearItems}
                </div>
            )}
            {centerItems && (
                <div
                    className={mergeClasses(
                        STATUS_BAR_CONTAINER_CENTER_ITEMS_CLASS_NAME,
                        classes.centerContainer
                    )}
                >
                    {centerItems}
                </div>
            )}
            <div
                className={mergeClasses(
                    STATUS_BAR_CONTAINER_FAR_ITEMS_CLASS_NAME,
                    classes.farContainer,
                    hasCenter
                        ? classes.farBalanced
                        : classes.farCompact
                )}
            >
                {farItems}
            </div>
        </div>
    );
};
