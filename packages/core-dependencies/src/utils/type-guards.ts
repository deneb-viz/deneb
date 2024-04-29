/**
 * Tests for boolean type compatibility.
 */
export const isBoolean = (_: unknown) => typeof _ === 'boolean';

/**
 * Tests for date type compatibility.
 */
export const isDate = (_: unknown) => Object.prototype.toString.call(_) === '[object Date]';

/**
 * Tests for number type compatibility.
 */
export const isNumber = (_: unknown) => typeof _ === 'number';

/**
 * Tests for object type compatibility.
 */
export const isObject = (_: unknown) => _ !== null && _ !== undefined && typeof _ === 'object' && !Array.isArray(_);

/**
 * Tests for string type compatibility.
 */
export const isString = (_: unknown) => typeof _ === 'string';
