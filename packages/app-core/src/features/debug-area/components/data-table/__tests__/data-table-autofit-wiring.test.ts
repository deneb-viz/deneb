import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural canary for the per-viewer `autoFitColumns` contract
 * (docs/solutions/ui-bugs/fluent-datagrid-fill-column-autofit-container-width-offset-2026-08-19.md).
 *
 * Behavioural coverage of Fluent's autofit under wide/narrow containers is
 * not achievable in this workspace: vitest runs in the `node` environment
 * with no DOM/ResizeObserver and no `@testing-library/react`, and
 * `@fluentui/react-table`'s exports map hides the
 * `adjustColumnWidthsToFitContainer` reducer from a contract test. This
 * locks the wiring instead, so the two regressions it guards (value column
 * clipped at its ideal width; phantom horizontal scrollbar from unoffset
 * row padding) cannot silently return through a refactor.
 */
const read = (...segments: string[]) =>
    readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('DataTableViewer autoFitColumns wiring', () => {
    const dataTableSource = read('data-table.tsx');
    const typesSource = read('data-table-viewer-types.ts');

    it('exposes autoFitColumns as an opt-in prop that defaults to false', () => {
        expect(typesSource).toMatch(/autoFitColumns\?: boolean;/);
        expect(dataTableSource).toMatch(/autoFitColumns = false/);
    });

    it('threads the prop into Fluent instead of hard-coding autofit off', () => {
        expect(dataTableSource).toMatch(
            /resizableColumnsOptions=\{\{ autoFitColumns \}\}/
        );
        expect(dataTableSource).not.toMatch(/autoFitColumns: false/);
    });

    it('offsets our row padding so an autofitted row does not overflow', () => {
        // Fluent sizes autofitted columns to the measured grid width; our
        // rows carry DATA_TABLE_ROW_PADDING_LEFT, so the fitted row would
        // overflow by exactly that much without this offset.
        expect(dataTableSource).toMatch(
            /containerWidthOffset=\{\s*-DATA_TABLE_ROW_PADDING_LEFT\s*\}/
        );
    });
});

describe('viewer opt-in', () => {
    it('signal viewer opts in (value column fills remaining width)', () => {
        const source = read('..', 'signal-viewer', 'signal-viewer.tsx');
        expect(source).toMatch(
            /<DataTableViewer[\s\S]*?autoFitColumns[\s\S]*?\/>/
        );
    });

    it.each(['data-tab.tsx', 'source-tab.tsx'])(
        'dataset viewer %s does NOT opt in (worker-measured widths overflow horizontally)',
        (file) => {
            const source = read('..', 'dataset-viewer', file);
            expect(source).not.toMatch(/autoFitColumns/);
        }
    );
});
