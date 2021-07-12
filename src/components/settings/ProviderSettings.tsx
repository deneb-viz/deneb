import * as React from 'react';
import { useSelector } from 'react-redux';
import { Text } from '@fluentui/react/lib/Text';
import {
    ChoiceGroup,
    IChoiceGroupOption
} from '@fluentui/react/lib/ChoiceGroup';

import { updateProvider } from '../../api/commands';
import { TSpecProvider } from '../../api/specification';
import { choiceGroupStyles, choiceItemStyles } from '../../config/styles';
import { state } from '../../store';
import { getHostLM } from '../../api/i18n';

const ProviderSettings = () => {
    const { settings } = useSelector(state).visual,
        { vega } = settings,
        i18n = getHostLM(),
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
                text: i18n.getDisplayName('Provider_VegaLite'),
                styles: choiceItemStyles
            },
            {
                key: 'vega',
                text: i18n.getDisplayName('Provider_Vega'),
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
                label={i18n.getDisplayName('Objects_Vega_Provider')}
            />
            <Text variant='smallPlus'>
                {i18n.getDisplayName('Assistive_Text_Provider')}
            </Text>
        </>
    );
};

export default ProviderSettings;
