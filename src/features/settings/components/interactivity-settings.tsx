import { useCallback } from 'react';

import { Link } from '@fluentui/react-components';

import { InteractivityCheckbox } from './interactivity-checkbox';
import { CrossFilterMaxDataPoints } from './cross-filter-max-data-points';
import { CrossFilterModeSettings } from './cross-filter-mode-settings';
import { useSettingsStyles } from '../styles';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import {
    SettingsHeadingLabel,
    SettingsTextSection,
    useDenebPlatformProvider,
    useDenebState,
    useSettingsPaneStyles
} from '@deneb-viz/app-core';

export const InteractivitySettings = () => {
    const { enableSelection, selectionMode, translate } = useDenebState(
        (state) => ({
            enableSelection:
                state.visualSettings.vega.interactivity.enableSelection.value,
            selectionMode:
                state.visualSettings.vega.interactivity.selectionMode.value,
            translate: state.i18n.translate
        })
    );
    const { launchUrl } = useDenebPlatformProvider();
    const openInteractivityLink = useCallback(() => {
        launchUrl(
            PROVIDER_RESOURCE_CONFIGURATION.deneb.interactivityDocumentationUrl
        );
    }, []);
    const classes = useSettingsStyles();
    const spClasses = useSettingsPaneStyles();
    return (
        <div className={spClasses.sectionContainer}>
            <SettingsHeadingLabel>
                {translate('PowerBI_Objects_Vega_Interactivity')}
            </SettingsHeadingLabel>
            <InteractivityCheckbox type='tooltip' />
            <InteractivityCheckbox type='context' />
            <InteractivityCheckbox type='highlight' />
            <InteractivityCheckbox type='select' />
            <SettingsTextSection>
                {translate('PowerBI_Assistive_Text_Interactivity')}{' '}
                <Link
                    onClick={openInteractivityLink}
                    className={classes.interactivityLink}
                >
                    {translate('PowerBI_Interactivity_Link_Doc')}
                </Link>
            </SettingsTextSection>
            {(enableSelection && (
                <>
                    <CrossFilterModeSettings />
                    {selectionMode === 'simple' && (
                        <>
                            <CrossFilterMaxDataPoints />
                            <SettingsTextSection>
                                {translate(
                                    'PowerBI_Objects_Vega_SelectionMaxDataPoints_Description'
                                )}
                            </SettingsTextSection>
                        </>
                    )}
                </>
            )) || <></>}
        </div>
    );
};
