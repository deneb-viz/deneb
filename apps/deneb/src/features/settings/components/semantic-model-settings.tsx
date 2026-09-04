import { useCallback } from 'react';
import { Field, InfoLabel, Switch } from '@fluentui/react-components';

import { SettingsAccordionItem, useDenebState } from '@deneb-viz/app-core';

export const SemanticModelSettings = () => {
    const {
        consolidateFieldParameters,
        setConsolidateFieldParameters,
        translate
    } = useDenebState((state) => ({
        consolidateFieldParameters: state.project.consolidateFieldParameters,
        setConsolidateFieldParameters:
            state.project.setConsolidateFieldParameters,
        translate: state.i18n.translate
    }));
    const onChange = useCallback(
        (_ev: unknown, data: { checked: boolean }) =>
            setConsolidateFieldParameters(data.checked),
        [setConsolidateFieldParameters]
    );
    return (
        <SettingsAccordionItem
            value='semantic-model'
            heading={translate('Text_Settings_SemanticModel')}
        >
            <Field
                label={
                    <InfoLabel
                        info={translate(
                            'Assistive_Text_ConsolidateFieldParameters'
                        )}
                    >
                        {translate('Text_Setting_ConsolidateFieldParameters')}
                    </InfoLabel>
                }
            >
                <Switch
                    checked={consolidateFieldParameters}
                    onChange={onChange}
                />
            </Field>
        </SettingsAccordionItem>
    );
};
