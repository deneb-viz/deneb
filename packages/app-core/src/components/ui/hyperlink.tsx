import React from 'react';
import { Link, makeStyles } from '@fluentui/react-components';
import { useDenebPlatformProvider } from '../deneb-platform';

type HyperlinkProps = {
    href: string;
    children: React.ReactNode;
    /**
     * When true, renders the link inline so it inherits the surrounding
     * text's font size. Useful inside InfoLabel popovers and captions.
     */
    inline?: boolean;
};

const useStyles = makeStyles({
    inline: {
        fontSize: 'inherit',
        lineHeight: 'inherit'
    }
});

/**
 * Provides a suitable hyperlink component that uses the Fluent UI Link
 * component as a base, and delegates URL launching to the platform host.
 */
export const Hyperlink = ({ href, children, inline }: HyperlinkProps) => {
    const { launchUrl } = useDenebPlatformProvider();
    const classes = useStyles();
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
    return (
        <Link
            onClick={handleClick}
            inline={inline}
            className={inline ? classes.inline : undefined}
        >
            {children}
        </Link>
    );
};
