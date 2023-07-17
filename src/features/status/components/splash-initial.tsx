import * as React from 'react';

import { Progress } from './progress';
import { StatusContainer } from './status-container';
import { getI18nValue } from '../../i18n';

export const SplashInitial: React.FC = () => {
    return (
        <StatusContainer>
            <Progress description={getI18nValue('Initial_Loading_Message')} />
        </StatusContainer>
    );
};
