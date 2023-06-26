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
    mergeClasses,
    useId
} from '@fluentui/react-components';

import { useDebugStyles } from '..';
import store from '../../../store';
import { logDebug, logRender } from '../../logging';
import { getConfig } from '../../../core/utils/config';
import { getZoomToFitScale } from '../../../core/ui/advancedEditor';
import { getI18nValue } from '../../i18n';
import { isZoomControlDisabledReact } from '../../../core/ui/icons';

const CONFIGURATION = getConfig();

// eslint-disable-next-line max-lines-per-function
export const ZoomLevelPopover: React.FC = () => {
    const { editorZoomLevel, updateEditorZoomLevel } = store(
        (state) => ({
            editorZoomLevel: state.editorZoomLevel,
            updateEditorZoomLevel: state.updateEditorZoomLevel
        }),
        shallow
    );
    const id = useId();
    const caption = `${editorZoomLevel}%`;
    const classes = useDebugStyles();
    const options = useMemo(
        (): JSX.Element[] =>
            CONFIGURATION.zoomLevel.customLevels.map((l) => (
                <Radio
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
    const handleCustomZoomLevelChange = useCallback(
        (value: number) => {
            setCustomZoomLevel(value);
            updateEditorZoomLevel(value);
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
    return (
        <Popover withArrow trapFocus>
            <PopoverTrigger>
                <ToolbarButton
                    className={mergeClasses(
                        classes.toolbarButton,
                        classes.zoomLevelButton
                    )}
                    disabled={isZoomControlDisabledReact()}
                >
                    {caption}
                </ToolbarButton>
            </PopoverTrigger>
            <PopoverSurface>
                <div className={classes.zoomLevelControlBase}>
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
                            className={classes.zoomLevelCustomSpinButton}
                            appearance='underline'
                            value={customZoomLevel}
                            displayValue={`${customZoomLevel}%`}
                            onChange={updateSpinSettingValue}
                            id={id}
                            min={CONFIGURATION.zoomLevel.min}
                            max={CONFIGURATION.zoomLevel.max}
                        />
                    </div>
                </div>
            </PopoverSurface>
        </Popover>
    );
};
