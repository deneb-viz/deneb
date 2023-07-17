import React from 'react';
import {
    makeStyles,
    mergeClasses,
    shorthands
} from '@fluentui/react-components';

import { Themes } from '../../interface';
import { useStatusStyles } from '.';

interface IStatuStackItemProps {
    shouldHighlight?: boolean;
    children: React.ReactNode;
}

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
    const highlight = makeStyles({
        item: {
            display: 'block',
            height: 'auto',
            ...shorthands.padding('5px'),
            ...shorthands.borderRadius('10px'),
            backgroundColor: shouldHighlight
                ? Themes.light.colorNeutralBackground5
                : 'none'
        }
    })();
    return (
        <div className={mergeClasses(classes.flexItem, highlight.item)}>
            {children}
        </div>
    );
};
