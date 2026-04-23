import { useCallback, useMemo } from 'react';
import {
    Button,
    InfoLabel,
    Label,
    MessageBar,
    MessageBarBody,
    SpinButton,
    SpinButtonOnChangeData,
    SpinButtonProps,
    Switch,
    Tooltip,
    useId
} from '@fluentui/react-components';
import { ArrowResetRegular } from '@fluentui/react-icons';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';

import { Hyperlink } from '../../../components/ui';
import { useSettingsPaneTooltip } from './settings-pane-tooltip-context';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';
import { logDebug } from '@deneb-viz/utils/logging';
import { INCREMENTAL_UPDATE_CONFIGURATION } from '../../../lib/vega/incremental-update-configuration';
import { AssistivePreview } from './assistive-preview';
import { HighlightText } from './highlight-text';
import { performanceSchema } from '../search/performance-schema';
import type { RowMatch, SectionMatchView } from '../search/types';

type PerformanceSettingsProps = {
    sectionMatchView?: SectionMatchView | null;
};

const getRowMatch = (
    view: SectionMatchView | null | undefined,
    rowId: string
): RowMatch | undefined | null => {
    if (!view) return undefined;
    const match = view.rows.get(rowId);
    if (!match) return null;
    return match.visible ? match : null;
};

/**
 * Performance settings panel for compilation and rendering optimizations.
 */
