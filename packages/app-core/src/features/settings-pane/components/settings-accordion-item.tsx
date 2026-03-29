import { type ReactNode } from 'react';
import {
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
    InfoLabel,
    makeStyles,
    tokens,
    type AccordionHeaderProps
} from '@fluentui/react-components';
import { useSettingsPaneTooltip } from './settings-pane-tooltip-context';

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
    icon?: AccordionHeaderProps['icon'];
    /** Optional info text displayed as a popover via InfoLabel in the header. */
    info?: string;
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
    icon,
    info,
    children
}: SettingsAccordionItemProps) => {
    const classes = useStyles();
    const tooltipMountNode = useSettingsPaneTooltip();
    return (
        <AccordionItem value={value} className={classes.item}>
            <AccordionHeader className={classes.header} icon={icon}>
                {info ? (
                    <InfoLabel
                        info={info}
                        infoButton={{
                            inline: false,
                            popover: { mountNode: tooltipMountNode },
                            onClick: (e) => e.stopPropagation()
                        }}
                    >
                        {heading}
                    </InfoLabel>
                ) : (
                    heading
                )}
            </AccordionHeader>
            <AccordionPanel className={classes.panel}>
                {children}
            </AccordionPanel>
        </AccordionItem>
    );
};
