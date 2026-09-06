import React from 'react';
import {
    Caption1,
    Card,
    CardHeader,
    CardHeaderProps,
    Subtitle2
} from '@fluentui/react-components';
import { useStatusStyles } from '.';
import { useDenebState } from '@deneb-viz/app-core';

interface ILandingPageCardProps {
    i18nHeader: string;
    i18nSubtitle?: string;
    image: CardHeaderProps['image'];
    children: React.ReactNode;
}

export const LandingPageCard: React.FC<ILandingPageCardProps> = ({
    i18nHeader,
    i18nSubtitle,
    image,
    children
}) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useStatusStyles();
    return (
        <section className={classes.cardSection}>
            <Card className={classes.card} appearance='subtle'>
                <CardHeader
                    image={image}
                    header={
                        <Subtitle2 className={classes.cardTitle}>
                            {translate(i18nHeader)}
                        </Subtitle2>
                    }
                    description={
                        (i18nSubtitle && (
                            <Caption1 className={classes.cardCaption}>
                                {translate(i18nSubtitle)}
                            </Caption1>
                        )) ||
                        null
                    }
                />
                {children}
            </Card>
        </section>
    );
};
