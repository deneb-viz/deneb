import * as React from 'react';
import { i18nValue } from '../../core/ui/i18n';

import { Progress } from '../status/Progress';

export const ExportValidation = () => {
    return <Progress description={i18nValue(`Template_Export_Validation`)} />;
};

export default ExportValidation;
