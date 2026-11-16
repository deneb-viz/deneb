import {
    Caption1,
    Caption2,
    Divider,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';

import { StatusStackItem } from './status-stack-item';
import { useStatusStyles } from '.';

const useLandingPageHeaderStyles = makeStyles({
    brand: {
        alignItems: 'center'
    },
    nameVersion: {
        alignItems: 'flex-end',
        display: 'flex',
        flexDirection: 'row',
        gap: '4px'
    },
    name: {
        marginBottom: tokens.spacingVerticalXXS
    },
    description: {
        marginTop: tokens.spacingVerticalS
    }
});

type LandingPageHeaderProps = {
    /** The visual's version, shown beside its wordmark. */
    version: string;
    /** One line describing the visual. */
    description: string;
};

/**
 * The visual's logo, wordmark and version, the description running across the
 * page beneath them, then a divider. The logo and wordmark images come from the
 * visual's own stylesheet (the `visual-header-image` and `visual-name-image`
 * classes), so each visual supplies its own.
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
                <div
                    className={mergeClasses(
                        classes.headerFlexHorizontal,
                        headerClasses.brand
                    )}
                >
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
                    </div>
                </div>
                <div className={headerClasses.description}>
                    <Caption1>{description}</Caption1>
                </div>
            </StatusStackItem>
            <StatusStackItem>
                <Divider />
            </StatusStackItem>
        </>
    );
};
