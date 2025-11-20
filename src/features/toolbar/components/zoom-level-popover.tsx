import React, { useCallback, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import {
    Label,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    SpinButton,
    SpinButtonProps,
    ToolbarButton,
    Tooltip,
    mergeClasses,
    useId
} from '@fluentui/react-components';

import store from '../../../store';
import { logDebug, logRender } from '../../logging';
import { getZoomToFitScale } from '../../../core/ui/advancedEditor';
import { getI18nValue } from '../../i18n';
import { useToolbarStyles } from '.';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { TooltipCustomMount } from '@deneb-viz/app-core';

// eslint-disable-next-line max-lines-per-function
export const ZoomLevelPopover: React.FC = () => {
    const { editorZoomLevel, zoomFitEnabled, updateEditorZoomLevel } = store(
        (state) => ({
            editorZoomLevel: state.editorZoomLevel,
            zoomFitEnabled: state.commands.zoomFit,
            updateEditorZoomLevel: state.updateEditorZoomLevel
        }),
        shallow
    );
    const id = useId();
    const caption = `${editorZoomLevel}%`;
    const classes = useToolbarStyles();
    const options = useMemo(
        (): React.ReactElement[] =>
            VISUAL_PREVIEW_ZOOM_CONFIGURATION.customLevels.map((l) => (
                <Radio
                    key={`zoom-${l.value}`}
                    label={getI18nValue(
                        `Text_Radio_Group_ZoomLevel_${l.value}`
                    )}
                    value={l.value}
                />
            )) || [],
        []
    );
    const [zoomValue, setZoomValue] = useState('Custom');
    const [customZoomLevel, setCustomZoomLevel] = useState(editorZoomLevel);
    const customDisabled = zoomValue !== 'Custom';
    // Ensure that popover state is always reset whenever it's opened or closed.
    const onOpenChange = () => {
        setZoomValue('Custom');
        setCustomZoomLevel(editorZoomLevel);
    };
    const handleCustomZoomLevelChange = useCallback(
        (value: number) => {
            const level = Math.max(
                Math.min(value, VISUAL_PREVIEW_ZOOM_CONFIGURATION.max),
                VISUAL_PREVIEW_ZOOM_CONFIGURATION.min
            );
            setCustomZoomLevel(level);
            updateEditorZoomLevel(level);
        },
        [editorZoomLevel]
    );
    const updateSpinSettingValue: SpinButtonProps['onChange'] = useCallback(
        (_ev, data) => {
            if (data.value !== undefined) {
                handleCustomZoomLevelChange(data.value);
            } else if (data.displayValue !== undefined) {
                const newValue = parseFloat(data.displayValue);
                if (!Number.isNaN(newValue)) {
                    handleCustomZoomLevelChange(newValue);
                } else {
                    logDebug(
                        `Zoom spin value: cannot parse "${data.displayValue}" as a number.`
                    );
                }
            }
        },
        [setCustomZoomLevel]
    );
    const onChange = (
        ev: React.FormEvent<HTMLDivElement>,
        data: RadioGroupOnChangeData
    ) => {
        setZoomValue(data.value);
        switch (data.value) {
            case 'Fit':
                return handleCustomZoomLevelChange(getZoomToFitScale());
            case 'Custom':
                return handleCustomZoomLevelChange(customZoomLevel);
            default:
                return handleCustomZoomLevelChange(parseInt(data.value));
        }
    };
    logRender('ZoomLevelPopover');
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        <Popover withArrow trapFocus onOpenChange={onOpenChange} inline>
            <>
                <Tooltip
                    relationship='label'
                    content={getI18nValue('Text_Tooltip_Zoom_Level_Popover')}
                    withArrow
                    mountNode={ref}
                >
                    <PopoverTrigger>
                        <ToolbarButton
                            className={mergeClasses(
                                classes.buttonSmall,
                                classes.buttonZoomLevel
                            )}
                            disabled={!zoomFitEnabled}
                        >
                            {caption}
                        </ToolbarButton>
                    </PopoverTrigger>
                </Tooltip>
                <TooltipCustomMount setRef={setRef} />
            </>
            <PopoverSurface className={classes.popoverZoomLevel}>
                <div className={classes.controlBaseZoomLevel}>
                    <Label id={id}>
                        {getI18nValue('Text_Zoom_Level_Custom_Label')}
                    </Label>
                    <RadioGroup
                        aria-labelledby={id}
                        layout='vertical'
                        onChange={onChange}
                        value={zoomValue}
                    >
                        {options}
                    </RadioGroup>
                    <div>
                        <SpinButton
                            disabled={customDisabled}
                            className={classes.spinButtonZoomCustom}
                            appearance='underline'
                            value={customZoomLevel}
                            displayValue={`${customZoomLevel}%`}
                            onChange={updateSpinSettingValue}
                            id={id}
                            min={VISUAL_PREVIEW_ZOOM_CONFIGURATION.min}
                            max={VISUAL_PREVIEW_ZOOM_CONFIGURATION.max}
                        />
                    </div>
                </div>
            </PopoverSurface>
        </Popover>
    );
};
