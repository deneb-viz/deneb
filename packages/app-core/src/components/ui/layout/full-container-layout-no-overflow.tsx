import {
    makeResetStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';

import React, { ComponentProps } from 'react';

export const useFullContainerStyles = makeResetStyles({
    boxSizing: 'border-box',
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
    width: '100%',
    margin: tokens.spacingVerticalNone
});

export type FullContainerLayoutNoOverflowProps = ComponentProps<'div'> & {};

export const FullContainerLayoutNoOverflow = ({
    children,
    ...props
}: FullContainerLayoutNoOverflowProps) => {
    const classes = useFullContainerStyles();
    const mergedClasses = mergeClasses(classes, props.className);
    return (
        <div {...props} className={mergedClasses}>
            {children}
        </div>
    );
};
