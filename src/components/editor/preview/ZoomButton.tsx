import React from 'react';

import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';
import { StackItem } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { useId } from '@fluentui/react-hooks';

import { i18nValue } from '../../../core/ui/i18n';
import { zoomIconButtonStyles } from '../../../core/ui/icons';

interface IZoomButtonProps {
    i18nKey: string;
    iconName: string;
    onClick: () => void;
    disabled?: boolean;
}

const ZoomButton: React.FC<IZoomButtonProps> = ({
    i18nKey,
    iconName,
    onClick,
    disabled
}) => {
    const tooltipId = useId(`tooltip_${i18nKey}`),
        text = i18nValue(i18nKey),
        iconProps: IIconProps = {
            iconName
        };
    return (
        <>
            <StackItem>
                <TooltipHost id={tooltipId} content={text}>
                    <IconButton
                        iconProps={iconProps}
                        styles={zoomIconButtonStyles}
                        onClick={onClick}
                        disabled={disabled || false}
                        text={text}
                        ariaLabel={text}
                    />
                </TooltipHost>
            </StackItem>
        </>
    );
};

export default ZoomButton;
