import React from 'react';
import {
    Edit24Regular,
    TableAdd24Regular,
    Braces24Regular,
    DataHistogram24Regular,
    QuestionCircle24Regular
} from '@fluentui/react-icons';
import {
    Caption1,
    Card,
    CardHeader,
    CardHeaderProps,
    Subtitle2
} from '@fluentui/react-components';
import { useStatusStyles } from '.';
import { getI18nValue } from '../../i18n';

type TLandingPageIcon = 'Edit' | 'Data' | 'Code' | 'View' | 'Learn';

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
    const classes = useStatusStyles();
    return (
        <section className={classes.cardSection}>
            <Card className={classes.card} appearance='subtle'>
                <CardHeader
                    image={image}
                    header={
                        <Subtitle2 className={classes.cardTitle}>
                            {getI18nValue(i18nHeader)}
                        </Subtitle2>
                    }
                    description={
                        (i18nSubtitle && (
                            <Caption1 className={classes.cardCaption}>
                                {getI18nValue(i18nSubtitle)}
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

const resolveIcon = (iconName: TLandingPageIcon) => {
    switch (iconName) {
        case 'Edit':
            return <Edit24Regular />;
        case 'Data':
            return <TableAdd24Regular />;
        case 'Code':
            return <Braces24Regular />;
        case 'View':
            return <DataHistogram24Regular />;
        case 'Learn':
            return <QuestionCircle24Regular />;
    }
};
