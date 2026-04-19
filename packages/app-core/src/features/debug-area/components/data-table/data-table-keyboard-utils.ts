/**
 * Utility types and pure functions for the data table's roving tabindex
 * keyboard navigation. Extracted from the provider so transitions can be unit
 * tested without mounting React.
 */

export type CellId = string;

export interface CellCoord {
    rowIndex: number;
    fieldName: string;
}

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';
export type RowEndpoint = 'home' | 'end';

/**
 * Encode a `(rowIndex, fieldName)` pair as a stable cell identifier. The
 * separator `:` is chosen to match the plan's convention; field names in this
 * project never contain literal `:` in a way that would collide with a row
 * index prefix.
 */
export const buildCellId = (rowIndex: number, fieldName: string): CellId =>
    `${rowIndex}:${fieldName}`;

/**
 * Decode a cell ID back into `(rowIndex, fieldName)`. Returns `null` if the
 * input is malformed so callers can defensively skip unknown IDs rather than
 * crashing.
 */
export const parseCellId = (cellId: CellId): CellCoord | null => {
    const separatorIdx = cellId.indexOf(':');
    if (separatorIdx <= 0) return null;
    const rowIndex = Number(cellId.slice(0, separatorIdx));
    if (!Number.isInteger(rowIndex) || rowIndex < 0) return null;
    return {
        rowIndex,
        fieldName: cellId.slice(separatorIdx + 1)
    };
};

/**
 * Given a column order and the current cell, return the target cell ID for an
 * arrow move, stepping over any cells that are not registered (e.g., the
 * signal viewer's non-inspectable key column). Returns the current cell ID if
 * the move would clamp past the grid boundary.
 *
 * `rowCount` is the total number of rows currently rendered on the visible
 * page; `registeredCellIds` is the set of cells currently available as a
 * focus target.
 */
export const resolveArrowTarget = (
    current: CellCoord,
    direction: ArrowDirection,
    colOrder: string[],
    rowCount: number,
    registeredCellIds: ReadonlySet<CellId>
): CellId => {
    const currentId = buildCellId(current.rowIndex, current.fieldName);
    const currentColIdx = colOrder.indexOf(current.fieldName);
    if (currentColIdx === -1) return currentId;

    const tryCandidate = (row: number, col: number): CellId | null => {
        if (row < 0 || row >= rowCount) return null;
        if (col < 0 || col >= colOrder.length) return null;
        const candidate = buildCellId(row, colOrder[col]);
        return registeredCellIds.has(candidate) ? candidate : null;
    };

    switch (direction) {
        case 'left': {
            for (let c = currentColIdx - 1; c >= 0; c--) {
                const hit = tryCandidate(current.rowIndex, c);
                if (hit) return hit;
            }
            return currentId;
        }
        case 'right': {
            for (let c = currentColIdx + 1; c < colOrder.length; c++) {
                const hit = tryCandidate(current.rowIndex, c);
                if (hit) return hit;
            }
            return currentId;
        }
        case 'up': {
            for (let r = current.rowIndex - 1; r >= 0; r--) {
                const hit = tryCandidate(r, currentColIdx);
                if (hit) return hit;
            }
            return currentId;
        }
        case 'down': {
            for (let r = current.rowIndex + 1; r < rowCount; r++) {
                const hit = tryCandidate(r, currentColIdx);
                if (hit) return hit;
            }
            return currentId;
        }
    }
};

/**
 * Given a column order and the current cell, return the target cell ID for a
 * Home/End jump to the first/last registered inspectable cell in the current
 * row. Returns the current cell ID when there is no other registered cell in
 * the row.
 */
export const resolveRowEndpoint = (
    current: CellCoord,
    endpoint: RowEndpoint,
    colOrder: string[],
    registeredCellIds: ReadonlySet<CellId>
): CellId => {
    const currentId = buildCellId(current.rowIndex, current.fieldName);
    const range = endpoint === 'home' ? colOrder : [...colOrder].reverse();
    for (const fieldName of range) {
        const candidate = buildCellId(current.rowIndex, fieldName);
        if (registeredCellIds.has(candidate)) return candidate;
    }
    return currentId;
};

/**
 * Pick a sensible default active cell when one is needed — either because no
 * cell is yet active, or because the previously-active cell unregistered
 * (pagination change). Returns the first registered cell in row 0 column
 * order, falling back to the first registered cell in any row if row 0 has
 * no inspectable cells, or `null` if nothing is registered.
 */
export const pickDefaultActiveCell = (
    colOrder: string[],
    registeredCellIds: ReadonlySet<CellId>
): CellId | null => {
    for (const fieldName of colOrder) {
        const candidate = buildCellId(0, fieldName);
        if (registeredCellIds.has(candidate)) return candidate;
    }
    // Row 0 is empty; fall back to the lowest-row lowest-column registered
    // cell. Use the first item from the iterator since Sets preserve
    // insertion order and cells register bottom-up during render.
    const first = registeredCellIds.values().next().value;
    return first ?? null;
};
