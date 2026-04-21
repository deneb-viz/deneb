import { describe, expect, it } from 'vitest';

import {
    buildCellId,
    parseCellId,
    pickDefaultActiveCell,
    resolveArrowTarget,
    resolveCellKeyAction,
    resolveRowEndpoint
} from '../data-table-keyboard-utils';

describe('buildCellId / parseCellId', () => {
    it('round-trips a simple rowIndex and fieldName', () => {
        const id = buildCellId(3, 'Sales');
        expect(id).toBe('3:Sales');
        expect(parseCellId(id)).toEqual({ rowIndex: 3, fieldName: 'Sales' });
    });

    it('round-trips a field name containing colons', () => {
        const id = buildCellId(7, 'namespace:Sales');
        expect(id).toBe('7:namespace:Sales');
        expect(parseCellId(id)).toEqual({
            rowIndex: 7,
            fieldName: 'namespace:Sales'
        });
    });

    it('returns null for a malformed cell id without a colon', () => {
        expect(parseCellId('nope')).toBeNull();
    });

    it('returns null for a malformed cell id with a non-integer prefix', () => {
        expect(parseCellId('x:Sales')).toBeNull();
        expect(parseCellId('1.5:Sales')).toBeNull();
    });

    it('returns null for a negative row index', () => {
        expect(parseCellId('-1:Sales')).toBeNull();
    });
});

