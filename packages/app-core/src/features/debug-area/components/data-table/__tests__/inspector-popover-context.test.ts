import { createRef, type RefObject } from 'react';
import { describe, expect, it } from 'vitest';

import {
    buildOpenState,
    INSPECTOR_POPOVER_CLOSED_STATE,
    isOpenForCellId
} from '../inspector-popover-context';

const makeRef = (): RefObject<HTMLElement> => createRef<HTMLElement>();

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

describe('buildOpenState', () => {
    it('marks the inspector as open and captures the target', () => {
        const ref = makeRef();
        const state = buildOpenState(ref, { a: 1 }, 'object', 'row-0:field-a');
        expect(state).toEqual({
            isOpen: true,
            anchorRef: ref,
            rawValue: { a: 1 },
            valueType: 'object',
            cellId: 'row-0:field-a'
        });
    });

    it('preserves primitive rawValue types faithfully', () => {
        expect(buildOpenState(makeRef(), 42, 'number', 'c').rawValue).toBe(42);
        expect(buildOpenState(makeRef(), false, 'boolean', 'c').rawValue).toBe(
            false
        );
        expect(buildOpenState(makeRef(), null, 'string', 'c').rawValue).toBe(
            null
        );
    });

    it('replaces the anchor ref when called again for a new cell', () => {
        const first = buildOpenState(makeRef(), 1, 'number', 'a');
        const second = buildOpenState(makeRef(), 2, 'number', 'b');
        expect(first.cellId).toBe('a');
        expect(second.cellId).toBe('b');
        expect(first.anchorRef).not.toBe(second.anchorRef);
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
