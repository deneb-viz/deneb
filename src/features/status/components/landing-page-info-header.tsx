import {
    Caption1,
    Caption2,
    Divider,
    Title2
} from '@fluentui/react-components';
import React from 'react';

import { useStatusStyles } from '.';
import { StatusStackItem } from './status-stack-item';
import { APPLICATION_INFORMATION_CONFIGURATION } from '@deneb-viz/configuration';

/**
 * Displays the visual metadata as part of the landing status page.
 */
export const LandingPageInfoHeader = () => {
    const classes = useStatusStyles();
    return (
        <>
            <StatusStackItem>
                <div className={classes.headerFlexHorizontal}>
                    <div className={classes.flexItem}>
                        <div className={`visual-header-image logo`} />
                    </div>
                    <div className={classes.flexItem}>
                        <Title2>
                            <span
                                style={{
                                    fontFamily: 'deneb',
                                    fontWeight: 400,
                                    textTransform: 'lowercase',
                                    color: '#7a7170'
                                }}
                            >
                                {
                                    APPLICATION_INFORMATION_CONFIGURATION.displayName
                                }{' '}
                            </span>
                            <Caption2>
                                {APPLICATION_INFORMATION_CONFIGURATION.version}
                            </Caption2>
                        </Title2>
                        <br />
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
