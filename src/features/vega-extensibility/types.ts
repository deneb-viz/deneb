import { Selection, BaseType } from 'd3-selection';
import { View } from 'vega';

/**
 * Defined pattern fill groups.
 */
export type TPatternFillGroup =
    | 'diagonal-stripe'
    | 'horizontal-stripe'
    | 'vertical-stripe'
    | 'circles'
    | 'dots'
    | 'other'
    | 'dynamic';
/**
 * Represents an inbuilt pattern fill definition.
 */
export interface IPatternFillDefinition {
    id: string;
    group: TPatternFillGroup;
    fgColor?: string;
    bgColor?: string;
    strokeWidth?: number;
    size?: number;
    generator: (
        selection: Selection<
            SVGPatternElement,
            IPatternFillDefinition,
            BaseType,
            unknown
        >
    ) => void;
}
/**
 * Structure of a modifier - used to produce variations of a particular fill
 * pattern definition.
 */
export interface IPatternFillModifier {
    /**
     * Suffix to add to the pattern ID to create a unique ID for the modified
     * pattern.
     */
    suffix?: string;
    /**
     * Represents percentage of the original pattern foreground color to use
     * for the modified pattern's foreground color.
     */
    fgColorPercent?: number;
}

export interface IPowerBIExpression {
    name: string;
    method: any;
}

export interface IPowerBISchemes {
    name: string;
    values: string[] | ((t: number) => string);
}

export interface IVegaViewServices {
    bind: (v: View) => void;
    clearView: () => any;
    getAllData: () => any;
    getAllSignals: () => any;
    getDataByName: (name: string) => any[];
    getSignalByName: (name: string) => any;
    getView: () => View;
}
