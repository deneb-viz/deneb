import {
    Caption1,
    Caption2,
    Divider,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import { StatusStackItem } from './status-stack-item';
import { useStatusStyles } from '.';

const useLandingPageHeaderStyles = makeStyles({
    nameVersion: {
        alignItems: 'flex-end',
        display: 'flex',
        flexDirection: 'row',
        gap: '4px'
    },
    name: {
        marginBottom: tokens.spacingVerticalXXS
    }
});

type LandingPageHeaderProps = {
    /** The visual's version, shown beside its wordmark. */
    version: string;
    /** One line describing the visual. */
    description: string;
};

/**
 * The visual's logo, wordmark, version and description, then a divider.
 * The logo and wordmark images come from the visual's own stylesheet (the
 * `visual-header-image` and `visual-name-image` classes), so each visual
 * supplies its own.
 */
export const LandingPageHeader = ({
    version,
    description
}: LandingPageHeaderProps) => {
    const classes = useStatusStyles();
    const headerClasses = useLandingPageHeaderStyles();
    return (
        <>
            <StatusStackItem>
                <div className={classes.headerFlexHorizontal}>
                    <div className={classes.flexItem}>
                        <div className={`visual-header-image logo`} />
                    </div>
                    <div className={classes.flexItem}>
                        <div className={headerClasses.nameVersion}>
                            <div
                                className={`${headerClasses.name} visual-name-image image`}
                            />
                            <div>
                                <Caption2>{version}</Caption2>
                            </div>
                        </div>
                        <Caption1>{description}</Caption1>
                    </div>
                </div>
            </StatusStackItem>
            <StatusStackItem>
                <Divider />
            </StatusStackItem>
        </>
    );
};
