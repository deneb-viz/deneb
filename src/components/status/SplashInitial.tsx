import * as React from 'react';

import { getHostLM } from '../../api/i18n';

import { SubHeadingSecondary } from '../elements/Text';
import Progress from '../status/Progress';

const SplashInitial = () => {
    const i18n = getHostLM();
    return (
        <>
            <SubHeadingSecondary>
                {i18n.getDisplayName('Initial_Loading_Message')}
            </SubHeadingSecondary>
            <Progress />
        </>
    );
};

export default SplashInitial;
