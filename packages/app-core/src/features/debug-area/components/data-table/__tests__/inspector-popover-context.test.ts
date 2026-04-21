import { describe, expect, it } from 'vitest';

import {
    INSPECTOR_POPOVER_CLOSED_STATE,
    isOpenForCellId,
    shouldRefreshInspector
} from '../inspector-popover-context';

describe('INSPECTOR_POPOVER_CLOSED_STATE', () => {
    it('represents a closed inspector with no target', () => {
        expect(INSPECTOR_POPOVER_CLOSED_STATE).toEqual({
            isOpen: false,
            anchorRef: null,
            rawValue: undefined,
            valueType: null,
            cellId: null
        });
    });
});

describe('isOpenForCellId', () => {
    it('returns true when the inspector is open and cellId matches', () => {
        const state = {
            isOpen: true,
            cellId: 'row-1:field-x'
        };
        expect(isOpenForCellId(state, 'row-1:field-x')).toBe(true);
    });

    it('returns false when the inspector is closed even if cellId matches', () => {
        expect(isOpenForCellId({ isOpen: false, cellId: 'c' }, 'c')).toBe(
            false
        );
    });

    it('returns false when the inspector is open but targeting a different cell', () => {
        expect(isOpenForCellId({ isOpen: true, cellId: 'a' }, 'b')).toBe(false);
    });

    it('returns false when cellId is null', () => {
        expect(isOpenForCellId({ isOpen: true, cellId: null }, 'any')).toBe(
            false
        );
    });
});

describe('shouldRefreshInspector', () => {
    const openState = {
        isOpen: true as const,
        cellId: 'row-1:value',
        rawValue: 42 as unknown,
        valueType: 'number' as const
    };

    it('returns true when the cell matches and values differ', () => {
        expect(
            shouldRefreshInspector(openState, 'row-1:value', 43, 'number')
        ).toBe(true);
    });

    it('returns false when the inspector is closed', () => {
        expect(
            shouldRefreshInspector(
                { ...openState, isOpen: false },
                'row-1:value',
                43,
                'number'
            )
        ).toBe(false);
    });

    it('returns false when the inspector targets a different cell', () => {
        expect(
            shouldRefreshInspector(openState, 'row-2:value', 43, 'number')
        ).toBe(false);
    });

    it('returns false when both rawValue and valueType are unchanged', () => {
        expect(
            shouldRefreshInspector(openState, 'row-1:value', 42, 'number')
        ).toBe(false);
    });

    it('returns true when only valueType changes', () => {
        expect(
            shouldRefreshInspector(openState, 'row-1:value', 42, 'string')
        ).toBe(true);
    });

    it('treats NaN as equal to NaN (no refresh for a NaN-valued tick)', () => {
        const nanState = { ...openState, rawValue: NaN };
        expect(
            shouldRefreshInspector(nanState, 'row-1:value', NaN, 'number')
        ).toBe(false);
    });

    it('distinguishes +0 from -0 (Object.is semantics, not ===)', () => {
        const zeroState = { ...openState, rawValue: +0 };
        expect(
            shouldRefreshInspector(zeroState, 'row-1:value', -0, 'number')
        ).toBe(true);
    });

    it('treats a fresh object reference with identical content as a refresh (caller memoises upstream)', () => {
        const objState = { ...openState, rawValue: { a: 1 } };
        expect(
            shouldRefreshInspector(objState, 'row-1:value', { a: 1 }, 'object')
        ).toBe(true);
    });
});
