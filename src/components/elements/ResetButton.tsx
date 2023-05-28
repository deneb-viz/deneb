import React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { i18nValue } from '../../core/ui/i18n';
import {
    previewPaneButtonStyles,
    settingsButtonStyles
} from '../../core/ui/fluent';
import { resetProviderPropertyValue } from '../../core/ui/commands';

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
        <TooltipHost content={i18nValue(i18nKey)}>
            <IconButton
                iconProps={{ iconName: 'Reset' }}
                styles={styles}
                onClick={handleReset}
            />
        </TooltipHost>
    );
};

export default ResetButton;
