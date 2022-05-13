import React from 'react';
import { Paragraph } from '../../../components/elements/Typography';

import { i18nValue } from '../../../core/ui/i18n';

export const ErrorPlaceholder: React.FC = () => {
    return (
        <Paragraph>
            {i18nValue('Pivot_Debug_Error_Placeholder', [
                i18nValue('Viewer_Pane_Logging')
            ])}
        </Paragraph>
    );
};
