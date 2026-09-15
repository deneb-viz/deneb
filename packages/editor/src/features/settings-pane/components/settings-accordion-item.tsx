import { type ReactNode } from 'react';
import {
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
    makeStyles,
    tokens,
    type AccordionHeaderProps
} from '@fluentui/react-components';

const useStyles = makeStyles({
    item: {
        borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}`
    },
    header: {
        backgroundColor: tokens.colorNeutralBackground1
    },
    panel: {
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        flexDirection: 'column',
        rowGap: tokens.spacingVerticalS,
        marginLeft: tokens.spacingHorizontalNone,
        marginRight: tokens.spacingHorizontalNone,
        padding: tokens.spacingHorizontalM
    }
});

type SettingsAccordionItemProps = {
    value: string;
    heading: string;
    /**
     * Optional rich heading node rendered in place of the plain `heading`
     * string. When supplied, used for the visible AccordionHeader content
     * (e.g. to apply search-match highlights). `heading` remains required
     * as the accessible plain-text fallback.
     */
    highlightedHeading?: ReactNode;
    icon?: AccordionHeaderProps['icon'];
    children: ReactNode;
};

/**
 * A styled AccordionItem wrapper for the settings pane, providing consistent
 * Power BI-style borders and background colors. Exported from `@deneb-viz/app-core`
 * for use by platform consumers injecting custom settings sections.
 */
export const SettingsAccordionItem = ({
    value,
    heading,
    highlightedHeading,
    icon,
    children
}: SettingsAccordionItemProps) => {
    const classes = useStyles();
    return (
        <AccordionItem value={value} className={classes.item}>
            <AccordionHeader className={classes.header} icon={icon}>
                {highlightedHeading ?? heading}
            </AccordionHeader>
            <AccordionPanel className={classes.panel}>
                {children}
            </AccordionPanel>
        </AccordionItem>
    );
};
