import { type ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

import { LandingPageHeader } from './landing-page-header';
import { StatusContainer } from './status-container';
import { useStatusStyles } from '.';

const useLandingPageLayoutStyles = makeStyles({
    inset: {
        padding: tokens.spacingHorizontalS
    }
});

type LandingPageLayoutProps = {
    version: string;
    description: string;
    wordmarkSuffix?: string;
    /**
     * Keeps the page clear of the visual's edges, so a highlighted step has
     * room around it.
     */
    inset?: boolean;
    /** The page's cards, in order. */
    children: ReactNode;
};

/**
 * A landing page: the visual's header, then its cards. Each visual supplies
 * its own branding and cards.
 */
export const LandingPageLayout = ({
    version,
    description,
    wordmarkSuffix,
    inset,
    children
}: LandingPageLayoutProps) => {
    const classes = useStatusStyles();
    const layoutClasses = useLandingPageLayoutStyles();
    return (
        <StatusContainer className={inset ? layoutClasses.inset : undefined}>
            <LandingPageHeader
                version={version}
                description={description}
                wordmarkSuffix={wordmarkSuffix}
            />
            <div className={classes.cardContainer}>{children}</div>
        </StatusContainer>
    );
};
