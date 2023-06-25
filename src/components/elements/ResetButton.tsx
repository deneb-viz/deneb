import React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import {
    previewPaneButtonStyles,
    settingsButtonStyles
} from '../../core/ui/fluent';
import { resetProviderPropertyValue } from '../../core/ui/commands';
import { getI18nValue } from '../../features/i18n';

type TButtonLocation = 'editor' | 'debugger';

interface IResetButtonProps {
    resetPropertyKey: string;
    i18nKey: string;
    location?: TButtonLocation;
}

const ResetButton: React.FC<IResetButtonProps> = ({
    resetPropertyKey,
    i18nKey,
    location = 'editor'
}) => {
    const handleReset = React.useCallback(
        (): void => resetProviderPropertyValue(resetPropertyKey),
        []
    );
    const styles =
        (location === 'editor' && settingsButtonStyles) ||
        previewPaneButtonStyles;
    return (
        <TooltipHost content={getI18nValue(i18nKey)}>
            <IconButton
                iconProps={{ iconName: 'Reset' }}
                styles={styles}
                onClick={handleReset}
            />
        </TooltipHost>
    );
};

export default ResetButton;
