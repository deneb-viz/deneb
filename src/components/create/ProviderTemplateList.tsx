import React from 'react';

import { FocusZone, FocusZoneDirection } from '@fluentui/react/lib/FocusZone';
import { List } from '@fluentui/react/lib/List';

import ProviderTemplateListItem from './ProviderTemplateListItem';

import Debugger from '../../Debugger';
import store from '../../store';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import { resolveTemplatesForProvider } from '../../core/template';

const ProviderTemplateList: React.FC = () => {
    Debugger.log('Rendering Component: [PreDefinedProviderTemplateList]...');
    const { templateProvider } = store(),
        localTemplates = resolveTemplatesForProvider(),
        onRenderCell = (
            item: Spec | TopLevelSpec,
            index: number | undefined,
            containsFocus: boolean
        ): JSX.Element => (
            <ProviderTemplateListItem item={item} index={index} />
        );
    return (
        <FocusZone
            direction={FocusZoneDirection.vertical}
            key={templateProvider}
        >
            <List items={localTemplates} onRenderCell={onRenderCell} />
        </FocusZone>
    );
};

export default ProviderTemplateList;
