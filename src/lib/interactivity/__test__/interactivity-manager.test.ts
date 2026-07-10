import { afterEach, describe, expect, it, vi } from 'vitest';
import type powerbi from 'powerbi-visuals-api';

import { InteractivityManager } from '../interactivity-manager';
import { type SelectionIdQueueEntry } from '../types';

type SelectionId = powerbi.visuals.ISelectionId;

// A minimal fake selection ID whose `equals` is keyed off the parts enqueued on
// its builder, so identity comparisons in the manager behave deterministically.
const makeId = (key: string): SelectionId =>
    ({
        equals: (other: SelectionId) =>
            (other as unknown as { __key?: string })?.__key === key,
        __key: key
    }) as unknown as SelectionId;

const makeBuilder = () => {
    const parts: string[] = [];
    const builder = {
        withCategory: vi.fn((_column: unknown, index: number) => {
            parts.push(`c${index}`);
            return builder;
        }),
        withMeasure: vi.fn((queryName: string) => {
            parts.push(`m${queryName}`);
            return builder;
        }),
        createSelectionId: vi.fn(() => makeId(parts.join('|')))
    };
    return builder;
};

const makeSelectionManager = (opts: { selectRejects?: Error } = {}) => {
    let selection: SelectionId[] = [];
    const select = vi.fn(
        (ids: SelectionId | SelectionId[], _multiSelect?: boolean) => {
            if (opts.selectRejects) {
                return Promise.reject(opts.selectRejects);
            }
            selection = Array.isArray(ids) ? ids : [ids];
            return Promise.resolve(selection);
        }
    );
    const clear = vi.fn(() => {
        selection = [];
        return Promise.resolve();
    });
    const mgr = {
        select,
        clear,
        hasSelection: vi.fn(() => selection.length > 0),
        getSelectionIds: vi.fn(() => selection),
        showContextMenu: vi.fn(() => Promise.resolve())
    } as unknown as powerbi.extensibility.ISelectionManager;
    return { mgr, select, clear };
};

const makeTooltipService = () => {
    const show = vi.fn();
    const hide = vi.fn();
    const service = {
        show,
        hide
    } as unknown as powerbi.extensibility.ITooltipService;
    return { service, show, hide };
};

/**
 * Bind the (singleton) InteractivityManager to a fresh set of fakes and return
 * handles to their spies. Clears prior selector state first so the module-level
 * store never leaks between tests.
 */
const bindManager = (opts: { selectRejects?: Error } = {}) => {
    InteractivityManager.clearSelectors();
    const { mgr, select, clear } = makeSelectionManager(opts);
    const {
        service,
        show: tooltipShow,
        hide: tooltipHide
    } = makeTooltipService();
    const host = {
        createSelectionManager: () => mgr,
        createSelectionIdBuilder: () => makeBuilder(),
        tooltipService: service
    } as unknown as powerbi.extensibility.visual.IVisualHost;
    const limitExceededCallback = vi.fn();
    const selectorUpdateCallback = vi.fn();
    InteractivityManager.bind({
        host,
        limitExceededCallback,
        selectorUpdateCallback
    });
    return {
        select,
        clear,
        tooltipShow,
        tooltipHide,
        limitExceededCallback,
        selectorUpdateCallback
    };
};

const categoryQueueEntry = (): SelectionIdQueueEntry => ({
    type: 'category',
    column: {} as powerbi.DataViewCategoryColumn
});

afterEach(() => {
    vi.useRealTimers();
    InteractivityManager.clearSelectors();
});

describe('InteractivityManager.addRowSelector / crossFilter (backfill)', () => {
    it('stores a selector and cross-filters it by row number', async () => {
        const { select } = bindManager();
        const selector = InteractivityManager.addRowSelector({
            rowNumber: 0,
            entries: [categoryQueueEntry()]
        });
        expect(selector).not.toBeNull();

        await InteractivityManager.crossFilter({ rowNumbers: [0] });

        expect(select).toHaveBeenCalledTimes(1);
        const [ids] = select.mock.calls[0];
        expect(ids).toEqual([selector!.id]);
    });

    it('resolves a fractional row number to the floored selector key (_resolveRowNumber)', async () => {
        const { select } = bindManager();
        // Stored under floor(3.9) === 3.
        const selector = InteractivityManager.addRowSelector({
            rowNumber: 3.9,
            entries: [categoryQueueEntry()]
        });

        // Requested with 3.2, which floors to the same key.
        await InteractivityManager.crossFilter({ rowNumbers: [3.2] });

        const [ids] = select.mock.calls[0];
        expect(ids).toEqual([selector!.id]);
    });

    it('throws when the row selector queue has no entries', () => {
        bindManager();
        expect(() =>
            InteractivityManager.addRowSelector({ rowNumber: 0, entries: [] })
        ).toThrow(/non-empty/);
    });
});

describe('InteractivityManager.crossFilter error propagation (M3)', () => {
    it('re-throws and resets selector state when the host selection rejects', async () => {
        const err = new Error('host select failed');
        const { selectorUpdateCallback } = bindManager({ selectRejects: err });
        InteractivityManager.addRowSelector({
            rowNumber: 0,
            entries: [categoryQueueEntry()]
        });

        await expect(
            InteractivityManager.crossFilter({ rowNumbers: [0] })
        ).rejects.toThrow('host select failed');

        // Dependent state notified exactly once, with every selector reset to
        // neutral — so a failed host selection doesn't diverge silently.
        expect(selectorUpdateCallback).toHaveBeenCalledTimes(1);
        const resetMap = selectorUpdateCallback.mock.calls[0][0] as Map<
            number,
            string
        >;
        expect(resetMap.get(0)).toBe('neutral');
    });

    it('notifies the limit-exceeded callback without selecting when the limit is exceeded', async () => {
        const { select, limitExceededCallback } = bindManager();

        await InteractivityManager.crossFilter({
            rowNumbers: [0],
            exceedsLimit: true
        });

        expect(limitExceededCallback).toHaveBeenCalledWith(true);
        expect(select).not.toHaveBeenCalled();
    });
});

describe('InteractivityManager tooltip timer (M5)', () => {
    it('hideTooltip cancels a pending delayed show so the tooltip does not resurrect', () => {
        vi.useFakeTimers();
        const { tooltipShow, tooltipHide } = bindManager();

        InteractivityManager.showTooltip([], [0], [10, 10], 500);
        expect(tooltipShow).not.toHaveBeenCalled();

        InteractivityManager.hideTooltip();
        expect(tooltipHide).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        expect(tooltipShow).not.toHaveBeenCalled();
    });

    it('consecutive delayed shows do not stack timers', () => {
        vi.useFakeTimers();
        const { tooltipShow } = bindManager();

        InteractivityManager.showTooltip([], [0], [1, 1], 500);
        InteractivityManager.showTooltip([], [0], [2, 2], 500);

        vi.advanceTimersByTime(1000);
        expect(tooltipShow).toHaveBeenCalledTimes(1);
    });
});
