import React, { useCallback } from 'react';

import { Link } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { InteractivityCheckbox } from './interactivity-checkbox';
import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';
import { CrossFilterMaxDataPoints } from './cross-filter-max-data-points';
import store from '../../../store';
import { hostServices } from '../../../core/services';
import { getConfig } from '../../../core/utils/config';
import { getI18nValue } from '../../i18n';
import { useSettingsStyles } from '.';

export const InteractivitySettings: React.FC = () => {
    const { enableSelection } = store(
        (state) => state.visualSettings.vega,
        shallow
    );
    const { providerResources } = getConfig();
    const openInteractivityLink = useCallback(() => {
        hostServices.launchUrl(
            providerResources.deneb.interactivityDocumentationUrl
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
                    <CrossFilterMaxDataPoints />
                    <SettingsTextSection>
                        {getI18nValue(
                            'Objects_Vega_SelectionMaxDataPoints_Description'
                        )}
                    </SettingsTextSection>
                </>
            )) || <></>}
        </div>
    );
};
