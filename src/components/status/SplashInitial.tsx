import * as React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

import { i18nValue } from '../../core/ui/i18n';
import { SubHeadingSecondary } from '../elements/Typography';
import Progress from '../status/Progress';

const SplashInitial = () => {
    return (
        <Scrollbars>
            <SubHeadingSecondary>
                {i18nValue('Initial_Loading_Message')}
            </SubHeadingSecondary>
            <Progress />
        </Scrollbars>
    );
};

export default SplashInitial;
