import powerbi from 'powerbi-visuals-api';
import FormattingCard = powerbi.visuals.FormattingCard;
import FormattingGroup = powerbi.visuals.FormattingGroup;

import SettingsBase from './settings-base';
import { logDebug } from '../features/logging';
import { getI18nValue } from '../features/i18n';
import { getColorSlice, getIntegerSlice } from './formatting-model';
import { IColorSliceOptions, IIntegerSliceOptions } from './types';
import { CAPABILITIES, FEATURES, PROPERTY_DEFAULTS } from '../../config';

const OBJECT_NAME = 'display';
const OBJECT_DEF = CAPABILITIES.objects[OBJECT_NAME];
const PROPERTIES = OBJECT_DEF.properties;

/**
 * Manages data limit override preferences for the visual.
 */
export default class DisplaySettings extends SettingsBase {
    // Persisted height of visual viewport in view mode (should preserve height on re-init)
    public viewportHeight: number = null;
    // Persisted width of visual viewport in view mode (should preserve width on re-init)
    public viewportWidth: number = null;
    // Color of displayed scrollbars
    public scrollbarColor: string = PROPERTY_DEFAULTS.display.scrollbarColor;
    // Opacity of displayed scrollbars
    public scrollbarOpacity: number =
        PROPERTY_DEFAULTS.display.scrollbarOpacity;
    // Radius of displayed scrollbars
    public scrollbarRadius: number =
        PROPERTY_DEFAULTS.display.scrollbarRadius.default;

    /**
     * Formatting card for these settings.
     */
    public getFormattingCard = (): FormattingCard => {
        logDebug(`getFormattingCard: ${OBJECT_NAME}`);
        const SCROLLBAR_COLOR_SLICE: IColorSliceOptions = {
            displayNameKey: PROPERTIES.scrollbarColor.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'scrollbarColor',
            value: this.scrollbarColor
        };
        const SCROLLBAR_OPACITY_SLICE: IIntegerSliceOptions = {
            displayNameKey: PROPERTIES.scrollbarOpacity.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'scrollbarOpacity',
            value: this.scrollbarOpacity,
            slider: true,
            minValue: 0,
            maxValue: 100,
            unitSymbol: '%',
            unitSymbolAfterInput: true
        };
        const SCROLLBAR_RADIUS_SLICE: IIntegerSliceOptions = {
            displayNameKey: PROPERTIES.scrollbarRadius.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'scrollbarRadius',
            value: this.scrollbarRadius,
            slider: true,
            minValue: PROPERTY_DEFAULTS.display.scrollbarRadius.min,
            maxValue: PROPERTY_DEFAULTS.display.scrollbarRadius.max,
            unitSymbol: 'px',
            unitSymbolAfterInput: true
        };
        return {
            displayName: getI18nValue(OBJECT_DEF.displayNameKey),
            description: getI18nValue(OBJECT_DEF.descriptionKey),
            uid: OBJECT_DEF.displayNameKey,
            revertToDefaultDescriptors: [
                SCROLLBAR_COLOR_SLICE,
                SCROLLBAR_OPACITY_SLICE,
                SCROLLBAR_RADIUS_SLICE
            ],
            groups: [
                ...[
                    {
                        displayName: getI18nValue(
                            `${OBJECT_DEF.displayNameKey}_Group_Scrollbars`
                        ),
                        uid: `${OBJECT_DEF.displayNameKey}_Group_Scrollbars`,
                        slices: [
                            ...[
                                getColorSlice(SCROLLBAR_COLOR_SLICE),
                                getIntegerSlice(SCROLLBAR_OPACITY_SLICE),
                                getIntegerSlice(SCROLLBAR_RADIUS_SLICE)
                            ]
                        ]
                    }
                ],
                ...this.getDebugProperties()
            ]
        };
    };

    /**
     * If debugging is enabled, expose some additional properties for testing.
     */
    private getDebugProperties(): FormattingGroup[] {
        const VIEWPORT_HEIGHT_SLICE: IIntegerSliceOptions = {
            displayNameKey: PROPERTIES.viewportHeight.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'viewportHeight',
            value: this.viewportHeight
        };
        const VIEWPORT_WIDTH_SLICE: IIntegerSliceOptions = {
            displayNameKey: PROPERTIES.viewportWidth.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'viewportWidth',
            value: this.viewportWidth
        };
        return FEATURES.developer_mode
            ? [
                  {
                      displayName: getI18nValue(
                          `${OBJECT_DEF.displayNameKey}_Group_Viewport`
                      ),
                      uid: `${OBJECT_DEF.displayNameKey}_Group_Viewport`,
                      slices: [
                          getIntegerSlice(VIEWPORT_HEIGHT_SLICE),
                          getIntegerSlice(VIEWPORT_WIDTH_SLICE)
                      ]
                  }
              ]
            : [];
    }
}
