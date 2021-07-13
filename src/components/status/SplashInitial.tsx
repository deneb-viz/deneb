import * as React from 'react';
import { i18nValue } from '../../core/ui/i18n';

import { SubHeadingSecondary } from '../elements/Text';
import Progress from '../status/Progress';

const SplashInitial = () => {
    return (
        <>
            <SubHeadingSecondary>
                {i18nValue('Initial_Loading_Message')}
            </SubHeadingSecondary>
            <Progress />
        </>
    );
};

export default SplashInitial;
