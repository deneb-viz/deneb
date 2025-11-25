import { useCallback } from 'react';

import { Link } from '@fluentui/react-components';

import { InteractivityCheckbox } from './interactivity-checkbox';
import { CrossFilterMaxDataPoints } from './cross-filter-max-data-points';
import { CrossFilterModeSettings } from './cross-filter-mode-settings';
import { useSettingsStyles } from '../styles';
import { FEATURES } from '../../../../config';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import { getI18nValue, launchUrl } from '@deneb-viz/powerbi-compat/visual-host';
import {
    SettingsHeadingLabel,
    SettingsTextSection,
    useDenebState,
    useSettingsPaneStyles
} from '@deneb-viz/app-core';

export const InteractivitySettings = () => {
    const { enableSelection, selectionMode } = useDenebState((state) => ({
        enableSelection:
            state.visualSettings.vega.interactivity.enableSelection.value,
        selectionMode:
            state.visualSettings.vega.interactivity.selectionMode.value
    }));
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
                {getI18nValue('Objects_Vega_Interactivity')}
            </SettingsHeadingLabel>
            <InteractivityCheckbox type='tooltip' />
            <InteractivityCheckbox type='context' />
            <InteractivityCheckbox type='highlight' />
            <InteractivityCheckbox type='select' />
            <SettingsTextSection>
                {getI18nValue('Assistive_Text_Interactivity')}{' '}
                <Link
                    onClick={openInteractivityLink}
                    className={classes.interactivityLink}
                >
                    {getI18nValue('Link_Interactivity_Doc')}
                </Link>
            </SettingsTextSection>
            {(enableSelection && (
                <>
                    {FEATURES.advanced_cross_filtering && (
                        <CrossFilterModeSettings />
                    )}
                    {selectionMode === 'simple' && (
                        <>
                            <CrossFilterMaxDataPoints />
                            <SettingsTextSection>
                                {getI18nValue(
                                    'Objects_Vega_SelectionMaxDataPoints_Description'
                                )}
                            </SettingsTextSection>
                        </>
                    )}
                </>
            )) || <></>}
        </div>
    );
};
