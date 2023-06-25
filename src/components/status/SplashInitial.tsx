import * as React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

import { SubHeadingSecondary } from '../elements/Typography';
import Progress from '../status/Progress';
import { getI18nValue } from '../../features/i18n';

const SplashInitial = () => {
    return (
        <Scrollbars>
            <SubHeadingSecondary>
                {getI18nValue('Initial_Loading_Message')}
            </SubHeadingSecondary>
            <Progress />
        </Scrollbars>
    );
};

export default SplashInitial;
