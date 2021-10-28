import React, { useEffect } from 'react';

import { ISliderStyles, Slider } from '@fluentui/react/lib/Slider';
import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import {
    isZoomControlDisabled,
    isZoomInIconDisabled,
    isZoomOutIconDisabled,
    isZoomResetIconDisabled
} from '../../../core/ui/icons';
import ZoomButton from './ZoomButton';
import { i18nValue } from '../../../core/ui/i18n';
import {
    getZoomInLevel,
    getZoomOutLevel,
    useZoomLevel,
    zoomConfig
} from '../../../context/zoomLevel';
import { getZoomToFitScale } from '../../../core/ui/advancedEditor';
import {
    getCommandKeyBinding,
    hotkeyOptions,
    IKeyboardShortcut
} from '../../../core/ui/commands';
import { useHotkeys } from 'react-hotkeys-hook';

const sliderStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            overflow: 'hidden'
        }
    },
    sliderStyles: Partial<ISliderStyles> = {
        root: {
            width: 100
        }
    },
    valueStackItemStyles: IStackItemStyles = {
        root: {
            padding: 4,
            cursor: 'default',
            userSelect: 'none'
        }
    };

const ZoomControls: React.FC = () => {
    const { level, setLevel, hotkeysBound, setHotkeysBound } = useZoomLevel()!,
        valueFormat = (value: number) => `${value}%`,
        zoomReset = () => setLevel(zoomConfig.default),
        zoomToLevel = (value: number) => setLevel(value),
        zoomIn = () => setLevel((level) => getZoomInLevel(level)),
        zoomOut = () => setLevel((level) => getZoomOutLevel(level)),
        zoomFit = () => setLevel(getZoomToFitScale()),
        getZoomHotKeys = (): IKeyboardShortcut[] => [
            {
                keys: getCommandKeyBinding('zoomIn'),
                command: zoomIn,
                options: hotkeyOptions
            },
            {
                keys: getCommandKeyBinding('zoomOut'),
                command: zoomOut,
                options: hotkeyOptions
            },
            {
                keys: getCommandKeyBinding('zoomReset'),
                command: zoomReset,
                options: hotkeyOptions
            },
            {
                keys: getCommandKeyBinding('zoomFit'),
                command: zoomFit,
                options: hotkeyOptions
            }
        ];
    !hotkeysBound &&
        getZoomHotKeys()?.forEach((hk) =>
            useHotkeys(hk.keys, hk.command, hk.options)
        );
    useEffect(() => {
        return () => {
            hotkeysBound && setHotkeysBound(true);
        };
    }, []);
    return (
        <>
            <ZoomButton
                i18nKey='Button_ZoomOut'
                iconName='CalculatorSubtract'
                onClick={zoomOut}
                disabled={isZoomOutIconDisabled(level)}
            />
            <StackItem styles={sliderStackItemStyles}>
                <Slider
                    styles={sliderStyles}
                    min={zoomConfig.min}
                    max={zoomConfig.max}
                    step={zoomConfig.step}
                    value={level}
                    defaultValue={zoomConfig.default}
                    showValue={false}
                    onChange={zoomToLevel}
                    disabled={isZoomControlDisabled()}
                />
            </StackItem>
            <ZoomButton
                i18nKey='Button_ZoomIn'
                iconName='CalculatorAddition'
                onClick={zoomIn}
                disabled={isZoomInIconDisabled(level)}
            />
            <ZoomButton
                i18nKey='Button_ZoomReset'
                iconName='Refresh'
                onClick={zoomReset}
                disabled={isZoomResetIconDisabled(level)}
            />
            <ZoomButton
                i18nKey='Button_ZoomFit'
                iconName='ZoomToFit'
                onClick={zoomFit}
                disabled={isZoomControlDisabled()}
            />
            <StackItem styles={valueStackItemStyles}>
                <TooltipHost content={i18nValue('Zoom_Level_Tooltip')}>
                    <Text>{valueFormat(level)}</Text>
                </TooltipHost>
            </StackItem>
        </>
    );
};

export default ZoomControls;
