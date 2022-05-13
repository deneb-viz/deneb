import React from 'react';

import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';
import { StackItem } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { useId } from '@fluentui/react-hooks';

import { i18nValue } from '../../../core/ui/i18n';
import {
    getDebugToggleIcon,
    previewIconButtonStyles
} from '../../../core/ui/icons';
import store from '../../../store';
import { updatePreviewDebugPaneState } from '../../../core/ui/commands';
import { resolveEditorDebugPaneToggleAria } from '../../../core/ui/aria';

export const DebugAreaToggleButton: React.FC = () => {
    const { editorPreviewDebugIsExpanded } = store((state) => state);
    const i18nKey = resolveEditorDebugPaneToggleAria(
        editorPreviewDebugIsExpanded
    );
    const iconName = getDebugToggleIcon(editorPreviewDebugIsExpanded);
    const tooltipId = useId(`tooltip_${i18nKey}`),
        text = i18nValue(i18nKey),
        iconProps: IIconProps = {
            iconName
        };
    const handleClick = () => {
        updatePreviewDebugPaneState();
    };
    return (
        <>
            <StackItem>
                <TooltipHost id={tooltipId} content={text}>
                    <IconButton
                        iconProps={iconProps}
                        styles={previewIconButtonStyles}
                        onClick={handleClick}
                        text={text}
                        ariaLabel={text}
                    />
                </TooltipHost>
            </StackItem>
        </>
    );
};
