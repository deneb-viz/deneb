import powerbi from 'powerbi-visuals-api';
import EnumMemberValue = powerbi.EnumMemberValue;
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;

/**
 * Represents an enum member from capabilities.json
 */
export interface ICapabilitiesEnumMember {
    value: string;
    displayName: string;
    displayNameKey?: string;
}

/**
 * Base options for a formatting slice.
 */
export interface ISliceOptionsBase {
    displayNameKey: string;
    descriptionKey?: string;
    objectName: string;
    propertyName: string;
    disabled?: boolean;
    instanceKind?: VisualEnumerationInstanceKinds;
}

/**
 * Specific options for a color slice.
 */
export interface IColorSliceOptions extends ISliceOptionsBase {
    value: string;
}

/**
 * Specific options for a dropdown slice.
 */
export interface IDropdownSliceOptions extends ISliceOptionsBase {
    value: EnumMemberValue;
    items: ICapabilitiesEnumMember[];
}

/**
 * Specific options for a slice representing an integer.
 */
export interface IIntegerSliceOptions extends ISliceOptionsBase {
    slider?: boolean;
    minValue?: number;
    maxValue?: number;
    value: number;
    unitSymbol?: string;
    unitSymbolAfterInput?: boolean;
}

/**
 * Specific options for a slice representing a text value.
 */
export interface ITextSliceOptions extends ISliceOptionsBase {
    value: string | null;
    placeholder: string;
    area?: boolean;
}

/**
 * Specific options for a slice representing a boolean/toggle.
 */
export interface IToggleSliceOptions extends ISliceOptionsBase {
    value: boolean;
}
