import { type FormEvent, useCallback } from 'react';
import {
    Field,
    InfoLabel,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData
} from '@fluentui/react-components';

import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { useSettingsPaneTooltip } from './settings-pane-tooltip-context';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';

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
};

const SettingsRadioGroup = ({
    infoKey,
    labelKey,
    value,
    onValueChange,
    options
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
    return (
        <Field
            label={
                <InfoLabel
                    info={translate(infoKey)}
                    infoButton={{
                        inline: false,
                        popover: { mountNode: tooltipMountNode }
                    }}
                >
                    {translate(labelKey)}
                </InfoLabel>
            }
        >
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

export const ProviderSettings = () => {
    const { provider, setProvider } = useDenebState((state) => ({
        provider: state.project.provider,
        setProvider: state.project.setProvider
    }));
    const onValueChange = useCallback(
        (value: string) => setProvider(value as SpecProvider),
        [setProvider]
    );
    return (
        <SettingsRadioGroup
            infoKey='Assistive_Text_Provider'
            labelKey='Text_Vega_Provider'
            value={provider ?? ''}
            onValueChange={onValueChange}
            options={PROVIDER_OPTIONS}
        />
    );
};

export const RenderModeSettings = () => {
    const { renderMode, setRenderMode } = useDenebState((state) => ({
        renderMode: state.project.renderMode,
        setRenderMode: state.project.setRenderMode
    }));
    const onValueChange = useCallback(
        (value: string) => setRenderMode(value as SpecRenderMode),
        [setRenderMode]
    );
    return (
        <SettingsRadioGroup
            infoKey='Assistive_Text_RenderMode'
            labelKey='Text_Vega_RenderMode'
            value={renderMode as SpecRenderMode}
            onValueChange={onValueChange}
            options={RENDER_MODE_OPTIONS}
        />
    );
};