describe('resolveArrowTarget', () => {
    const colOrder = ['country', 'region', 'sales'];
    const allCells = new Set(
        [0, 1, 2].flatMap((r) => colOrder.map((f) => buildCellId(r, f)))
    );

    describe('left / right', () => {
        it('moves right to the next column in the same row', () => {
            const target = resolveArrowTarget(
                { rowIndex: 1, fieldName: 'country' },
                'right',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('1:region');
        });

        it('moves left to the previous column in the same row', () => {
            const target = resolveArrowTarget(
                { rowIndex: 1, fieldName: 'sales' },
                'left',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('1:region');
        });

        it('clamps on the last column when moving right', () => {
            const target = resolveArrowTarget(
                { rowIndex: 1, fieldName: 'sales' },
                'right',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('1:sales');
        });

        it('clamps on the first column when moving left', () => {
            const target = resolveArrowTarget(
                { rowIndex: 1, fieldName: 'country' },
                'left',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('1:country');
        });

        it('skips over unregistered cells when moving right', () => {
            // region column in row 1 is not inspectable
            const sparse = new Set(allCells);
            sparse.delete('1:region');
            const target = resolveArrowTarget(
                { rowIndex: 1, fieldName: 'country' },
                'right',
                colOrder,
                3,
                sparse
            );
            expect(target).toBe('1:sales');
        });
    });

    describe('up / down', () => {
        it('moves down to the next row in the same column', () => {
            const target = resolveArrowTarget(
                { rowIndex: 0, fieldName: 'region' },
                'down',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('1:region');
        });

        it('moves up to the previous row in the same column', () => {
            const target = resolveArrowTarget(
                { rowIndex: 2, fieldName: 'region' },
                'up',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('1:region');
        });

        it('clamps on the last row when moving down', () => {
            const target = resolveArrowTarget(
                { rowIndex: 2, fieldName: 'region' },
                'down',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('2:region');
        });

        it('clamps on row 0 when moving up', () => {
            const target = resolveArrowTarget(
                { rowIndex: 0, fieldName: 'region' },
                'up',
                colOrder,
                3,
                allCells
            );
            expect(target).toBe('0:region');
        });

        it('skips over unregistered cells when moving down', () => {
            const sparse = new Set(allCells);
            sparse.delete('1:region');
            const target = resolveArrowTarget(
                { rowIndex: 0, fieldName: 'region' },
                'down',
                colOrder,
                3,
                sparse
            );
            expect(target).toBe('2:region');
        });
    });

    it('clamps when the current field is not in colOrder', () => {
        const target = resolveArrowTarget(
            { rowIndex: 0, fieldName: 'missing' },
            'right',
            colOrder,
            3,
            allCells
        );
        expect(target).toBe('0:missing');
    });
});

describe('resolveRowEndpoint', () => {
    const colOrder = ['country', 'region', 'sales'];
    const allCells = new Set(
        [0, 1].flatMap((r) => colOrder.map((f) => buildCellId(r, f)))
    );

    it('home jumps to the first column in the current row', () => {
        const target = resolveRowEndpoint(
            { rowIndex: 1, fieldName: 'sales' },
            'home',
            colOrder,
            allCells
        );
        expect(target).toBe('1:country');
    });

    it('end jumps to the last column in the current row', () => {
        const target = resolveRowEndpoint(
            { rowIndex: 0, fieldName: 'country' },
            'end',
            colOrder,
            allCells
        );
        expect(target).toBe('0:sales');
    });

    it('home skips unregistered leading cells', () => {
        const sparse = new Set(allCells);
        sparse.delete('1:country');
        const target = resolveRowEndpoint(
            { rowIndex: 1, fieldName: 'sales' },
            'home',
            colOrder,
            sparse
        );
        expect(target).toBe('1:region');
    });

    it('end skips unregistered trailing cells', () => {
        const sparse = new Set(allCells);
        sparse.delete('0:sales');
        const target = resolveRowEndpoint(
            { rowIndex: 0, fieldName: 'country' },
            'end',
            colOrder,
            sparse
        );
        expect(target).toBe('0:region');
    });

    it('stays on current cell when no other inspectable cell exists in the row', () => {
        const onlyOne = new Set(['1:region']);
        const target = resolveRowEndpoint(
            { rowIndex: 1, fieldName: 'region' },
            'home',
            colOrder,
            onlyOne
        );
        expect(target).toBe('1:region');
    });
});

describe('pickDefaultActiveCell', () => {
    const colOrder = ['country', 'region', 'sales'];

    it('returns the first column of row 0 when all cells are registered', () => {
        const cells = new Set(
            [0, 1].flatMap((r) => colOrder.map((f) => buildCellId(r, f)))
        );
        expect(pickDefaultActiveCell(colOrder, cells)).toBe('0:country');
    });

    it('falls back to the first registered cell in row 0 when earlier columns are absent', () => {
        const cells = new Set(['0:region', '0:sales', '1:country']);
        expect(pickDefaultActiveCell(colOrder, cells)).toBe('0:region');
    });

    it('falls back to any registered cell when row 0 has none', () => {
        const cells = new Set(['2:region']);
        expect(pickDefaultActiveCell(colOrder, cells)).toBe('2:region');
    });

    it('picks the lowest-row, earliest-column cell regardless of insertion order', () => {
        // Insertion order here is deliberately reversed so Set iteration
        // would yield '3:sales' first. Result must still be '1:country'.
        const cells = new Set([
            '3:sales',
            '3:region',
            '2:sales',
            '1:sales',
            '1:region',
            '1:country'
        ]);
        expect(pickDefaultActiveCell(colOrder, cells)).toBe('1:country');
    });

    it('ignores registered cells whose field is not in colOrder', () => {
        const cells = new Set(['2:ghost', '3:region']);
        expect(pickDefaultActiveCell(colOrder, cells)).toBe('3:region');
    });

    it('returns null when no cells are registered', () => {
        expect(pickDefaultActiveCell(colOrder, new Set())).toBeNull();
    });
});

describe('resolveCellKeyAction', () => {
    it('maps Enter to open', () => {
        expect(resolveCellKeyAction('Enter')).toEqual({ kind: 'open' });
    });

    it('maps Space to open', () => {
        expect(resolveCellKeyAction(' ')).toEqual({ kind: 'open' });
    });

    it.each([
        ['ArrowLeft', 'left'],
        ['ArrowRight', 'right'],
        ['ArrowUp', 'up'],
        ['ArrowDown', 'down']
    ] as const)('maps %s to move %s', (key, direction) => {
        expect(resolveCellKeyAction(key)).toEqual({
            kind: 'move',
            direction
        });
    });

    it.each([
        ['Home', 'home'],
        ['End', 'end']
    ] as const)('maps %s to rowEndpoint %s', (key, endpoint) => {
        expect(resolveCellKeyAction(key)).toEqual({
            kind: 'rowEndpoint',
            endpoint
        });
    });

    it('returns null for any key the cell does not claim', () => {
        expect(resolveCellKeyAction('Tab')).toBeNull();
        expect(resolveCellKeyAction('Escape')).toBeNull();
        expect(resolveCellKeyAction('a')).toBeNull();
        expect(resolveCellKeyAction('PageDown')).toBeNull();
    });
});
