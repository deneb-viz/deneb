/**
 * Consistently format a supplied identity into a suitable placeholder. Placeholders are used to represent dataset
 * fields in the specification, so that they can be replaced with the actual values when the dataset is accessible.
 * - Decimal values are floored to the nearest integer.
 * - Negative values are converted to positive values.
 */
export function getJsonPlaceholderKey(i: number) {
    return `__${Math.floor(Math.abs(i))}__`;
}
