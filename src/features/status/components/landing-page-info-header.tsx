import {
    Caption1,
    Caption2,
    Divider,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import { useStatusStyles } from '.';
import { StatusStackItem } from './status-stack-item';
import { APPLICATION_INFORMATION_CONFIGURATION } from '@deneb-viz/configuration';

const useInfoHeaderStyles = makeStyles({
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

/**
 * Displays the visual metadata as part of the landing status page.
 */
export const LandingPageInfoHeader = () => {
    const classes = useStatusStyles();
    const nameClasses = useInfoHeaderStyles();
    return (
        <>
            <StatusStackItem>
                <div className={classes.headerFlexHorizontal}>
                    <div className={classes.flexItem}>
                        <div className={`visual-header-image logo`} />
                    </div>
                    <div className={classes.flexItem}>
                        <div className={nameClasses.nameVersion}>
                            <div
                                className={`${nameClasses.name} visual-name-image image`}
                            />
                            <div>
                                <Caption2>
                                    {
                                        APPLICATION_INFORMATION_CONFIGURATION.version
                                    }
                                </Caption2>
                            </div>
                        </div>
                        <Caption1>
                            {APPLICATION_INFORMATION_CONFIGURATION.description}
                        </Caption1>
                    </div>
                </div>
            </StatusStackItem>
            <StatusStackItem>
                <Divider />
            </StatusStackItem>
        </>
    );
};
