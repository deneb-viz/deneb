import { ChangeEvent, useCallback, useMemo } from 'react';
import {
    InfoLabel,
    Switch,
    SwitchOnChangeData
} from '@fluentui/react-components';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';

import { useSettingsStyles } from '../styles';
import {
    Hyperlink,
    useDenebState,
    useSettingsPaneTooltip
} from '@deneb-viz/app-core';
import { InteractivityManager } from '../../../lib/interactivity';
import { useDenebVisualState } from '../../../state';
import { handlePersistBooleanProperty } from '../helpers';

/**
 * Used to denote supported interactivity types within Deneb. These can be used
 * to flag any contextual methods for any particular functionality.
 */
type TInteractivityType =
    | 'tooltip'
    | 'highlight'
    | 'select'
    | 'context'
    | 'contextSelector';

type InteractivityToggleProps = {
    type: TInteractivityType;
    disabled?: boolean;
};

export const InteractivityToggle = ({
    type,
    disabled
}: InteractivityToggleProps) => {
    const { translate } = useDenebState((state) => ({
        translate: state.i18n.translate
    }));
    const { interactivity } = useDenebVisualState((state) => ({
        interactivity: state.settings.vega.interactivity
    }));
    const propertyName = useMemo(() => getPropertyName(type), [type]);
    const tooltipMountNode = useSettingsPaneTooltip();
    const classes = useSettingsStyles();
    const handleToggle = useCallback(
        (ev: ChangeEvent<HTMLInputElement>, data: SwitchOnChangeData): void => {
            const value = data.checked;
            if (
                type === 'select' &&
                !value &&
                InteractivityManager.hasSelection()
            ) {
                InteractivityManager.crossFilter();
            }
            handlePersistBooleanProperty(propertyName, value);
        },
        [type, propertyName]
    );
    const status = useMemo(() => getFeatureStatus(type), [type]);
    return (
        status && (
            <Switch
                label={
                    <InfoLabel
                        info={
                            <>
                                {translate(getInfoKey(type))}{' '}
                                <Hyperlink href={getDocUrl(type)} inline>
                                    {translate('Text_Link_Learn_More')}
                                </Hyperlink>
                            </>
                        }
                        infoButton={{
                            inline: false,
                            popover: { mountNode: tooltipMountNode }
                        }}
                    >
                        {translate(getLabelKey(type))}
                    </InfoLabel>
                }
                checked={interactivity[propertyName]?.value || false}
                onChange={handleToggle}
                className={classes.sectionItem}
                disabled={disabled}
            />
        )
    );
};

/**
 * Resolves feature flag status for the supplied type.
 */
const getFeatureStatus = (type: TInteractivityType) => {
    switch (type) {
        default:
            return true;
    }
};

const { deneb } = PROVIDER_RESOURCE_CONFIGURATION;

/**
 * Resolves i18n label key for the supplied type.
 */
const getLabelKey = (type: TInteractivityType) => {
    switch (type) {
        case 'context':
            return 'PowerBI_Objects_Vega_EnableContextMenu';
        case 'contextSelector':
            return 'PowerBI_Objects_Vega_EnableContextMenuSelector';
        case 'highlight':
            return 'PowerBI_Objects_Vega_EnableHighlight';
        case 'select':
            return 'PowerBI_Objects_Vega_EnableSelection';
        case 'tooltip':
            return 'PowerBI_Objects_Vega_EnableTooltips';
    }
};

/**
 * Resolves assistive text i18n key for the supplied type.
 */
const getInfoKey = (type: TInteractivityType) => {
    switch (type) {
        case 'context':
            return 'PowerBI_Assistive_Text_ContextMenu';
        case 'contextSelector':
            return 'PowerBI_Assistive_Text_ContextMenuSelector';
        case 'highlight':
            return 'PowerBI_Assistive_Text_Highlight';
        case 'select':
            return 'PowerBI_Assistive_Text_Selection';
        case 'tooltip':
            return 'PowerBI_Assistive_Text_Tooltip';
    }
};

/**
 * Resolves documentation URL for the supplied type.
 */
const getDocUrl = (type: TInteractivityType) => {
    switch (type) {
        case 'context':
            return deneb.interactivityContextMenuUrl;
        case 'contextSelector':
            return deneb.interactivityContextMenuSelectorUrl;
        case 'highlight':
            return deneb.interactivityHighlightUrl;
        case 'select':
            return deneb.interactivitySelectionUrl;
        case 'tooltip':
            return deneb.interactivityTooltipUrl;
    }
};

/**
 * Resolves property to persist for toggle state, for the supplied type.
 */
const getPropertyName = (type: TInteractivityType) => {
    switch (type) {
        case 'context':
            return 'enableContextMenu';
        case 'contextSelector':
            return 'enableContextMenuSelector';
        case 'highlight':
            return 'enableHighlight';
        case 'select':
            return 'enableSelection';
        case 'tooltip':
            return 'enableTooltips';
    }
};
