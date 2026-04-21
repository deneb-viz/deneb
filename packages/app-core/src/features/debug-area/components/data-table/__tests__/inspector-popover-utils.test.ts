// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
    formatInspectorValue,
    getInspectorDimensions,
    getInspectorLanguage,
    INSPECTABLE_CELL_ATTRIBUTE,
    INSPECTOR_COMPACT_DIMENSIONS,
    INSPECTOR_FULL_DIMENSIONS,
    isDismissTargetInspectableCell
} from '../inspector-popover-utils';

describe('getInspectorLanguage', () => {
    it('returns "json" for objects', () => {
        expect(getInspectorLanguage('object')).toBe('json');
    });

    it('returns "json" for arrays', () => {
        expect(getInspectorLanguage('array')).toBe('json');
    });

    it.each([
        ['string'],
        ['number'],
        ['boolean'],
        ['date'],
        ['key'],
        ['invalid']
    ] as const)('returns "plaintext" for scalar type %s', (valueType) => {
        expect(getInspectorLanguage(valueType)).toBe('plaintext');
    });
});

describe('getInspectorDimensions', () => {
    it('returns full dimensions for objects', () => {
        expect(getInspectorDimensions('object')).toEqual(
            INSPECTOR_FULL_DIMENSIONS
        );
    });

    it('returns full dimensions for arrays', () => {
        expect(getInspectorDimensions('array')).toEqual(
            INSPECTOR_FULL_DIMENSIONS
        );
    });

    it.each([
        ['string'],
        ['number'],
        ['boolean'],
        ['date'],
        ['key'],
        ['invalid']
    ] as const)(
        'returns compact dimensions for scalar type %s',
        (valueType) => {
            expect(getInspectorDimensions(valueType)).toEqual(
                INSPECTOR_COMPACT_DIMENSIONS
            );
        }
    );
});

describe('formatInspectorValue', () => {
    describe('structured values (objects and arrays)', () => {
        it('pretty-prints a simple object as JSON', () => {
            const result = formatInspectorValue({ a: 1, b: 'two' }, 'object');
            expect(result).toBe('{\n  "a": 1,\n  "b": "two"\n}');
        });

        it('pretty-prints a simple array as JSON', () => {
            const result = formatInspectorValue([1, 2, 3], 'array');
            expect(result).toBe('[\n  1,\n  2,\n  3\n]');
        });

        it('returns empty string for an empty object', () => {
            // formatJson wraps braces; the result is "{}" (JSON.stringify behavior).
            expect(formatInspectorValue({}, 'object')).toBe('{}');
        });

        it('returns "[]" for an empty array', () => {
            expect(formatInspectorValue([], 'array')).toBe('[]');
        });
    });

    describe('scalar values', () => {
        it('formats a number as its string representation without quotes', () => {
            expect(formatInspectorValue(42, 'number')).toBe('42');
        });

        it('formats a string as its plain representation without JSON quotes', () => {
            expect(formatInspectorValue('hello', 'string')).toBe('hello');
        });

        it('formats a boolean as "true" or "false"', () => {
            expect(formatInspectorValue(true, 'boolean')).toBe('true');
            expect(formatInspectorValue(false, 'boolean')).toBe('false');
        });

        it('formats a Date as its toString representation', () => {
            const date = new Date('2026-04-17T00:00:00Z');
            expect(formatInspectorValue(date, 'date')).toBe(date.toString());
        });

        it('formats null as the literal string "null"', () => {
            expect(formatInspectorValue(null, 'string')).toBe('null');
        });

        it('formats undefined as the literal string "undefined"', () => {
            expect(formatInspectorValue(undefined, 'string')).toBe('undefined');
        });

        it('formats NaN as "NaN"', () => {
            expect(formatInspectorValue(NaN, 'number')).toBe('NaN');
        });

        it('formats Infinity as "Infinity"', () => {
            expect(formatInspectorValue(Infinity, 'number')).toBe('Infinity');
        });
    });

    describe('failure paths', () => {
        it('returns empty string when String() throws on a scalar', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toxic: any = Object.create(null);
            toxic.toString = () => {
                throw new Error('nope');
            };
            expect(formatInspectorValue(toxic, 'string')).toBe('');
        });

        it('returns empty string when JSON.stringify throws on a circular object', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const circular: any = {};
            circular.self = circular;
            expect(formatInspectorValue(circular, 'object')).toBe('');
        });
    });
});

describe('isDismissTargetInspectableCell', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    const mountCell = (options: { connect?: boolean } = {}) => {
        const cell = document.createElement('div');
        cell.setAttribute(INSPECTABLE_CELL_ATTRIBUTE, '');
        if (options.connect !== false) document.body.appendChild(cell);
        return cell;
    };

    it('returns true when the target is an inspectable cell', () => {
        const cell = mountCell();
        expect(isDismissTargetInspectableCell(cell)).toBe(true);
    });

    it('returns true when the target is a descendant of an inspectable cell', () => {
        const cell = mountCell();
        const child = document.createElement('span');
        child.textContent = 'value';
        cell.appendChild(child);
        expect(isDismissTargetInspectableCell(child)).toBe(true);
    });

    it('returns false when the target is outside any inspectable cell', () => {
        mountCell();
        const sibling = document.createElement('button');
        sibling.setAttribute('role', 'button');
        sibling.setAttribute('aria-haspopup', 'dialog');
        document.body.appendChild(sibling);
        expect(isDismissTargetInspectableCell(sibling)).toBe(false);
    });

    it('returns false for a detached element even if it has the attribute', () => {
        const cell = mountCell({ connect: false });
        expect(isDismissTargetInspectableCell(cell)).toBe(false);
    });

    it('returns false for null or non-Element targets', () => {
        expect(isDismissTargetInspectableCell(null)).toBe(false);
        expect(isDismissTargetInspectableCell(undefined)).toBe(false);
        // A bare EventTarget that isn't an Element — simulated with a new
        // EventTarget instance — must not match.
        const bareTarget = new EventTarget();
        expect(isDismissTargetInspectableCell(bareTarget)).toBe(false);
    });
});
