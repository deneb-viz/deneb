import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    FluentProvider,
    Toaster,
    webLightTheme
} from '@fluentui/react-components';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

// The real visual store and app-core pull the Power BI formatting-model graph,
// which fails to resolve under CI's Node. The toast reads only the
// interactivity slice and `translate`, so those are all the mocks provide.
type TestState = {
    interactivity: {
        selectionLimitExceeded: boolean;
        selectionLimit: number | undefined;
        setSelectionLimitExceeded: (exceeded: boolean, limit?: number) => void;
    };
};
const useTestState = createWithEqualityFn<TestState>()(
    (set) => ({
        interactivity: {
            selectionLimitExceeded: false,
            selectionLimit: undefined,
            setSelectionLimitExceeded: (exceeded, limit) =>
                set((state) => ({
                    interactivity: {
                        ...state.interactivity,
                        selectionLimitExceeded: exceeded,
                        selectionLimit: limit
                    }
                }))
        }
    }),
    shallow
);
vi.mock('../../../state', () => ({
    useDenebVisualState: (
        selector: (state: TestState) => unknown,
        equalityFn?: (a: unknown, b: unknown) => boolean
    ) => useTestState(selector, equalityFn)
}));
vi.mock('@deneb-viz/app-core', () => ({
    useDenebState: (selector: (state: unknown) => unknown) =>
        selector({
            i18n: {
                translate: (key: string, tokens?: unknown[]) =>
                    tokens ? `${key}:${tokens.join(',')}` : key
            }
        })
}));
vi.mock('../../../lib/interactivity', () => ({
    InteractivityManager: { crossFilter: vi.fn() }
}));

import { NotificationCrossFilterExceeded } from '../components/notification-cross-filter-exceeded';

const TOASTER_ID = 'test-toaster';
const BODY_KEY = 'PowerBI_Toast_Body_Cross_Filter_Limit_Reached';

const refuseSelection = (limit: number) =>
    act(() =>
        useTestState
            .getState()
            .interactivity.setSelectionLimitExceeded(true, limit)
    );

const toastBodies = () =>
    Array.from(document.body.querySelectorAll('.fui-ToastBody')).map(
        (element) => element.textContent
    );

describe('NotificationCrossFilterExceeded', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(async () => {
        (
            globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
        ).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        await act(() =>
            root.render(
                <FluentProvider theme={webLightTheme}>
                    <Toaster toasterId={TOASTER_ID} />
                    <NotificationCrossFilterExceeded toasterId={TOASTER_ID} />
                </FluentProvider>
            )
        );
    });

    afterEach(async () => {
        await act(() => root.unmount());
        container.remove();
        useTestState.getState().interactivity.setSelectionLimitExceeded(false);
    });

    it('shows the limit of the refused action', async () => {
        await refuseSelection(250);

        expect(toastBodies()).toEqual([`${BODY_KEY}:250`]);
    });

    it('shows the newer limit when a second refused action applies a different one', async () => {
        await refuseSelection(250);
        await refuseSelection(100);

        expect(toastBodies()).toEqual([`${BODY_KEY}:100`]);
    });
});