export const PerformanceSettings = ({
    sectionMatchView
}: PerformanceSettingsProps) => {
    const classes = useSettingsPaneStyles();
    const tooltipMountNode = useSettingsPaneTooltip();

    const {
        enableIncrementalDataUpdates,
        incrementalUpdateThreshold,
        datasetRowCount,
        setEnableIncrementalDataUpdates,
        setIncrementalUpdateThreshold,
        translate
    } = useDenebState((state) => ({
        enableIncrementalDataUpdates:
            state.compilation.enableIncrementalDataUpdates,
        incrementalUpdateThreshold:
            state.compilation.incrementalUpdateThreshold,
        datasetRowCount: state.dataset.values.length,
        setEnableIncrementalDataUpdates:
            state.compilation.setEnableIncrementalDataUpdates,
        setIncrementalUpdateThreshold:
            state.compilation.setIncrementalUpdateThreshold,
        translate: state.i18n.translate
    }));

    // Determine effective threshold (capped at max)
    const effectiveThreshold = Math.min(
        incrementalUpdateThreshold,
        INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold
    );

    // Determine if incremental updates are active for current dataset
    const isIncrementalActive =
        enableIncrementalDataUpdates && datasetRowCount <= effectiveThreshold;

    // SpinButton change handler with validation
    const onThresholdChange: SpinButtonProps['onChange'] = useCallback(
        (_event: unknown, data: SpinButtonOnChangeData): void => {
            const resolvedValue = getResolvedValue(data);
            setIncrementalUpdateThreshold(
                Math.min(
                    Math.max(
                        resolvedValue,
                        INCREMENTAL_UPDATE_CONFIGURATION.minThreshold
                    ),
                    INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold
                )
            );
        },
        [setIncrementalUpdateThreshold]
    );

    // Reset handler
    const onReset = useCallback(() => {
        setIncrementalUpdateThreshold(
            INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold
        );
    }, [setIncrementalUpdateThreshold]);

    // Check if reset should be disabled (already at default)
    const isResetDisabled = useMemo(
        () =>
            incrementalUpdateThreshold ===
            INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold,
        [incrementalUpdateThreshold]
    );

    const spinButtonId = useId();

    const incrementalRow = getRowMatch(sectionMatchView, 'incremental-updates');
    const thresholdRow = getRowMatch(sectionMatchView, 'incremental-threshold');

    const incrementalLabelText = translate(
        'Text_Vega_Performance_IncrementalUpdates'
    );
    const incrementalAssistiveText = translate('Assistive_Text_Performance');
    const incrementalLabelRanges = incrementalRow?.highlights.label;
    const incrementalAssistiveRanges = incrementalRow?.highlights.assistive;
    const showIncrementalAssistivePreview =
        (!incrementalLabelRanges || incrementalLabelRanges.length === 0) &&
        incrementalAssistiveRanges &&
        incrementalAssistiveRanges.length > 0;

    const thresholdLabelText = translate('Text_Vega_Performance_Threshold');
    const thresholdLabelRanges = thresholdRow?.highlights.label;

    const showIncrementalRow = incrementalRow !== null;
    const showThresholdRow =
        enableIncrementalDataUpdates && thresholdRow !== null;
    // Only show the active/inactive message bar when the toggle row itself
    // is visible — otherwise the bar would float with no context.
    const showMessageBar = enableIncrementalDataUpdates && showIncrementalRow;

    return (
        <>
            {showIncrementalRow ? (
                <div data-settings-row-id='incremental-updates'>
                    <Switch
                        label={
                            <>
                                <InfoLabel
                                    info={
                                        <>
                                            {incrementalAssistiveText}{' '}
                                            <Hyperlink
                                                href={
                                                    PROVIDER_RESOURCE_CONFIGURATION
                                                        .deneb
                                                        .datasetDocumentationUrl
                                                }
                                                inline
                                            >
                                                {translate(
                                                    'Text_Link_Learn_More'
                                                )}
                                            </Hyperlink>
                                        </>
                                    }
                                    infoButton={{
                                        inline: false,
                                        popover: { mountNode: tooltipMountNode }
                                    }}
                                >
                                    <HighlightText
                                        text={incrementalLabelText}
                                        ranges={incrementalLabelRanges}
                                    />
                                </InfoLabel>
                                {showIncrementalAssistivePreview ? (
                                    <AssistivePreview
                                        text={incrementalAssistiveText}
                                        ranges={incrementalAssistiveRanges}
                                    />
                                ) : null}
                            </>
                        }
                        checked={enableIncrementalDataUpdates}
                        onChange={(_, data) =>
                            setEnableIncrementalDataUpdates(data.checked)
                        }
                    />
                </div>
            ) : null}
            {showThresholdRow ? (
                <div
                    data-settings-row-id='incremental-threshold'
                    className={classes.spinButtonContainer}
                >
                    <Label htmlFor={spinButtonId}>
                        <HighlightText
                            text={thresholdLabelText}
                            ranges={thresholdLabelRanges}
                        />
                    </Label>
                    <div>
                        <SpinButton
                            className={classes.spinButtonControl}
                            appearance='underline'
                            value={incrementalUpdateThreshold}
                            id={spinButtonId}
                            min={INCREMENTAL_UPDATE_CONFIGURATION.minThreshold}
                            max={INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold}
                            step={INCREMENTAL_UPDATE_CONFIGURATION.stepValue}
                            onChange={onThresholdChange}
                        />
                        <Tooltip
                            content={translate('Tooltip_Setting_Reset')}
                            relationship='label'
                            withArrow
                            mountNode={tooltipMountNode}
                        >
                            <Button
                                icon={<ArrowResetRegular />}
                                appearance='subtle'
                                onClick={onReset}
                                disabled={isResetDisabled}
                            />
                        </Tooltip>
                    </div>
                </div>
            ) : null}
            {showMessageBar ? (
                <MessageBar
                    shape='rounded'
                    intent={isIncrementalActive ? 'success' : 'warning'}
                >
                    <MessageBarBody>
                        {translate(
                            isIncrementalActive
                                ? 'Assistive_Text_Performance_IncrementalActive'
                                : 'Assistive_Text_Performance_IncrementalInactive'
                        )}
                    </MessageBarBody>
                </MessageBar>
            ) : null}
        </>
    );
};

/**
 * Resolve the value from SpinButton change data, handling both numeric values and display string parsing.
 */
const getResolvedValue = (data: SpinButtonOnChangeData): number => {
    if (data.value !== undefined && data.value !== null) {
        return data.value;
    } else if (data.displayValue !== undefined) {
        const newValue = parseFloat(data.displayValue);
        if (!Number.isNaN(newValue)) {
            return newValue;
        } else {
            logDebug(`Cannot parse "${data.displayValue}" as a number.`);
            return INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold;
        }
    }
    return INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold;
};

/**
 * Re-exported so callers outside this module (notably `settings-pane.tsx`
 * in Unit 3) can resolve every row's i18n keys in a single pass.
 */
export { performanceSchema };
