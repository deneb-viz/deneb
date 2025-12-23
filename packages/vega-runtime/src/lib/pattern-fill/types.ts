import { BaseType, Selection } from 'd3-selection';

/**
 * Defined pattern fill groups.
 */
export type PatternFillGroup =
    | 'diagonal-stripe'
    | 'horizontal-stripe'
    | 'vertical-stripe'
    | 'circles'
    | 'dots'
    | 'other'
    | 'dynamic';
/**
 * Represents an inbuilt pattern fill definition (authoring/input form).
 */
export interface PatternFillDefinition {
    id: string;
    group: PatternFillGroup;
    fgColor?: string;
    bgColor?: string;
    strokeWidth?: number;
    size?: number;
    generator: (
        selection: Selection<
            SVGPatternElement,
            PatternFillResolved,
            BaseType,
            unknown
        >
    ) => void;
}

/**
 * Represents a resolved pattern fill definition with all defaults applied.
 * Used internally after normalization to guarantee all properties are present.
 */
export interface PatternFillResolved
    extends Omit<
        PatternFillDefinition,
        'fgColor' | 'bgColor' | 'strokeWidth' | 'size'
    > {
    fgColor: string;
    bgColor: string;
    strokeWidth: number;
    size: number;
}

/**
 * Structure of a modifier - used to produce variations of a particular fill
 * pattern definition.
 */
export interface PatternFillModifier {
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
