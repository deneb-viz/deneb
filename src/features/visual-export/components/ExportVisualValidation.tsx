import * as React from 'react';

import { Progress } from '../../status';
import { getI18nValue } from '../../i18n';

export const ExportVisualValidation: React.FC = () => {
    return (
        <Progress description={getI18nValue(`Template_Export_Validation`)} />
    );
};
