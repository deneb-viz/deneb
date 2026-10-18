import React from 'react';
import {
    makeStyles,
    mergeClasses,
    shorthands
} from '@fluentui/react-components';

import { useStatusStyles } from '.';
import { getDenebTheme, THEME_DEFAULT } from '@deneb-viz/app-core';

interface IStatuStackItemProps {
    shouldHighlight?: boolean;
    children: React.ReactNode;
}

const useHighlightStyles = makeStyles({
    item: {
        display: 'block',
        height: 'auto',
        ...shorthands.padding('5px'),
        ...shorthands.borderRadius('10px')
    },
    highlighted: {
        backgroundColor: getDenebTheme(THEME_DEFAULT).colorNeutralBackground5
    },
    normal: {
        backgroundColor: 'none'
    }
});

/**
 * This is a standard Fluent UI `StackItem`, but with some repeatable styles
 * that we need in our status pages.
 *
 * @privateRemarks We are not concerned with logging the rendering of this
 * component, as it is only used in the status pages.
 */
export const StatusStackItem: React.FC<IStatuStackItemProps> = ({
    shouldHighlight,
    children
}) => {
    const classes = useStatusStyles();
    const highlightClasses = useHighlightStyles();
    return (
        <div
            className={mergeClasses(
                classes.flexItem,
                highlightClasses.item,
                shouldHighlight
                    ? highlightClasses.highlighted
                    : highlightClasses.normal
            )}
        >
            {children}
        </div>
    );
};
