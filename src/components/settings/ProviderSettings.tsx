import * as React from 'react';
import {
    ChoiceGroup,
    IChoiceGroupOption
} from '@fluentui/react/lib/ChoiceGroup';

import { updateProvider } from '../../core/ui/commands';
import { choiceItemStyles, choiceGroupStyles } from '../elements';
import store from '../../store';
import { TSpecProvider } from '../../core/vega';
import { Paragraph } from '../elements/Typography';
import { getI18nValue } from '../../features/i18n';

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
                text: getI18nValue('Provider_VegaLite'),
                styles: choiceItemStyles
            },
            {
                key: 'vega',
                text: getI18nValue('Provider_Vega'),
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
                label={getI18nValue('Objects_Vega_Provider')}
            />
            <Paragraph>{getI18nValue('Assistive_Text_Provider')}</Paragraph>
        </>
    );
};

export default ProviderSettings;
