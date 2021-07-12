import * as React from 'react';

import { getHostLM } from '../../api/i18n';

import { Progress } from '../status/Progress';

export const ExportValidation = () => {
    const i18n = getHostLM();
    return (
        <Progress
            description={i18n.getDisplayName(`Template_Export_Validation`)}
        />
    );
};

export default ExportValidation;
