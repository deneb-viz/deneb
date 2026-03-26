import { useCallback, useState } from 'react';
import {
    Accordion,
    type AccordionToggleData,
    type AccordionToggleEvent,
    makeStyles
} from '@fluentui/react-components';

import { ProviderSettings, RenderModeSettings } from './general-settings';
import { PerformanceSettings } from './performance-settings';
import { SettingsAccordionItem } from './settings-accordion-item';
import { SettingsPaneTooltipProvider } from './settings-pane-tooltip-context';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useDenebState } from '../../../state';
import { BeakerRegular } from '@fluentui/react-icons';

const DEFAULT_OPEN_ITEMS: string[] = ['general'];

/** Memoize open items across remounts (module-level ref). */
let persistedOpenItems: string[] | null = null;

const useSettingsPaneLayoutStyles = makeStyles({
    root: {
        overflow: 'overlay',
        width: '100%'
    }
});

export const SettingsPane = () => {
    const classes = useSettingsPaneLayoutStyles();
    const { settingsPanePlatformComponent } = useDenebPlatformProvider();
    const translate = useDenebState((state) => state.i18n.translate);
    const [openItems, setOpenItems] = useState<string[]>(
        () => persistedOpenItems ?? DEFAULT_OPEN_ITEMS
    );
    const onToggle = useCallback(
        (_event: AccordionToggleEvent, data: AccordionToggleData<string>) => {
            const items = data.openItems;
            setOpenItems(items);
            persistedOpenItems = items;
        },
        []
    );
    return (
        <SettingsPaneTooltipProvider>
            <div className={classes.root}>
                <Accordion
                    multiple
                    collapsible
                    openItems={openItems}
                    onToggle={onToggle}
                >
                    <SettingsAccordionItem
                        value='general'
                        heading={translate('Text_Vega_Provider_And_Rendering')}
                    >
                        <ProviderSettings />
                        <RenderModeSettings />
                    </SettingsAccordionItem>
                    <SettingsAccordionItem
                        value='performance'
                        heading={translate('Text_Vega_Performance')}
                        icon={<BeakerRegular />}
                    >
                        <PerformanceSettings />
                    </SettingsAccordionItem>
                    {settingsPanePlatformComponent}
                </Accordion>
            </div>
        </SettingsPaneTooltipProvider>
    );
};
