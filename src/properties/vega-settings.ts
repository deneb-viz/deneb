import powerbi from 'powerbi-visuals-api';
import FormattingCard = powerbi.visuals.FormattingCard;

import SettingsBase from './settings-base';
import { getI18nValue } from '../features/i18n';
import {
    getDropdownSlice,
    getIntegerSlice,
    getTextSlice,
    getToggleSlice
} from './formatting-model';
import { getConfig } from '../core/utils/config';
import { CAPABILITIES, PROPERTY_DEFAULTS } from '../../config';

const OBJECT_NAME = 'vega';
const OBJECT_DEF = CAPABILITIES.objects[OBJECT_NAME];
const PROPERTIES = OBJECT_DEF.properties;
const { selection: SELECTION } = getConfig();

/**
 * Manages the specification grammar and the user-provided source
 */
export default class VegaSettings extends SettingsBase {
    public jsonSpec: string = PROPERTY_DEFAULTS.vega.jsonSpec;
    public jsonConfig: string = PROPERTY_DEFAULTS.vega.jsonConfig;
    public provider = PROPERTY_DEFAULTS.vega.provider;
    public logLevel = PROPERTY_DEFAULTS.vega.logLevel;
    public version: string = null;
    public renderMode = PROPERTY_DEFAULTS.vega.renderMode;
    public enableTooltips = PROPERTY_DEFAULTS.vega.enableTooltips;
    public enableContextMenu = PROPERTY_DEFAULTS.vega.enableContextMenu;
    public enableSelection = PROPERTY_DEFAULTS.vega.enableSelection;
    public enableHighlight = PROPERTY_DEFAULTS.vega.enableHighlight;
    public selectionMaxDataPoints =
        PROPERTY_DEFAULTS.vega.selectionMaxDataPoints;
    public tooltipDelay = PROPERTY_DEFAULTS.vega.tooltipDelay;
    public isNewDialogOpen = PROPERTY_DEFAULTS.vega.isNewDialogOpen;

    // eslint-disable-next-line max-lines-per-function
    public getFormattingCard = (): FormattingCard => {
        return {
            displayName: getI18nValue(OBJECT_DEF.displayNameKey),
            description: getI18nValue(OBJECT_DEF.descriptionKey),
            uid: OBJECT_DEF.displayNameKey,
            groups: [
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Vega`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Vega`,
                    slices: [
                        getDropdownSlice({
                            displayNameKey: PROPERTIES.provider.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'provider',
                            value: this.provider,
                            items: PROPERTIES.provider.type.enumeration
                        }),
                        getTextSlice({
                            displayNameKey: PROPERTIES.version.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'version',
                            value: this.version,
                            placeholder: PROPERTIES.version.placeHolderTextKey
                        }),
                        getTextSlice({
                            displayNameKey: PROPERTIES.jsonSpec.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'jsonSpec',
                            value: this.jsonSpec,
                            placeholder: PROPERTIES.jsonSpec.placeHolderTextKey,
                            area: true
                        }),
                        getTextSlice({
                            displayNameKey:
                                PROPERTIES.jsonConfig.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'jsonConfig',
                            value: this.jsonConfig,
                            placeholder:
                                PROPERTIES.jsonConfig.placeHolderTextKey,
                            area: true
                        }),
                        getDropdownSlice({
                            displayNameKey:
                                PROPERTIES.renderMode.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'renderMode',
                            value: this.renderMode,
                            items: PROPERTIES.renderMode.type.enumeration
                        })
                    ]
                },
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Logging`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Logging`,
                    slices: [
                        getDropdownSlice({
                            displayNameKey: PROPERTIES.logLevel.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'logLevel',
                            value: `${this.logLevel}`,
                            items: PROPERTIES.logLevel.type.enumeration
                        })
                    ]
                },
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Interactivity`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Interactivity`,
                    slices: [
                        getToggleSlice({
                            displayNameKey:
                                PROPERTIES.enableTooltips.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'enableTooltips',
                            value: this.enableTooltips
                        }),
                        getToggleSlice({
                            displayNameKey:
                                PROPERTIES.enableContextMenu.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'enableContextMenu',
                            value: this.enableContextMenu
                        }),
                        getToggleSlice({
                            displayNameKey:
                                PROPERTIES.enableSelection.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'enableSelection',
                            value: this.enableSelection
                        }),
                        getIntegerSlice({
                            displayNameKey:
                                PROPERTIES.selectionMaxDataPoints
                                    .displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'selectionMaxDataPoints',
                            value: this.selectionMaxDataPoints,
                            minValue: SELECTION.minDataPointsValue,
                            maxValue: SELECTION.maxDataPointsValue,
                            slider: true
                        }),
                        getToggleSlice({
                            displayNameKey:
                                PROPERTIES.enableHighlight.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'enableHighlight',
                            value: this.enableHighlight
                        })
                    ]
                },
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_State`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_State`,
                    slices: [
                        getToggleSlice({
                            displayNameKey:
                                PROPERTIES.isNewDialogOpen.displayNameKey,
                            objectName: OBJECT_NAME,
                            propertyName: 'isNewDialogOpen',
                            value: this.isNewDialogOpen
                        })
                    ]
                }
            ]
        };
    };
}
