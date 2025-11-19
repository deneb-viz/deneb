import React, { useCallback } from 'react';

import { Link } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { InteractivityCheckbox } from './interactivity-checkbox';
import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';
import { CrossFilterMaxDataPoints } from './cross-filter-max-data-points';
import { CrossFilterModeSettings } from './cross-filter-mode-settings';
import store from '../../../store';
import { getI18nValue } from '../../i18n';
import { useSettingsStyles } from '.';
import { FEATURES } from '../../../../config';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import { launchUrl } from '@deneb-viz/powerbi-compat/visual-host';

export const InteractivitySettings: React.FC = () => {
    const {
        enableSelection: { value: enableSelection },
        selectionMode: { value: selectionMode }
    } = store((state) => state.visualSettings.vega.interactivity, shallow);
    const openInteractivityLink = useCallback(() => {
        launchUrl(
            PROVIDER_RESOURCE_CONFIGURATION.deneb.interactivityDocumentationUrl
        );
    }, []);
    const classes = useSettingsStyles();
    return (
        <div className={classes.sectionContainer}>
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
