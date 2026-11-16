import { type ReactNode } from 'react';
import {
    Caption1,
    Card,
    CardHeader,
    type CardHeaderProps,
    makeStyles,
    mergeClasses,
    Subtitle2,
    tokens
} from '@fluentui/react-components';
import { CheckmarkCircle16Filled } from '@fluentui/react-icons';

import { useDenebState } from '@deneb-viz/app-core';
import { useStatusStyles } from '.';

/**
 * Where a card sits in a step-by-step landing page: the step the author is
 * on, one they have finished, or one still to come.
 */
export type LandingPageStep = 'current' | 'done' | 'upcoming';

const useLandingPageCardStyles = makeStyles({
    // The highlight bleeds into the card list's 5px padding and gaps, so
    // the current card's content stays aligned with the cards around it.
    current: {
        backgroundColor: tokens.colorNeutralBackground5,
        borderRadius: '10px',
        margin: '-5px',
        padding: '5px',
        width: 'auto'
    },
    done: {
        alignItems: 'center',
        color: tokens.colorPaletteGreenForeground1,
        columnGap: tokens.spacingHorizontalXS,
        display: 'inline-flex'
    }
});

type LandingPageCardProps = {
    i18nHeader: string;
    i18nSubtitle?: string;
    /** The card's body text, shown before any other content. */
    i18nBody?: string;
    image: CardHeaderProps['image'];
    /**
     * The card's place in a step-by-step page. Without it the card is a
     * plain card, as on Deneb's landing page.
     */
    step?: LandingPageStep;
    /** Shown at the end of the heading row, unless the step is done. */
    action?: CardHeaderProps['action'];
    children?: ReactNode;
};

/**
 * A landing page card: an icon, a translated heading and optional caption,
 * then its content. With a step, the current step is highlighted and marked
 * as current for assistive technology, and a finished step shows Done in
 * place of any action.
 */
export const LandingPageCard = ({
    i18nHeader,
    i18nSubtitle,
    i18nBody,
    image,
    step,
    action,
    children
}: LandingPageCardProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useStatusStyles();
    const cardClasses = useLandingPageCardStyles();
    const isCurrent = step === 'current';
    return (
        <section
            // Only a current card merges classes: merging changes the class
            // string, and a card without a step keeps the plain section's.
            className={
                isCurrent
                    ? mergeClasses(classes.cardSection, cardClasses.current)
                    : classes.cardSection
            }
            aria-current={isCurrent ? 'step' : undefined}
        >
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
                    action={
                        step === 'done' ? (
                            <span className={cardClasses.done}>
                                <CheckmarkCircle16Filled />
                                <Caption1>
                                    {translate('PowerBI_Landing_Step_Done')}
                                </Caption1>
                            </span>
                        ) : (
                            action
                        )
                    }
                />
                {i18nBody && (
                    <Caption1 className={classes.cardDescription}>
                        {translate(i18nBody)}
                    </Caption1>
                )}
                {children}
            </Card>
        </section>
    );
};
