import React from 'react';
import { Link, makeStyles } from '@fluentui/react-components';
import { useDenebPlatformProvider } from '../deneb-platform';

type HyperlinkProps = {
    href: string;
    children: React.ReactNode;
};

const useLinkStyles = makeStyles({
    root: {}
});

/**
 * Provides a suitable hyperlink component that uses the Fluent UI Link
 * component as a base, but will ensure that the visual host will .
 */
export const Hyperlink = ({ href, children }: HyperlinkProps) => {
    const { launchUrl } = useDenebPlatformProvider();
    const handleClick = (
        event: React.MouseEvent<
            HTMLAnchorElement | HTMLElement | HTMLButtonElement,
            MouseEvent
        >
    ) => {
        event.preventDefault();
        event.stopPropagation();
        launchUrl(href);
    };
    const classes = useLinkStyles();
    return (
        <Link onClick={handleClick} className={classes.root}>
            {children}
        </Link>
    );
};
