import React from 'react';

import { FocusZone, FocusZoneDirection } from '@fluentui/react/lib/FocusZone';
import { List } from '@fluentui/react/lib/List';

import { CreateVisualProviderTemplateListItem } from './CreateVisualProviderTemplateListItem';
import store from '../../../store';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import { resolveTemplatesForProvider } from '../../../core/template';

export const CreateVisualProviderTemplateList: React.FC = () => {
    const { templateProvider } = store((state) => state),
        localTemplates = resolveTemplatesForProvider(),
        onRenderCell = (
            item: Spec | TopLevelSpec,
            index: number | undefined,
            containsFocus: boolean
        ): JSX.Element => (
            <CreateVisualProviderTemplateListItem item={item} index={index} />
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
