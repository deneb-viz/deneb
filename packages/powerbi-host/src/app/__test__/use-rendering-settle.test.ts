import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type VisualAppProps } from '../kernel-config';
import { useRenderingSettle } from '../use-rendering-settle';

/** The visual store's current update, as the hook reads it. */
const store = vi.hoisted(() => ({ options: {} as object }));

vi.mock('../../state', () => ({
    useDenebVisualState: (
        selector: (state: { updates: { options: object } }) => unknown
    ) => selector({ updates: { options: store.options } })
}));

type HarnessProps = {
    surface: string;
    isRenderless: boolean;
    appProps: VisualAppProps;
};

const Harness = ({ surface, isRenderless, appProps }: HarnessProps) => {
    useRenderingSettle(surface, isRenderless, appProps);
    return null;
};

const createAppProps = (): VisualAppProps => ({
    host: {} as VisualAppProps['host'],
    onRenderingStarted: vi.fn(),
    onRenderingFinished: vi.fn(),
    onSettleClose: vi.fn(),
    onRenderingError: vi.fn()
});

describe('useRenderingSettle', () => {
    let root: Root;
    let mounted: boolean;

    const render = (props: HarnessProps) => {
        act(() => root.render(createElement(Harness, props)));
        mounted = true;
    };

    const unmount = () => {
        act(() => root.unmount());
        mounted = false;
    };

    beforeEach(() => {
        (
            globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
        ).IS_REACT_ACT_ENVIRONMENT = true;
        vi.useFakeTimers();
        store.options = {};
        root = createRoot(document.createElement('div'));
    });

    afterEach(() => {
        if (mounted) unmount();
        vi.useRealTimers();
    });

    it('closes a renderless surface synchronously, through the terminal close', () => {
        const appProps = createAppProps();
        render({ surface: 'landing', isRenderless: true, appProps });
        expect(appProps.onRenderingFinished).toHaveBeenCalledTimes(1);
        act(() => vi.advanceTimersByTime(1000));
        expect(appProps.onSettleClose).not.toHaveBeenCalled();
    });

    it('closes a rendering surface after 500ms, through the deferring settle close', () => {
        const appProps = createAppProps();
        render({ surface: 'viewer', isRenderless: false, appProps });
        act(() => vi.advanceTimersByTime(499));
        expect(appProps.onSettleClose).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(1));
        expect(appProps.onSettleClose).toHaveBeenCalledTimes(1);
        expect(appProps.onRenderingFinished).not.toHaveBeenCalled();
    });

    it('restarts the timer for each new update, so one settle close fires however many arrive', () => {
        const appProps = createAppProps();
        render({ surface: 'viewer', isRenderless: false, appProps });
        act(() => vi.advanceTimersByTime(300));
        store.options = {};
        render({ surface: 'viewer', isRenderless: false, appProps });
        act(() => vi.advanceTimersByTime(300));
        expect(appProps.onSettleClose).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(200));
        expect(appProps.onSettleClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the timer across renders that bring no new update', () => {
        const appProps = createAppProps();
        render({ surface: 'viewer', isRenderless: false, appProps });
        act(() => vi.advanceTimersByTime(300));
        render({ surface: 'viewer', isRenderless: false, appProps });
        act(() => vi.advanceTimersByTime(200));
        expect(appProps.onSettleClose).toHaveBeenCalledTimes(1);
    });

    it('clears a pending timer when the app unmounts', () => {
        const appProps = createAppProps();
        render({ surface: 'viewer', isRenderless: false, appProps });
        unmount();
        act(() => vi.advanceTimersByTime(1000));
        expect(appProps.onSettleClose).not.toHaveBeenCalled();
    });
});
