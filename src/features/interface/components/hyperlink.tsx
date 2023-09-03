import { Link, makeStyles, tokens } from '@fluentui/react-components';
import React from 'react';
import { hostServices } from '../../../core/services';

interface IHyperlinkProps {
    href: string;
    children: React.ReactNode;
}

const useLinkStyles = makeStyles({
    root: {
        color: tokens.colorBrandForegroundLinkHover
    }
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
        hostServices.launchUrl(href);
    };
    const classes = useLinkStyles();
    return (
        <Link onClick={handleClick} className={classes.root}>
            {children}
        </Link>
    );
};
