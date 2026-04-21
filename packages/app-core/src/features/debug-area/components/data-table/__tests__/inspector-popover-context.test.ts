import { describe, expect, it } from 'vitest';

import {
    INSPECTOR_POPOVER_CLOSED_STATE,
    isOpenForCellId
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
