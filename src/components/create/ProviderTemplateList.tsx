import React from 'react';
import { useSelector } from 'react-redux';

import { FocusZone, FocusZoneDirection } from '@fluentui/react/lib/FocusZone';
import { List } from '@fluentui/react/lib/List';

import ProviderTemplateListItem from './ProviderTemplateListItem';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';

const ProviderTemplateList: React.FC = () => {
    Debugger.log('Rendering Component: [PreDefinedProviderTemplateList]...');
    const root = useSelector(state),
        { templates } = root,
        { templateProvider } = templates,
        localTemplates = templates[templateProvider],
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
