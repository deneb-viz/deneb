import { type FormEvent, type ReactNode, useCallback } from 'react';
import {
    Field,
    InfoLabel,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Switch
} from '@fluentui/react-components';

import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { useSettingsPaneTooltip } from './settings-pane-tooltip-context';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';
import { AssistivePreview } from './assistive-preview';
import { HighlightText } from './highlight-text';
import { generalSchema } from '../search/general-schema';
import type { RowMatch, SectionMatchView } from '../search/types';

type RadioOption = {
    value: string;
    labelKey: string;
};

type SettingsRadioGroupProps = {
    infoKey: string;
    labelKey: string;
    value: string;
    onValueChange: (value: string) => void;
    options: RadioOption[];
    rowMatch?: RowMatch;
};

/**
 * Row components receive `sectionMatchView` (already filtered to this
 * section) plus the row's own schema id. They look up their own
 * `RowMatch` so the section-level prop drilling stays simple.
 */
type RowComponentProps = {
    sectionMatchView?: SectionMatchView | null;
};

/**
 * Look up the row match for a given row id. Returns `undefined` when
 * the view is absent (no active filter) and `null` when the row is
 * explicitly filtered out.
 */
const getRowMatch = (
    view: SectionMatchView | null | undefined,
    rowId: string
): RowMatch | undefined | null => {
    if (!view) return undefined;
    const match = view.rows.get(rowId);
    if (!match) return null;
    return match.visible ? match : null;
};

const SettingsRadioGroup = ({
    infoKey,
    labelKey,
    value,
    onValueChange,
    options,
    rowMatch
}: SettingsRadioGroupProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useSettingsPaneStyles();
    const tooltipMountNode = useSettingsPaneTooltip();
    const onChange = useCallback(
        (_ev: FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            onValueChange(data.value);
        },
        [onValueChange]
    );
    const labelText = translate(labelKey);
    const assistiveText = translate(infoKey);
    const labelRanges = rowMatch?.highlights.label;
    const assistiveRanges = rowMatch?.highlights.assistive;
    const showAssistivePreview =
        (!labelRanges || labelRanges.length === 0) &&
        assistiveRanges &&
        assistiveRanges.length > 0;
    const labelNode: ReactNode = (
        <>
            <InfoLabel
                info={assistiveText}
                infoButton={{
                    inline: false,
                    popover: { mountNode: tooltipMountNode }
                }}
            >
                <HighlightText text={labelText} ranges={labelRanges} />
            </InfoLabel>
            {showAssistivePreview ? (
                <AssistivePreview
                    text={assistiveText}
                    ranges={assistiveRanges}
                />
            ) : null}
        </>
    );
    return (
        <Field label={labelNode}>
            <div className={classes.radioGroupHorizontal}>
                <RadioGroup
                    layout='horizontal'
                    onChange={onChange}
                    value={value}
                >
                    {options.map((opt) => (
                        <Radio
                            key={opt.value}
                            value={opt.value}
                            label={translate(opt.labelKey)}
                        />
                    ))}
                </RadioGroup>
            </div>
        </Field>
    );
};

const PROVIDER_OPTIONS: RadioOption[] = [
    { value: 'vegaLite', labelKey: 'Provider_VegaLite' },
    { value: 'vega', labelKey: 'Provider_Vega' }
];

const RENDER_MODE_OPTIONS: RadioOption[] = [
    { value: 'canvas', labelKey: 'Enum_Grammar_RenderMode_Canvas' },
    { value: 'svg', labelKey: 'Enum_Grammar_RenderMode_Svg' }
];

export const ProviderSettings = ({ sectionMatchView }: RowComponentProps) => {
    const { provider, setProvider } = useDenebState((state) => ({
        provider: state.project.provider,
        setProvider: state.project.setProvider
    }));
    const onValueChange = useCallback(
        (value: string) => setProvider(value as SpecProvider),
        [setProvider]
    );
    const rowMatch = getRowMatch(sectionMatchView, 'provider');
    if (rowMatch === null) return null;
    return (
        <SettingsRadioGroup
            infoKey='Assistive_Text_Provider'
            labelKey='Text_Vega_Provider'
            value={provider ?? ''}
            onValueChange={onValueChange}
            options={PROVIDER_OPTIONS}
            rowMatch={rowMatch ?? undefined}
        />
    );
};

export const RenderModeSettings = ({ sectionMatchView }: RowComponentProps) => {
    const { renderMode, setRenderMode } = useDenebState((state) => ({
        renderMode: state.project.renderMode,
        setRenderMode: state.project.setRenderMode
    }));
    const onValueChange = useCallback(
        (value: string) => setRenderMode(value as SpecRenderMode),
        [setRenderMode]
    );
    const rowMatch = getRowMatch(sectionMatchView, 'render-mode');
    if (rowMatch === null) return null;
    return (
        <SettingsRadioGroup
            infoKey='Assistive_Text_RenderMode'
            labelKey='Text_Vega_RenderMode'
            value={renderMode as SpecRenderMode}
            onValueChange={onValueChange}
            options={RENDER_MODE_OPTIONS}
            rowMatch={rowMatch ?? undefined}
        />
    );
};

export const ScaleToZoomSettings = ({
    sectionMatchView
}: RowComponentProps) => {
    const { scaleToZoom, renderMode, setScaleToZoom, translate } =
        useDenebState((state) => ({
            scaleToZoom: state.project.scaleToZoom,
            renderMode: state.project.renderMode,
            setScaleToZoom: state.project.setScaleToZoom,
            translate: state.i18n.translate
        }));
    const tooltipMountNode = useSettingsPaneTooltip();
    const isCanvas = renderMode === 'canvas';
    const onChange = useCallback(
        (_ev: unknown, data: { checked: boolean }) =>
            setScaleToZoom(data.checked),
        [setScaleToZoom]
    );
    const rowMatch = getRowMatch(sectionMatchView, 'scale-to-zoom');
    if (rowMatch === null) return null;
    const labelText = translate('Text_Setting_ScaleToZoom');
    const assistiveText = translate('Assistive_Text_ScaleToZoom');
    const labelRanges = rowMatch?.highlights.label;
    const assistiveRanges = rowMatch?.highlights.assistive;
    const showAssistivePreview =
        (!labelRanges || labelRanges.length === 0) &&
        assistiveRanges &&
        assistiveRanges.length > 0;
    return (
        <Field
            label={
                <>
                    <InfoLabel
                        info={assistiveText}
                        infoButton={{
                            inline: false,
                            popover: { mountNode: tooltipMountNode }
                        }}
                    >
                        <HighlightText text={labelText} ranges={labelRanges} />
                    </InfoLabel>
                    {showAssistivePreview ? (
                        <AssistivePreview
                            text={assistiveText}
                            ranges={assistiveRanges}
                        />
                    ) : null}
                </>
            }
        >
            <Switch
                checked={scaleToZoom}
                onChange={onChange}
                disabled={!isCanvas}
            />
        </Field>
    );
};

/**
 * Re-exported so callers outside this module (notably `settings-pane.tsx`
 * in Unit 3) can resolve every row's i18n keys in a single pass.
 */
export { generalSchema };
