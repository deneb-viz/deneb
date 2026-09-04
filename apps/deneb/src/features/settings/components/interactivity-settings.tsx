import { InteractivityToggle } from './interactivity-toggle';
import { CrossFilterMaxDataPoints } from './cross-filter-max-data-points';
import { CrossFilterModeSettings } from './cross-filter-mode-settings';
import { SettingsAccordionItem, useDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../../state';

export const TooltipSettings = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    return (
        <SettingsAccordionItem
            value='tooltips'
            heading={translate('PowerBI_Objects_Vega_Tooltips')}
        >
            <InteractivityToggle type='tooltip' />
        </SettingsAccordionItem>
    );
};

export const ContextMenuSettings = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    const enableContextMenu = useDenebVisualState(
        (state) => state.settings.vega.interactivity.enableContextMenu.value
    );
    return (
        <SettingsAccordionItem
            value='contextmenu'
            heading={translate('PowerBI_Objects_Vega_ContextMenu')}
        >
            <InteractivityToggle type='context' />
            <InteractivityToggle
                type='contextSelector'
                disabled={!enableContextMenu}
            />
        </SettingsAccordionItem>
    );
};

export const CrossFilterSettings = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    const { enableSelection, selectionMode } = useDenebVisualState((state) => ({
        enableSelection:
            state.settings.vega.interactivity.enableSelection.value,
        selectionMode: state.settings.vega.interactivity.selectionMode.value
    }));
    return (
        <SettingsAccordionItem
            value='crossfilter'
            heading={translate('PowerBI_Objects_Vega_CrossFiltering')}
        >
            <InteractivityToggle type='select' />
            {enableSelection && (
                <>
                    <CrossFilterModeSettings />
                    {selectionMode === 'simple' && <CrossFilterMaxDataPoints />}
                </>
            )}
        </SettingsAccordionItem>
    );
};

export const CrossHighlightSettings = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    return (
        <SettingsAccordionItem
            value='crosshighlight'
            heading={translate('PowerBI_Objects_Vega_CrossHighlighting')}
        >
            <InteractivityToggle type='highlight' />
        </SettingsAccordionItem>
    );
};
