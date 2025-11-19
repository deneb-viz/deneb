import { launchUrl } from '@deneb-viz/powerbi-compat/visual-host';
import { Link, makeStyles } from '@fluentui/react-components';
import React from 'react';

interface IHyperlinkProps {
    href: string;
    children: React.ReactNode;
}

const useLinkStyles = makeStyles({
    root: {}
});

/**
 * Provides a suitable hyperlink component that uses the Fluent UI Link
 * component as a base, but will ensure that the visual host will .
 */
export const Hyperlink: React.FC<IHyperlinkProps> = ({ href, children }) => {
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
