import {
    type FormEvent,
    type ReactElement,
    useCallback,
    useMemo,
    useState
} from 'react';

import {
    Label,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    Radio,
    RadioGroup,
    type RadioGroupOnChangeData,
    SpinButton,
    type SpinButtonChangeEvent,
    type SpinButtonOnChangeData,
    ToolbarButton,
    Tooltip,
    makeStyles,
    mergeClasses,
    tokens,
    useId
} from '@fluentui/react-components';

import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import {
    POPOVER_Z_INDEX,
    PREVIEW_PANE_TOOLBAR_BUTTON_PADDING
} from '../../../../lib';
import { useDenebState } from '../../../../state';
import { TooltipCustomMount } from '../../../../components/ui';
import { getZoomToFitScale } from '../../../../lib/interface/layout';

const useToolbarStyles = makeStyles({
    buttonSmall: {
        padding: `${PREVIEW_PANE_TOOLBAR_BUTTON_PADDING}px`
    },
    buttonZoomLevel: { minWidth: '50px' },
    controlBaseZoomLevel: {
        display: 'flex',
        flexBasis: '100%',
        flexDirection: 'column',
        '> label': {
            marginBottom: tokens.spacingVerticalXXS
        }
    },
    popoverZoomLevel: {
        zIndex: POPOVER_Z_INDEX
    },
    spinButtonZoomCustom: {
        marginLeft: '40px',
        width: '80px'
    }
});

// eslint-disable-next-line max-lines-per-function
export const ZoomLevelPopover = () => {
    const {
        editorZoomLevel,
        zoomFitEnabled,
        translate,
        updateEditorZoomLevel
    } = useDenebState((state) => ({
        editorZoomLevel: state.editorZoomLevel,
        zoomFitEnabled: state.commands.zoomFit,
        translate: state.i18n.translate,
        updateEditorZoomLevel: state.updateEditorZoomLevel
    }));
    const id = useId();
    const caption = `${editorZoomLevel}%`;
    const classes = useToolbarStyles();
    const options = useMemo(
        (): ReactElement[] =>
            VISUAL_PREVIEW_ZOOM_CONFIGURATION.customLevels.map((l) => (
                <Radio
                    key={`zoom-${l.value}`}
                    label={translate(`Text_Radio_Group_ZoomLevel_${l.value}`)}
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
    const updateSpinSettingValue = useCallback(
        (ev: SpinButtonChangeEvent, data: SpinButtonOnChangeData) => {
            if (data.value !== undefined) {
                handleCustomZoomLevelChange(data.value as number);
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
        ev: FormEvent<HTMLDivElement>,
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
                    content={translate('Tooltip_Zoom_Level_Popover')}
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
                        {translate('Text_Zoom_Level_Custom_Label')}
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
