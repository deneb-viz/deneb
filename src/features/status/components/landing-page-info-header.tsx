import {
    Caption1,
    Caption2,
    Divider,
    Title3
} from '@fluentui/react-components';
import React from 'react';

import { getVisualMetadata } from '../../../core/utils/config';
import { useStatusStyles } from '.';
import { StatusStackItem } from './status-stack-item';

const VISUAL_METADATA = getVisualMetadata();

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
                        <Title3>
                            {VISUAL_METADATA.displayName}{' '}
                            <Caption2>{VISUAL_METADATA.version}</Caption2>
                        </Title3>
                        <br />
                        <Caption1>{VISUAL_METADATA.description}</Caption1>
                    </div>
                    <div className={classes.flexItem}>
                        <div className={`visual-header-image logo`} />
                    </div>
                </div>
            </StatusStackItem>
            <StatusStackItem>
                <Divider />
            </StatusStackItem>
        </>
    );
};
