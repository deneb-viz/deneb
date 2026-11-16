import { Caption1 } from '@fluentui/react-components';

import { Hyperlink } from '@deneb-viz/app-core';
import { useStatusStyles } from '.';

/** A landing page link: where it goes, and its already-translated text. */
export type LandingPageLink = {
    href: string;
    text: string;
};

type LandingPageLinksProps = {
    links: LandingPageLink[];
};

/**
 * A bulleted list of links for a landing page card. Links open through the
 * host, so they work inside Power BI.
 */
export const LandingPageLinks = ({ links }: LandingPageLinksProps) => {
    const classes = useStatusStyles();
    return (
        <div>
            <ul className={classes.landingUl}>
                {links.map(({ href, text }) => (
                    <li key={href} className={classes.landingLi}>
                        <Hyperlink href={href}>
                            <Caption1>{text}</Caption1>
                        </Hyperlink>
                    </li>
                ))}
            </ul>
        </div>
    );
};
