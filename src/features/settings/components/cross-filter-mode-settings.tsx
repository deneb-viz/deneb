import { type FormEvent, useCallback } from 'react';
import {
    Field,
    InfoLabel,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Text
} from '@fluentui/react-components';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';

import { useSettingsStyles } from '../styles';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import {
    Hyperlink,
    useDenebState,
    useSettingsPaneTooltip
} from '@deneb-viz/app-core';
import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import { InteractivityManager } from '../../../lib/interactivity';
import { useDenebVisualState } from '../../../state';
import { handleSelectionMode } from '../helpers';

const { deneb } = PROVIDER_RESOURCE_CONFIGURATION;

export const CrossFilterModeSettings = () => {
    const { translate } = useDenebState((state) => ({
        translate: state.i18n.translate
    }));
    const tooltipMountNode = useSettingsPaneTooltip();
    const classes = useSettingsStyles();
    const { provider, selectionMode } = useDenebVisualState((state) => ({
        provider: state.settings.vega.output.provider.value as SpecProvider,
        selectionMode: state.settings.vega.interactivity.selectionMode
            .value as SelectionMode
    }));
    const onChange = useCallback(
        (ev: FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            if (InteractivityManager.hasSelection()) {
                InteractivityManager.crossFilter();
            }
            handleSelectionMode(
                data.value as SelectionMode,
                provider as SpecProvider
            );
        },
        [provider]
    );
    return (
        <Field
            label={
                <InfoLabel
                    info={
                        <>
                            {translate('PowerBI_Assistive_Text_SelectionMode')}{' '}
                            <Hyperlink
                                href={deneb.interactivitySelectionUrl}
                                inline
                            >
                                {translate('PowerBI_Interactivity_Link_Doc')}
                            </Hyperlink>
                        </>
                    }
                    infoButton={{
                        inline: false,
                        popover: { mountNode: tooltipMountNode }
                    }}
                >
                    {translate('PowerBI_Objects_Vega_SelectionMode')}
                </InfoLabel>
            }
        >
            <RadioGroup
                value={selectionMode as SelectionMode}
                onChange={onChange}
            >
                <Radio
                    value='simple'
                    label={renderRadioLabel(
                        translate,
                        classes.radioGroupLabel,
                        'PowerBI_Enum_SelectionMode_Simple',
                        'PowerBI_Radio_Button_Description_Cross_Filter_Simple',
                        deneb.interactivitySelectionSimpleUrl
                    )}
                />
                <Radio
                    value='advanced'
                    label={renderRadioLabel(
                        translate,
                        classes.radioGroupLabel,
                        'PowerBI_Enum_SelectionMode_Advanced',
                        'PowerBI_Radio_Button_Description_Cross_Filter_Advanced',
                        deneb.interactivitySelectionAdvancedUrl
                    )}
                    disabled={provider === 'vegaLite'}
                />
            </RadioGroup>
        </Field>
    );
};

const renderRadioLabel = (
    translate: (key: string) => string,
    descriptionClass: string,
    labelKey: string,
    descriptionKey: string,
    docUrl: string
) => (
    <>
        {translate(labelKey)}
        <br />
        <Text size={200} className={descriptionClass}>
            {translate(descriptionKey)}{' '}
            <Hyperlink href={docUrl} inline>
                {translate('PowerBI_Interactivity_Link_Doc')}
            </Hyperlink>
        </Text>
    </>
);
