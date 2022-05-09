import * as React from 'react';
import { i18nValue } from '../../../core/ui/i18n';

import { Progress } from '../../../components/status/Progress';

export const ExportVisualValidation: React.FC = () => {
    return <Progress description={i18nValue(`Template_Export_Validation`)} />;
};
