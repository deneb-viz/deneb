import powerbi from 'powerbi-visuals-api';
import FormattingSlice = powerbi.visuals.FormattingSlice;
import FormattingComponent = powerbi.visuals.FormattingComponent;
import FormattingDescriptor = powerbi.visuals.FormattingDescriptor;
import ValidatorType = powerbi.visuals.ValidatorType;
import IEnumMember = powerbi.IEnumMember;
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;

import { getI18nValue } from '../features/i18n';
import {
    ICapabilitiesEnumMember,
    IColorSliceOptions,
    IDropdownSliceOptions,
    IIntegerSliceOptions,
    ISliceOptionsBase,
    ITextSliceOptions,
    IToggleSliceOptions
} from './types';

/**
 * Gets all base properties for a slice, for the supplied options.
 */
export const getBaseDescriptor = (
    options: ISliceOptionsBase
): FormattingDescriptor => {
    return {
        objectName: options.objectName,
        propertyName: options.propertyName,
        instanceKind:
            options.instanceKind || VisualEnumerationInstanceKinds.Constant
    };
};

/**
 * Gets all base options for a slice, for the supplied options.
 */
const getBaseSlice = (options: ISliceOptionsBase) =>
    <FormattingSlice>{
        displayName: getI18nValue(options.displayNameKey),
        description: getI18nValue(options.descriptionKey || ''),
        uid: options.displayNameKey,
        disabled: options.disabled || false
    };

/**
 * Converts a capabilities enum member to a formatting enum member.
 */
const getEnumValue = (member: ICapabilitiesEnumMember): IEnumMember => ({
    value: member.value,
    displayName: getI18nValue(member.displayNameKey || member.displayName)
});

/**
 * Retrieves a format slice representing a color property.
 */
export const getColorSlice = (options: IColorSliceOptions): FormattingSlice => {
    return {
        ...getBaseSlice(options),
        ...{
            control: {
                type: FormattingComponent.ColorPicker,
                properties: {
                    descriptor: getBaseDescriptor(options),
                    value: { value: options.value }
                }
            }
        }
    };
};

/**
 * Retrieves a format slice representing a dropdown property.
 */
export const getDropdownSlice = (
    options: IDropdownSliceOptions
): FormattingSlice => {
    const value = getEnumValue(
        options.items.find((i) => i.value === options.value)
    );
    return {
        ...getBaseSlice(options),
        ...{
            control: {
                type: FormattingComponent.Dropdown,
                properties: {
                    descriptor: getBaseDescriptor(options),
                    items: options.items.map((i) => getEnumValue(i)),
                    value
                }
            }
        }
    };
};

/**
 * Retrieves a format slice representing a slider property.
 */
export const getIntegerSlice = (
    options: IIntegerSliceOptions
): FormattingSlice => {
    return {
        ...getBaseSlice(options),
        ...{
            control: {
                type: options.slider
                    ? FormattingComponent.Slider
                    : FormattingComponent.NumUpDown,
                properties: {
                    descriptor: getBaseDescriptor(options),
                    options: {
                        minValue: {
                            type: ValidatorType.Min,
                            value: options.minValue
                        },
                        maxValue: {
                            type: ValidatorType.Max,
                            value: options.maxValue
                        },
                        unitSymbol: options.unitSymbol,
                        unitSymbolAfterInput: options.unitSymbolAfterInput
                    },
                    value: options.value
                }
            }
        }
    };
};

/**
 * Retrieves a format slice representing a text property.
 */
export const getTextSlice = (options: ITextSliceOptions): FormattingSlice => {
    return {
        ...getBaseSlice(options),
        ...{
            control: {
                type: options.area
                    ? FormattingComponent.TextArea
                    : FormattingComponent.TextInput,
                properties: {
                    descriptor: getBaseDescriptor(options),
                    value: options.value,
                    placeholder: getI18nValue(options.placeholder)
                }
            }
        }
    };
};

/**
 * Retrieves a format slice representing a toggle property.
 */
export const getToggleSlice = (
    options: IToggleSliceOptions
): FormattingSlice => {
    return {
        ...getBaseSlice(options),
        ...{
            control: {
                type: FormattingComponent.ToggleSwitch,
                properties: {
                    descriptor: getBaseDescriptor(options),
                    value: options.value
                }
            }
        }
    };
};
