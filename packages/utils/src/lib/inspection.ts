/**
 * Tests for boolean type compatibility.
 */
export function isBoolean(_: unknown) {
    return typeof _ === 'boolean';
}

/**
 * Tests for date type compatibility.
 */
export function isDate(_: unknown) {
    return Object.prototype.toString.call(_) === '[object Date]';
}

/**
 * Tests for number type compatibility.
 */
export function isNumber(_: unknown) {
    return typeof _ === 'number';
}

/**
 * Tests for object type compatibility.
 */
export function isObject(_: unknown) {
    return (
        _ !== null &&
        _ !== undefined &&
        typeof _ === 'object' &&
        !Array.isArray(_)
    );
}

/**
 * Tests for string type compatibility.
 */
export function isString(_: unknown) {
    return typeof _ === 'string';
}
