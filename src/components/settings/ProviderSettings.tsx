import * as React from 'react';
import {
    ChoiceGroup,
    IChoiceGroupOption
} from '@fluentui/react/lib/ChoiceGroup';

import { updateProvider } from '../../core/ui/commands';
import { choiceGroupStyles, choiceItemStyles } from '../../config/styles';
import store from '../../store';
import { i18nValue } from '../../core/ui/i18n';
import { TSpecProvider } from '../../core/vega';
import { Paragraph } from '../elements/Typography';

const ProviderSettings = () => {
    const { vega } = store((state) => state.visualSettings),
        handleProvider = React.useCallback(
            (
                ev: React.SyntheticEvent<HTMLElement>,
                option: IChoiceGroupOption
            ) => {
                updateProvider(option.key as TSpecProvider);
            },
            []
        ),
        providerOptions: IChoiceGroupOption[] = [
            {
                key: 'vegaLite',
                text: i18nValue('Provider_VegaLite'),
                styles: choiceItemStyles
            },
            {
                key: 'vega',
                text: i18nValue('Provider_Vega'),
                styles: choiceItemStyles
            }
        ];
    return (
        <>
            <ChoiceGroup
                options={providerOptions}
                styles={choiceGroupStyles}
                onChange={handleProvider}
                selectedKey={vega.provider}
                label={i18nValue('Objects_Vega_Provider')}
            />
            <Paragraph>{i18nValue('Assistive_Text_Provider')}</Paragraph>
        </>
    );
};

export default ProviderSettings;
