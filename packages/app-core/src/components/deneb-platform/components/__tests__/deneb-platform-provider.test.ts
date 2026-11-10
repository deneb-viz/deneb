// @vitest-environment jsdom
import { act, createElement, useContext, type ContextType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type DenebPlatformProviderProps } from '../../types';
import {
    DenebPlatformProvider,
    DenebPlatformProviderContext
} from '../deneb-platform-provider';

type ContextValue = ContextType<typeof DenebPlatformProviderContext>;

describe('DenebPlatformProvider', () => {
    let root: Root;
    let values: ContextValue[];

    const Probe = () => {
        values.push(useContext(DenebPlatformProviderContext));
        return null;
    };

    const render = (props: DenebPlatformProviderProps) => {
        act(() =>
            root.render(
                createElement(
                    DenebPlatformProvider,
                    props,
                    createElement(Probe)
                )
            )
        );
    };

    const latest = () => values[values.length - 1];

    beforeEach(() => {
        (
            globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
        ).IS_REACT_ACT_ENVIRONMENT = true;
        values = [];
        root = createRoot(document.createElement('div'));
    });

    afterEach(() => {
        act(() => root.unmount());
    });

    it('keeps the context value across renders that change no prop, including omitted array props', () => {
        render({});
        render({});
        expect(values).toHaveLength(2);
        expect(values[1]).toBe(values[0]);
    });

    it('passes a changed download permission to consumers', () => {
        render({ isDownloadPermitted: false });
        render({ isDownloadPermitted: true });
        expect(latest()?.isDownloadPermitted).toBe(true);
    });

    it('passes a changed download handler to consumers', () => {
        const first = async () => {};
        const second = async () => {};
        render({ downloadJsonFile: first });
        render({ downloadJsonFile: second });
        expect(latest()?.downloadJsonFile).toBe(second);
    });
});
